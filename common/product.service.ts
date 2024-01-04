import { faker } from '@faker-js/faker';
import { getDatabase } from './db.service';
import { Product, Stock } from './faker.service';
import { TOTAL_PRODUCTS } from './constants';

export interface ProductModel {
    id: string;
    title: string;
    description: string;
    price: number;
    count: number;
}

export interface TotalProductModel {
    totalCount: number;
    totalValue: number;
}

export interface CreateProductModel {
    title: string;
    description: string;
    price: number;
    count: number;
}
export default class ProductService {
    async getProductList(): Promise<ProductModel[]> {
        try {
            const db = await getDatabase();
            const products: Product[] = (
                await db
                    .container('Product')
                    .items.query('select * from products')
                    .fetchAll()
            ).resources;

            const stocks: Stock[] = (
                await db
                    .container('Stock')
                    .items.query('select * from stocks')
                    .fetchAll()
            ).resources;

            const result = products.map((product) => {
                const stock = stocks.find(
                    (stock) => stock.product_id === product.id
                );
                return {
                    id: product.id,
                    description: product.description,
                    price: product.price,
                    title: product.title,
                    count: stock ? stock.count : 0,
                };
            });
            return result;
        } catch (err) {
            console.error(err);
        }
    }

    async getProductById(
        productId: string
    ): Promise<ProductModel | TotalProductModel> {
        if (!productId) {
            console.error('id required');
            throw new Error('id required');
        }

        if ((productId = TOTAL_PRODUCTS)) {
            return this.getTotalProducts();
        }

        try {
            const db = await getDatabase();
            const querySpec = {
                query: 'select * from products p where p.id=@productId',
                parameters: [
                    {
                        name: '@productId',
                        value: productId,
                    },
                ],
            };

            const product = (
                await db.container('Product').items.query(querySpec).fetchAll()
            ).resources[0];
            let result: ProductModel;
            if (product) {
                const querySpec = {
                    query: 'select * from stocks s where s.product_id=@productId',
                    parameters: [
                        {
                            name: '@productId',
                            value: productId,
                        },
                    ],
                };
                const stock: Stock = (
                    await db
                        .container('Stock')
                        .items.query(querySpec)
                        .fetchAll()
                ).resources[0];

                result = {
                    id: product.id,
                    description: product.description,
                    price: product.price,
                    title: product.title,
                    count: stock ? stock.count : 0,
                };
            }
            return result;
        } catch (err) {
            console.error(err);
        }
    }

    async createProduct(product: CreateProductModel): Promise<void> {
        try {
            const db = await getDatabase();
            const id = faker.string.uuid();
            const { title, description, price, count } = product;
            const dbProduct = { id, title, description, price };
            await db.container('Product').items.create(dbProduct);

            const dbStock = { product_id: id, count };
            await db.container('Stock').items.create(dbStock);
        } catch (err) {
            console.error(err);
        }
    }

    async getTotalProducts(): Promise<TotalProductModel> {
        try {
            const productList = await this.getProductList();
            let totalCount = 0,
                totalValue = 0;
            for (let i = 0; i < productList.length; i++) {
                totalCount = totalCount + Number(productList[i].count || 0);
                totalValue =
                    totalValue +
                    Number(productList[i].count || 0) *
                        Number(productList[i].price || 0);
            }

            return { totalCount, totalValue };
        } catch (err) {
            console.error(err);
        }
    }

    validateProduct(product: CreateProductModel) {
        if (!product.title || !product.description) {
            const error = {
                status: 400,
                body: 'title and description are required',
            };
            throw error;
        }

        if (
            !product.count ||
            !product.price ||
            isNaN(product.count) ||
            isNaN(product.price)
        ) {
            const error = {
                status: 400,
                body: 'price and count are required and numeric',
            };
            throw error;
        }
    }
}
