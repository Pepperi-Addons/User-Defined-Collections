
/*
The return object format MUST contain the field 'success':
{success:true}

If the result of your code is 'false' then return:
{success:false, erroeMessage:{the reason why it is false}}
The error Message is importent! it will be written in the audit log and help the user to understand what happen
*/

import { Client, Request } from '@pepperi-addons/debug-server'
import { UtilitiesService } from './services/utilities.service';

export async function install(client: Client, request: Request): Promise<any> {
    // For page block template uncomment this.
    // const res = await createPageBlockRelation(client);
    // return res;
    const res = await createUsageMonitorRelations(client);
    return res;
}

export async function uninstall(client: Client, request: Request): Promise<any> {
    return {success:true,resultObject:{}}
}

export async function upgrade(client: Client, request: Request): Promise<any> {
    const res = await createUsageMonitorRelations(client);
    return res;
}

export async function downgrade(client: Client, request: Request): Promise<any> {
    return {success:true,resultObject:{}}
}

async function createUsageMonitorRelations(client: Client) {
    try {
        const service = new UtilitiesService(client);
        await service.createUsageMonitorRelations();
        return {
            success:true,
            resultObject: {}
        }
    } 
    catch (err) {
        return { 
            success: false, 
            resultObject: err , 
            errorMessage: `Error in upsert usage monitor relations. error - ${err}`};
    }
}
