import { AzureFunction, Context, HttpRequest } from '@azure/functions';

const httpTrigger: AzureFunction = async function (
    context: Context,
    req: HttpRequest
): Promise<void> {
    try {
        context.res = {
            status: 200,
            headers: {
                'content-type': 'application/json',
            },
            body: 'Worked',
        };
    } catch (err) {
        console.error(err);
        context.res = {
            status: 500,
        };
    }
};
export default httpTrigger;
