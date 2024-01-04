import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import ProductService from '../common/product.service';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    try {
        context.log('HTTP trigger function for get product by id');
        const productService = new ProductService();
        const { id } = req.params;
        const product = await productService.getProductById(id);
        console.log(`Product with id ${id} has been recieved`);

        context.res = {
            status: 200,
            headers: {
                'content-type': 'application/json',
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
