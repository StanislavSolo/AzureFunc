import { AzureFunction, Context } from "@azure/functions"

const serviceBusQueueTrigger: AzureFunction = async function(context: Context, mySbMsg: any): Promise<void> {
    context.log('ServiceBus queue trigger function processed message', mySbMsg);

    context.log('Service Bus message received: ', mySbMsg);

    const productDataFromQueue = mySbMsg.body; 

    const product = JSON.parse(productDataFromQueue);

    context.bindings.outputDocument = product;
};

export default serviceBusQueueTrigger;
