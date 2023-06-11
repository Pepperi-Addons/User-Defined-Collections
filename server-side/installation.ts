
/*
The return object format MUST contain the field 'success':
{success:true}

If the result of your code is 'false' then return:
{success:false, erroeMessage:{the reason why it is false}}
The error Message is importent! it will be written in the audit log and help the user to understand what happen
*/

import { Client, Request } from '@pepperi-addons/debug-server'
import { AtdRelations, SettingsRelation, UsageMonitorRelations, VarSettingsRelation } from './metadata';
import { UtilitiesService } from './services/utilities.service';
import semver from 'semver'
import { VarSettingsService } from './services/var-settings.service';

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
    
    // if we are upgrading from a version before 0.9.20, create a relation to var settings and settings table
    if (request.body.FromVersion && semver.compare(request.body.FromVersion, '0.9.20') < 0) {
        return await createObjects(client);
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
        const varSettingsService = new VarSettingsService(client, service);

        await service.createRelations(UsageMonitorRelations);
        await service.createRelations(SettingsRelation);

        VarSettingsRelation[0]['DataView'] = varSettingsService.getDataView(); // set var settings DataView
        await service.createRelations(VarSettingsRelation); // create var settings relation
        await varSettingsService.createSettingsTable(); // create settings table with default values

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