import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import ProductService from '../common/product.service';
import { getConfigSettings } from '../common/config.service';

const httpTrigger: AzureFunction = async function (
    context: Context,
    req: HttpRequest
): Promise<void> {
    try {
        const productService = new ProductService();
        const product = await productService.getProductList();
        const settings = await getConfigSettings('testKey');

        context.res = {
            status: 200,
            headers: {
                'content-type': 'application/json',
                testKey: settings,
            },
            body: product,
        };
    } catch (err) {
        console.error(err);
        context.res = {
            status: 500,
        };
    }
};
export default httpTrigger;
