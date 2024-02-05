import * as csv from 'csv';
import {
    BlobSASPermissions,
    BlobServiceClient,
    BlockBlobUploadResponse,
    ContainerClient,
} from '@azure/storage-blob';
import ServiceClientProvider from './serviceClientProvider';
import { BLOB_CONTAINER_NAME, PARSE_CONTAINER_NAME } from './constants';
import { ServiceBusClient } from '@azure/service-bus';

export default class StorageRepository {
    private readonly blobServiceClient: BlobServiceClient;
    private readonly containerClient: ContainerClient;

    constructor(container?: string) {
        if (container) {
            this.blobServiceClient =
                ServiceClientProvider.getBlobServiceClient();
            this.containerClient =
                this.blobServiceClient.getContainerClient(container);
        }
    }

    async saveFile(
        container: string,
        fileContent: string,
        fileName: string
    ): Promise<BlockBlobUploadResponse> {
        const blobServiceClient = ServiceClientProvider.getBlobServiceClient();
        const containerClient = blobServiceClient.getContainerClient(container);

        return containerClient
            .getBlockBlobClient(fileName)
            .upload(fileContent, fileContent.length);
    }

    async generateSasToken(
        container: string,
        fileName: string
    ): Promise<string> {
        const blobServiceClient = ServiceClientProvider.getBlobServiceClient();
        const containerClient = blobServiceClient.getContainerClient(container);

        const result = await containerClient
            .getBlockBlobClient(fileName)
            .generateSasUrl({
                startsOn: new Date(),
                expiresOn: new Date(new Date().valueOf() + 60000),
                permissions: BlobSASPermissions.parse('w'),
            });

        return result;
    }

    async readCsv(
        container: string,
        fileName: string,
        queue: string
    ): Promise<any> {
        const blobServiceClient = ServiceClientProvider.getBlobServiceClient();
        const containerClient = blobServiceClient.getContainerClient(container);
        const blobClient = await containerClient.getBlobClient(fileName);

        const result = await blobClient.download();

        const serviceBusClient = new ServiceBusClient(
            process.env.ServiceBusConnectionString
        );
        const sender = serviceBusClient.createSender(queue);

        const headers = ['title', 'description', 'price', 'count'];
        result.readableStreamBody
            .pipe(
                csv.parse({
                    delimiter: ',',
                    columns: headers,
                })
            )
            .on('data', (row) => {
                sender.sendMessages({ body: JSON.stringify(row) });
            })
            .on('end', () => {
                sender.close();
            });
    }

    async moveToParseFolder(fileName: string) {
        const blobServiceClient = ServiceClientProvider.getBlobServiceClient();
        const sourceContainerClient =
            blobServiceClient.getContainerClient(BLOB_CONTAINER_NAME);
        const destinationContainerClient =
            blobServiceClient.getContainerClient(PARSE_CONTAINER_NAME);

        const sourceBlob = sourceContainerClient.getBlockBlobClient(fileName);
        const destinationBlob = destinationContainerClient.getBlockBlobClient(
            sourceBlob.name
        );

        const response = await destinationBlob.beginCopyFromURL(sourceBlob.url);
        await response.pollUntilDone();
        await sourceBlob.delete();
    }
}
