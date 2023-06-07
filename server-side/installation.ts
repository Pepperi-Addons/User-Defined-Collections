
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
import { CollectionsService } from './services/collections.service';
import { VarSettingsService } from './var-settings.service';

export async function install(client: Client, request: Request): Promise<any> {
    // For page block template uncomment this.
    // const res = await createPageBlockRelation(client);
    // return res;
    let res;
    const varSettingsRes = await createVarSettingsRelationAndTable(client);
    const objectsRes = await createObjects(client);
    if(varSettingsRes.success && objectsRes.success){
        res = {success:true,resultObject:{}}
    }
    else{
        res = {success:false, resultObject: varSettingsRes.errorMessage || objectsRes.errorMessage }
    }
    return res;
}

export async function uninstall(client: Client, request: Request): Promise<any> {
   return {success:true,resultObject:{}}
}

export async function upgrade(client: Client, request: Request): Promise<any> {
    if (request.body.FromVersion && semver.compare(request.body.FromVersion, '0.0.73') < 0) {
        throw new Error('Upgarding from versions ealier than 0.0.74 is not supported. Please uninstall the addon and install it again.');
    }
    // if we are upgrading to a version of angular 14, we need to create settings relation
    else if (request.body.FromVersion && semver.compare(request.body.FromVersion, '0.6.114') < 0) { 
        return await createObjects(client);
    }
    // if we are upgrading from a version before 0.8.22, need to migrate DQ relations
    if (request.body.FromVersion && semver.compare(request.body.FromVersion, '0.8.22') < 0) { 
        const service = new CollectionsService(client);
        return await service.migrateDQRelations();
    }
    // if we are upgrading from a version before 0.9.10, create a relation to var settings and settings table
    else if (request.body.FromVersion && semver.compare(request.body.FromVersion, '0.9.10') < 0) {
        return await createVarSettingsRelationAndTable(client);
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
        await service.createRelations(SettingsRelation);
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

async function createVarSettingsRelationAndTable(client: Client){
    try {
        const service = new UtilitiesService(client);
        const varSettingsService = new VarSettingsService();
        const dataView = varSettingsService.getDataView(); // set var settings DataView
        VarSettingsRelation[0]['DataView'] = dataView;
        
        await service.createRelations(VarSettingsRelation); // create var settings relation
        await service.createSettingsTable(); // create settings table with default values

        return {
            success:true,
            resultObject: {}
        }
    } 
    catch (err) {
        return { 
            success: false, 
            resultObject: err , 
            errorMessage: `Error in creating var settings objects . error - ${err}`
        };
    }
}