import { AzureFunction, Context } from '@azure/functions';
import {
    BLOB_CONTAINER_NAME,
    SERVICE_BUS_QUEUE_NAME,
} from '../common/constants';
import StorageRepository from '../common/storage.repository';

const blobTrigger: AzureFunction = async function (
    context: Context,
    myBlob: any
): Promise<void> {
    context.log(
        'Blob trigger function processed blob \n Name:',
        context.bindingData.name,
        '\n Blob Size:',
        myBlob.length,
        'Bytes'
    );

    const container = BLOB_CONTAINER_NAME;

    const storageRepository = new StorageRepository(container);

    await storageRepository.readCsv(
        container,
        context.bindingData.name,
        SERVICE_BUS_QUEUE_NAME
    );
    await storageRepository.moveToParseFolder(context.bindingData.name);
};

export default blobTrigger;
