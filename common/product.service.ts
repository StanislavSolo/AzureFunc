type Product = {
    id: string;
    title: string;
    description: string;
    price: number;
};

const products: Product[] = [
    {
        id: '1',
        title: 'product1',
        description: 'description1',
        price: 1,
    },
    {
        id: '2',
        title: 'product2',
        description: 'description2',
        price: 2,
    },
    {
        id: '3',
        title: 'product3',
        description: 'description3',
        price: 3,
    },
];

export default class ProductService {
    async getProductList(): Promise<Product[]> {
        return products;
    }

    async getProductById(productId: string): Promise<Product> {
        if (!productId) {
            console.error('id required');
        }

        const product = products.find(({ id }) => id === productId);

        return product;
    }
}
