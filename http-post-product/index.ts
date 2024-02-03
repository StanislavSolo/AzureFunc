import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import ProductService from '../common/product.service';

const httpTrigger: AzureFunction = async function (
    context: Context,
    req: HttpRequest
): Promise<void> {
    try {
        context.log('HTTP trigger function for add new product');
        const productService = new ProductService();
        const product = req.body;
        productService.validateProduct(product);
        await productService.createProduct(product);
        console.log('product added');
        context.res = {
            status: 200,
            headers: {
                'content-type': 'application/json',
            },
            body: 'product added',
        };
    } catch (err) {
        console.error(err);
        context.res = err;
    }
};
export default httpTrigger;
