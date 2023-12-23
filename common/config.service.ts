import { DefaultAzureCredential } from '@azure/identity';
import { AppConfigurationClient } from '@azure/app-configuration';

const credential = new DefaultAzureCredential();

const connectionString = process.env.AZURE_CONNECTION_STRING;
const appConfigClient = new AppConfigurationClient(connectionString);

export async function getConfigSettings(key: string): Promise<any> {
    const keyValue = await appConfigClient.getConfigurationSetting({ key });

    return keyValue?.value;
}
