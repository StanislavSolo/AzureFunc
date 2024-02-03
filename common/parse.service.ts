import { faker } from '@faker-js/faker';
import { getDatabase } from './db.service';
import { csvRowData } from './types';

export async function parseAndSave(data: csvRowData[]) {
    const db = await getDatabase();
    await data.map(async (row) => {
        const product = {
            id: faker.string.uuid(),
            title: row.title,
            description: row.description,
            price: row.price,
        };

        const stock = {
            product_id: product.id,
            count: row.count,
        };

        const { resource } = await db
            .container('Product')
            .items.create(product);
        console.log(`'${resource.id}' inserted`);

        const { resource: res } = await db
            .container('Stock')
            .items.create(stock);
        console.log(`'${res.id}' inserted`);
    });
}
