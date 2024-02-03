import * as csv from 'csv';
import {
    BlobSASPermissions,
    BlobServiceClient,
    BlockBlobUploadResponse,
    ContainerClient,
} from '@azure/storage-blob';
import ServiceClientProvider from './serviceClientProvider';
import { parseAndSave } from './parse.service';
import { csvRowData } from './types';
import { BLOB_CONTAINER_NAME, PARSE_CONTAINER_NAME } from './constants';

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

    async readCsv(container: string, fileName: string): Promise<any> {
        const blobServiceClient = ServiceClientProvider.getBlobServiceClient();
        const containerClient = blobServiceClient.getContainerClient(container);
        const blobClient = await containerClient.getBlobClient(fileName);

        const result = await blobClient.download();

        const headers = ['title', 'description', 'price', 'count'];
        const results: csvRowData[] = [];
        result.readableStreamBody
            .pipe(
                csv.parse({
                    delimiter: ',',
                    columns: headers,
                })
            )
            .on('data', (row) => results.push(row))
            .on('end', () => parseAndSave(results));
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
