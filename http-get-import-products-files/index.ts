import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import StorageRepository from '../common/storage.repository';
import { BLOB_CONTAINER_NAME } from '../common/constants';

const httpTrigger: AzureFunction = async function (
    context: Context,
    req: HttpRequest
): Promise<void> {
    try {
        context.log('HTTP trigger function for import file (name)');
        const name = req.query.name || 'noname_file';
        const container = BLOB_CONTAINER_NAME;

        const storageRepository = new StorageRepository(container);
        const sasToken = await storageRepository.generateSasToken(
            container,
            name
        );

        context.res = {
            status: 200,
            headers: {
                'content-type': 'application/json',
            },
            body: sasToken,
        };
    } catch (err) {
        console.error(err);
        context.res = {
            status: 500,
        };
    }
};

export default httpTrigger;
