
/*
The return object format MUST contain the field 'success':
{success:true}

If the result of your code is 'false' then return:
{success:false, erroeMessage:{the reason why it is false}}
The error Message is importent! it will be written in the audit log and help the user to understand what happen
*/

import { Client, Request } from '@pepperi-addons/debug-server'
import { AtdRelations, UsageMonitorRelations } from './metadata';
import { UtilitiesService } from './services/utilities.service';
import semver from 'semver'

export async function install(client: Client, request: Request): Promise<any> {
    // For page block template uncomment this.
    // const res = await createPageBlockRelation(client);
    // return res;
    return await createObjects(client);
}

export async function uninstall(client: Client, request: Request): Promise<any> {
   return {success:true,resultObject:{}}
}

export async function upgrade(client: Client, request: Request): Promise<any> {
    if (request.body.FromVersion && semver.compare(request.body.FromVersion, '0.0.73') < 0) {
        throw new Error('Upgarding from versions ealier than 0.0.74 is not supported. Please uninstall the addon and install it again.');
    }
    else {
        return {success:true,resultObject:{}}
    }
}

export async function downgrade(client: Client, request: Request): Promise<any> {
    return {success:true,resultObject:{}}
}

async function createObjects(client: Client) {
    try {
        const service = new UtilitiesService(client);
        await service.createRelations(UsageMonitorRelations);
        await service.createRelations(AtdRelations);
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

