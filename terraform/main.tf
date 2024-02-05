data "azurerm_client_config" "current" {}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "product_service_rg" {
  location = "northeurope"
  name     = "rg-product-service-sand-ne-123"
}

resource "azurerm_storage_account" "products_service_fa" {
  name     = "stgsangproductsfane123"
  location = "northeurope"

  account_replication_type = "LRS"
  account_tier             = "Standard"
  account_kind             = "StorageV2"

  resource_group_name = azurerm_resource_group.product_service_rg.name
}

resource "azurerm_storage_share" "products_service_fa" {
  name  = "fa-products-service-share"
  quota = 2

  storage_account_name = azurerm_storage_account.products_service_fa.name
}

resource "azurerm_service_plan" "product_service_plan" {
  name     = "asp-product-service-sand-ne-123"
  location = "northeurope"

  os_type  = "Windows"
  sku_name = "Y1"

  resource_group_name = azurerm_resource_group.product_service_rg.name
}

resource "azurerm_application_insights" "products_service_fa" {
  name             = "appins-fa-products-service-sand-ne-123"
  application_type = "web"
  location         = "northeurope"


  resource_group_name = azurerm_resource_group.product_service_rg.name
}


resource "azurerm_windows_function_app" "products_service" {
  name     = "fa-products-service-ne-123"
  location = "northeurope"

  service_plan_id     = azurerm_service_plan.product_service_plan.id
  resource_group_name = azurerm_resource_group.product_service_rg.name

  storage_account_name       = azurerm_storage_account.products_service_fa.name
  storage_account_access_key = azurerm_storage_account.products_service_fa.primary_access_key

  functions_extension_version = "~4"
  builtin_logging_enabled     = false

  site_config {
    always_on = false

    application_insights_key               = azurerm_application_insights.products_service_fa.instrumentation_key
    application_insights_connection_string = azurerm_application_insights.products_service_fa.connection_string

    # For production systems set this to false
    use_32_bit_worker = false

    # Enable function invocations from Azure Portal.
    cors {
      allowed_origins = ["https://portal.azure.com"]
    }

    application_stack {
      node_version = "~16"
    }
  }

  app_settings = {
    WEBSITE_CONTENTAZUREFILECONNECTIONSTRING = azurerm_storage_account.products_service_fa.primary_connection_string
    WEBSITE_CONTENTSHARE                     = azurerm_storage_share.products_service_fa.name
  }

  # The app settings changes cause downtime on the Function App. e.g. with Azure Function App Slots
  # Therefore it is better to ignore those changes and manage app settings separately off the Terraform.
  lifecycle {
    ignore_changes = [
      app_settings,
      tags["hidden-link: /app-insights-instrumentation-key"],
      tags["hidden-link: /app-insights-resource-id"],
      tags["hidden-link: /app-insights-conn-string"]
    ]
  }
}

resource "azurerm_resource_group" "apim" {
  location = "northeurope"
  name     = "rg-api-management-sand-ne-123"
}

resource "azurerm_api_management" "core_apim" {
  location        = "northeurope"
  name            = "apim-sand-ne-123"
  publisher_email = "Stanislav_Solodukhin@epam.com"
  publisher_name  = "Stanislav Solodukhin"

  resource_group_name = azurerm_resource_group.apim.name
  sku_name            = "Consumption_0"
}

resource "azurerm_api_management_api" "products_api" {
  api_management_name = azurerm_api_management.core_apim.name
  name                = "products-service-api"
  resource_group_name = azurerm_resource_group.apim.name
  revision            = "1"

  display_name = "Products Service API"

  protocols = ["https"]
}

data "azurerm_function_app_host_keys" "products_keys" {
  name                = azurerm_windows_function_app.products_service.name
  resource_group_name = azurerm_resource_group.product_service_rg.name
}

resource "azurerm_api_management_backend" "products_fa" {
  name                = "products-service-backend"
  resource_group_name = azurerm_resource_group.apim.name
  api_management_name = azurerm_api_management.core_apim.name
  protocol            = "http"
  url                 = "https://${azurerm_windows_function_app.products_service.name}.azurewebsites.net/api"
  description         = "Products API"

  credentials {
    certificate = []
    query       = {}

    header = {
      "x-functions-key" = data.azurerm_function_app_host_keys.products_keys.default_function_key
    }
  }
}

resource "azurerm_api_management_api_policy" "api_policy" {
  api_management_name = azurerm_api_management.core_apim.name
  api_name            = azurerm_api_management_api.products_api.name
  resource_group_name = azurerm_resource_group.apim.name

  xml_content = <<XML
 <policies>
    <inbound>
        <set-backend-service backend-id="${azurerm_api_management_backend.products_fa.name}"/>
        <base/>
        <cors allow-credentials="false">
            <allowed-origins>
                <origin>*</origin>
            </allowed-origins>
            <allowed-methods>
                <method>GET</method>
                <method>POST</method>
            </allowed-methods>
            <allowed-headers>
                <header>*</header>
            </allowed-headers>
            <expose-headers>
                <header>*</header>
            </expose-headers>
        </cors>
        <cache-lookup vary-by-developer="false" vary-by-developer-groups="false" downstream-caching-type="private" must-revalidate="true" caching-type="internal" allow-private-response-caching="true">
            <vary-by-header>Accept</vary-by-header>
            <vary-by-header>Accept-Charset</vary-by-header>
        </cache-lookup>
    </inbound>
    <backend>
        <base/>
    </backend>
    <outbound>
        <cache-store duration="20" />
        <base/>
    </outbound>
    <on-error>
        <base/>
    </on-error>
 </policies>
XML
}

resource "azurerm_api_management_api_operation" "get_products_list" {
  api_management_name = azurerm_api_management.core_apim.name
  api_name            = azurerm_api_management_api.products_api.name
  display_name        = "Get Products List"
  method              = "GET"
  operation_id        = "get-products-list"
  resource_group_name = azurerm_resource_group.apim.name
  url_template        = "/products"
}


resource "azurerm_api_management_api_operation" "get_product_by_id" {
  api_management_name = azurerm_api_management.core_apim.name
  api_name            = azurerm_api_management_api.products_api.name
  display_name        = "Get Product By Id"
  method              = "GET"
  operation_id        = "get-product-by-id"
  resource_group_name = azurerm_resource_group.apim.name
  url_template        = "/products/{id}"
  template_parameter {
    name     = "id"
    type     = "string"
    required = true
  }
}

resource "azurerm_api_management_api_operation" "post_product" {
  api_management_name = azurerm_api_management.core_apim.name
  api_name            = azurerm_api_management_api.products_api.name
  display_name        = "Post Product"
  method              = "POST"
  operation_id        = "post-product"
  resource_group_name = azurerm_resource_group.apim.name
  url_template        = "/products"
}

resource "azurerm_api_management_api_operation" "health" {
  api_management_name = azurerm_api_management.core_apim.name
  api_name            = azurerm_api_management_api.products_api.name
  display_name        = "Health"
  method              = "GET"
  operation_id        = "health"
  resource_group_name = azurerm_resource_group.apim.name
  url_template        = "/health"
}

resource "azurerm_app_configuration" "products_config" {
  location            = "northeurope"
  name                = "appconfig-products-service-sand-ne-123"
  resource_group_name = azurerm_resource_group.product_service_rg.name

  sku = "free"
}

resource "azurerm_cosmosdb_account" "cosmosdb_account" {
  name                = "cosmosdb-account-sand-ne-123"
  location            = "northeurope"
  resource_group_name = azurerm_resource_group.product_service_rg.name
  offer_type          = "Standard"

  consistency_policy {
  consistency_level       = "BoundedStaleness"
  max_interval_in_seconds = 300
  max_staleness_prefix    = 100000
  }

  geo_location {
    location          = "northeurope"
    failover_priority = 0
  }
}

resource "azurerm_cosmosdb_sql_database" "cosmos_database" {
  name                = "cosmosdb-database-sand-ne-123"
  resource_group_name = azurerm_resource_group.product_service_rg.name
  account_name        = azurerm_cosmosdb_account.cosmosdb_account.name
}

resource "azurerm_cosmosdb_sql_container" "product" {
  name                = "Product"
  resource_group_name = azurerm_resource_group.product_service_rg.name
  account_name        = azurerm_cosmosdb_account.cosmosdb_account.name
  database_name       = azurerm_cosmosdb_sql_database.cosmos_database.name
  partition_key_path    = "/id"

  indexing_policy {
    indexing_mode = "consistent"
  }
}

resource "azurerm_cosmosdb_sql_container" "stock" {
  name                = "Stock"
  resource_group_name = azurerm_resource_group.product_service_rg.name
  account_name        = azurerm_cosmosdb_account.cosmosdb_account.name
  database_name       = azurerm_cosmosdb_sql_database.cosmos_database.name
  partition_key_path    = "/id"

  indexing_policy {
    indexing_mode = "consistent"
  }
}

resource "azurerm_cosmosdb_sql_role_definition" "read_write_role" {
  name                = "PasswordlessReadWrite"
  resource_group_name = azurerm_resource_group.product_service_rg.name
  account_name        = azurerm_cosmosdb_account.cosmosdb_account.name
  type                = "CustomRole"
  assignable_scopes   = [azurerm_cosmosdb_account.cosmosdb_account.id]

  permissions {
    data_actions = ["Microsoft.DocumentDB/databaseAccounts/readMetadata",
            "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/items/*",
            "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/*"]
  }
}

resource "azurerm_cosmosdb_sql_role_assignment" "read_write_role_assignment" {
  name                = "736180af-7fbc-4c7f-9004-22735173c1c3"
  resource_group_name = azurerm_resource_group.product_service_rg.name
  account_name        = azurerm_cosmosdb_account.cosmosdb_account.name
  role_definition_id  = azurerm_cosmosdb_sql_role_definition.read_write_role.id
  principal_id        = "f321e0f2-ee2f-4919-8b65-7ab3f41c1fa7"
  scope               = azurerm_cosmosdb_account.cosmosdb_account.id
}

resource "azurerm_resource_group" "import_service_rg" {
  location = "northeurope"
  name     = "rg-product-service"
}

resource "azurerm_storage_account" "sa" {
  name                             = "stgsangproductsfane123"
  resource_group_name              = azurerm_resource_group.import_service_rg.name
  location                         = azurerm_resource_group.import_service_rg.location
  account_tier                     = "Standard"
  account_replication_type         = "LRS"
  access_tier                      = "Cool"
  enable_https_traffic_only        = true
  allow_nested_items_to_be_public  = true
  shared_access_key_enabled        = true
}

resource "azurerm_storage_container" "sa_container" {
  name                  = "upload-container"
  storage_account_name  = azurerm_storage_account.sa.name
  container_access_type = "private"
}

resource "azurerm_storage_blob" "sa_blob" {
  name                   = "import-content.zip"
  storage_account_name   = azurerm_storage_account.sa.name
  storage_container_name = azurerm_storage_container.sa_container.name
  type                   = "Block"
}

resource "azurerm_storage_share" "import_service_fa" {
  name  = "fa-import-service-share"
  quota = 2

  storage_account_name = azurerm_storage_account.sa.name
}

resource "azurerm_service_plan" "import_service_plan" {
  name     = "asp-import-service-sand-ne-001"
  location = "northeurope"

  os_type  = "Windows"
  sku_name = "Y1"

  resource_group_name = azurerm_resource_group.import_service_rg.name
}

resource "azurerm_application_insights" "import_service_fa" {
  name             = "appins-fa-import-service-sand-ne-001"
  application_type = "web"
  location         = "northeurope"


  resource_group_name = azurerm_resource_group.import_service_rg.name
}

resource "azurerm_windows_function_app" "import_service" {
  name     = "fa-import-service-ne-123"
  location = "northeurope"

  service_plan_id     = azurerm_service_plan.import_service_plan.id
  resource_group_name = azurerm_resource_group.import_service_rg.name

  storage_account_name       = azurerm_storage_account.sa.name
  storage_account_access_key = azurerm_storage_account.sa.primary_access_key

  functions_extension_version = "~4"
  builtin_logging_enabled     = false

  site_config {
    always_on = false

    application_insights_key               = azurerm_application_insights.import_service_fa.instrumentation_key
    application_insights_connection_string = azurerm_application_insights.import_service_fa.connection_string

    # For production systems set this to false
    use_32_bit_worker = true

    # Enable function invocations from Azure Portal.
    cors {
      allowed_origins = ["https://portal.azure.com", "*"]
    }

    application_stack {
      node_version = "~16"
    }
  }

  app_settings = {
    WEBSITE_CONTENTAZUREFILECONNECTIONSTRING = azurerm_storage_account.sa.primary_connection_string
    WEBSITE_CONTENTSHARE                     = azurerm_storage_share.import_service_fa.name
  }

  # The app settings changes cause downtime on the Function App. e.g. with Azure Function App Slots
  # Therefore it is better to ignore those changes and manage app settings separately off the Terraform.
  lifecycle {
    ignore_changes = [
      app_settings,
      tags["hidden-link: /app-insights-instrumentation-key"],
      tags["hidden-link: /app-insights-resource-id"],
      tags["hidden-link: /app-insights-conn-string"]
    ]
  }
}

/* Docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/servicebus_namespace.html */
resource "azurerm_servicebus_namespace" "sb" {
  name                          = "solodukhin"
  location                      = azurerm_resource_group.rg.location
  resource_group_name           = azurerm_resource_group.rg.name
  sku                           = "Basic"
  capacity                      = 0 /* standard for sku plan */
  public_network_access_enabled = true /* can be changed to false for premium */
  minimum_tls_version           = "1.2"
  zone_redundant                = false /* can be changed to true for premium */
}

/* Docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/servicebus_queue */
resource "azurerm_servicebus_queue" "example" {
  name                                    = "solodukhin_queue"
  namespace_id                            = azurerm_servicebus_namespace.sb.id
  status                                  = "Active" /* Default value */
  enable_partitioning                     = true /* Default value */
  lock_duration                           = "PT1M" /* ISO 8601 timespan duration, 5 min is max */
  max_message_size_in_kilobytes           = 256 /* default for Basic tier */
  max_size_in_megabytes                   = 1024 /* Default value */
  max_delivery_count                      = 10 /* Default value */
  requires_duplicate_detection            = false
  duplicate_detection_history_time_window = "PT10M" /* ISO 8601 timespan duration, 5 min is max */
  requires_session                        = false
  dead_lettering_on_message_expiration    = false
}