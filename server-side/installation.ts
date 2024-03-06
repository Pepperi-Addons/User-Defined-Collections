
/*
The return object format MUST contain the field 'success':
{success:true}

If the result of your code is 'false' then return:
{success:false, erroeMessage:{the reason why it is false}}
The error Message is importent! it will be written in the audit log and help the user to understand what happen
*/

import { Client, Request } from '@pepperi-addons/debug-server'
import { AtdRelations, SettingsRelation, UsageMonitorRelations, VarSettingsRelation, udcSchemesPermissionsPolicy, udcSchemesPermissionsPolicyDescription } from './metadata';
import { UtilitiesService } from './services/utilities.service';
import semver from 'semver'
import { VarSettingsService } from './services/var-settings.service';
import { CollectionsService } from './services/collections.service';
import { PermissionsService } from './services/permissions.service';
import { DocumentsService } from 'udc-shared';
import { ApiService } from './services/api-service';
import { ResourcesService } from './services/resources-service';

export async function install(client: Client, request: Request): Promise<any> {
    // For page block template uncomment this.
    // const res = await createPageBlockRelation(client);
    // return res;

    //upsert permissions
    const permissionsService = new PermissionsService(client);
    await permissionsService.createPermission(udcSchemesPermissionsPolicy, udcSchemesPermissionsPolicyDescription);
    
    return await createObjects(client);
}

export async function uninstall(client: Client, request: Request): Promise<any> {
    return { success: true, resultObject: {} }
}

export async function upgrade(client: Client, request: Request): Promise<any> {
    let result = { success: true, resultObject: {} }; // Initialize the result object

    try {
        if (request.body.FromVersion && semver.compare(request.body.FromVersion, '0.9.20') < 0) {
            result = await createObjects(client);
        }

        // Check for the next condition only if the previous operation was successful
        if (result.success) {
            const apiService = new ApiService(client);
            const resourcesService = new ResourcesService(client);
            const documentsService = new DocumentsService(apiService, resourcesService);
            const collectionsService = new CollectionsService(client);
            result = await collectionsService.migrateCollections(request, documentsService);
        }

        // Create permissions if upgrading from a version before 0.9.44
        if (result.success && request.body.FromVersion && semver.compare(request.body.FromVersion, '0.9.44') < 0) {
            const permissionsService = new PermissionsService(client);
            await permissionsService.createPermission(udcSchemesPermissionsPolicy, udcSchemesPermissionsPolicyDescription);
        }
    } catch (err) {
        result = { success: false, resultObject: err as Error };
    }

    return result; // Return the (potentially modified) result object
}

export async function downgrade(client: Client, request: Request): Promise<any> {
    // if we are downgrading from a version after 0.9.24, remove initDataRelativeURL
    if (request.body.ToVersion && semver.compare(request.body.ToVersion, '0.9.24') < 0) {
        const collectionsService = new CollectionsService(client);
        return await collectionsService.unmigrateDIMXRelations();
    }
    else {
        return { success: true, resultObject: {} }
    }
}

async function createObjects(client: Client) {
    try {
        const service = new UtilitiesService(client);
        const varSettingsService = new VarSettingsService(service);

        await service.createRelations(UsageMonitorRelations);
        await service.createRelations(SettingsRelation);

        VarSettingsRelation[0]['DataView'] = varSettingsService.getDataView(); // set var settings DataView
        await service.createRelations(VarSettingsRelation); // create var settings relation
        await varSettingsService.createSettingsTable(); // create settings table with default values

        return {
            success: true,
            resultObject: {}
        }
    }
    catch (err) {
        return {
            success: false,
            resultObject: err as Error,
            errorMessage: `Error in creating necessary objects . error - ${err}`
        };
    }
}
