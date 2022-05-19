
/*
The return object format MUST contain the field 'success':
{success:true}

If the result of your code is 'false' then return:
{success:false, erroeMessage:{the reason why it is false}}
The error Message is importent! it will be written in the audit log and help the user to understand what happen
*/

import { Client, Request } from '@pepperi-addons/debug-server'
import { AtdRelations, UsageMonitorRelations } from './metadata';
import { FieldsService } from './services/fields.service';
import { MappingsService } from './services/mappings.service';
import { UtilitiesService } from './services/utilities.service';

export async function install(client: Client, request: Request): Promise<any> {
    // For page block template uncomment this.
    // const res = await createPageBlockRelation(client);
    // return res;
    return await createObjects(client);
}

export async function uninstall(client: Client, request: Request): Promise<any> {
    try {
        const mappingService = new MappingsService(client);
        const fieldsService = new FieldsService(client);
        const mappings = await mappingService.find({page_size: -1});
        await Promise.all(mappings.map(async (item) => {
            await fieldsService.delete(item.AtdID, item.Field.ApiName, item.Resource);
        }));
        return {
            success: true,
            resultObject: {}
        }
    }
    catch (err) {
        console.log('could not uninstall UDC. failed deleting TSA fields. error:', err)
        let errMessage = 'Unknown error occured';
        if (err instanceof Error) {
            errMessage = err.message;
        }
        return {
            success:false,
            errorMessage: errMessage
        }
   }
}

export async function upgrade(client: Client, request: Request): Promise<any> {
    return await createObjects(client);
}

export async function downgrade(client: Client, request: Request): Promise<any> {
    return {success:true,resultObject:{}}
}

async function createObjects(client: Client) {
    try {
        const service = new UtilitiesService(client);
        await service.createRelations(UsageMonitorRelations);
        await service.createRelations(AtdRelations);
        await service.createADALSchemes();
        return {
            success:true,
            resultObject: {}
        }
    } 
    catch (err) {
        return { 
            success: false, 
            resultObject: err , 
            errorMessage: `Error in creating necessary objects . error - ${err}`
        };
    }
}

