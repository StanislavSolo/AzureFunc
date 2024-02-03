import { faker } from '@faker-js/faker';
import { getDatabase } from './db.service';
import { Product, Stock } from './types';

const generateProducts = (count: number): Product[] => {
    const products: Product[] = [];
    for (let i = 0; i < count; i++) {
        const product: Product = {
            id: faker.string.uuid(),
            title: faker.commerce.productName(),
            description: faker.commerce.productDescription(),
            price: parseFloat(faker.commerce.price()),
        };
        products.push(product);
    }
    return products;
};

const generateStocks = (products: Product[]): Stock[] => {
    const stocks: Stock[] = [];
    for (const product of products) {
        const stock: Stock = {
            product_id: product.id,
            count: faker.number.int(100),
        };
        stocks.push(stock);
    }
    return stocks;
};

const products = generateProducts(5);
const stocks = generateStocks(products);

async function insertDataToDB() {
    const db = await getDatabase();

    for (const product of products) {
        const { resource } = await db
            .container('Product')
            .items.create(product);
        console.log(`'${resource.id}' inserted`);
    }

    for (const stock of stocks) {
        const { resource } = await db.container('Stock').items.create(stock);
        console.log(`'${resource.id}' inserted`);
    }
}

insertDataToDB();
