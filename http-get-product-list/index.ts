import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import ProductService from '../common/product.service';

const httpTrigger: AzureFunction = async function (
    context: Context,
    req: HttpRequest
): Promise<void> {
    try {
        context.log('HTTP trigger function for get product list');
        const productService = new ProductService();
        const products = await productService.getProductList();
        console.log(`Recieved ${products.length} products`);

        context.res = {
            status: 200,
            headers: {
                'content-type': 'application/json',
            },
            body: products,
        };
    } catch (err) {
        console.error(err);
        context.res = {
            status: 500,
        };
    }
};
export default httpTrigger;
