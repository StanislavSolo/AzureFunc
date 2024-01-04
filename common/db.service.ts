import { CosmosClient } from '@azure/cosmos';

export async function getDatabase() {
    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_KEY;
    const cosmosClient = new CosmosClient({ endpoint, key });

    try {
        const db = cosmosClient.database(process.env.COSMOS_DB_NAME);
        console.log('connect to db successful');
        return db;
    } catch (err) {
        console.error(err);
    }
}
