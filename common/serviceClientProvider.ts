import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';

export default class ServiceClientProvider {
    static getBlobServiceClient(): BlobServiceClient {
        const credentials = new DefaultAzureCredential();
        return new BlobServiceClient(
            process.env.BLOB_STORAGE_URI,
            credentials,
            { keepAliveOptions: { enable: false } }
        );
    }
}
