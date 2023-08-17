import { Client, Request } from '@pepperi-addons/debug-server'
import { ApiFieldObject, Collection } from '@pepperi-addons/papi-sdk';

import { FieldsService } from './services/fields.service';
import { CollectionsService } from './services/collections.service'
import { MappingsService } from './services/mappings.service';
import { UtilitiesService } from './services/utilities.service';
import { UdcMapping, FieldsResult, DocumentsService } from 'udc-shared';
import { ApiService } from './services/api-service';
import { ResourcesService } from './services/resources-service';
import { ServerDocumentsService } from './services/documents.service';

import { VarSettingsService } from './services/var-settings.service';
import { limitationTypes } from './metadata';

export async function var_settings(client: Client, request: Request) {
    const utilities = new UtilitiesService(client);
    const varRelationService: VarSettingsService = new VarSettingsService(utilities);

    try {
        if (request.method === 'POST') {
            // SET settings data according user change - getting updated values from Var settings (on value changed)
            return varRelationService.setVarSettingsUpdatedValues(request.body);
        }
        else if (request.method === 'GET') {
            // GET settings data - sending updated values to Var settings (on var settings page reload)
            return varRelationService.getVarSettingsConfiguration();
        }
        else {
            throw new Error(`Method ${request.method} is not supported`)
        }
    }
    catch (error) {
        console.error(`var_settings: ${error}`);
        throw error;
    }
}


export async function schemes(client: Client, request: Request) {
    
    const collectionService = new CollectionsService(client);
    const apiService = new ApiService(client);
    const resourcesService = new ResourcesService(client);
    const documentsService = new DocumentsService(apiService, resourcesService);
    let result;

    const collectionName = request.query?.name || request.body?.Name;
    switch (request.method) {
        case 'GET': {
            if (collectionName) {
                result = await collectionService.findByName(collectionName);
            }
            else {
                result = await collectionService.find(request.query);
            }
            break;
        }
        case 'POST': {
            result = await collectionService.upsert(documentsService, request.body);
            break;
        }
        default: {
            let err: any = new Error('Method not allowed'); 
            err.code = 405;
            throw err;
        }
    }
    return result;
}

export async function documents(client: Client, request: Request) {
    const apiService = new ApiService(client);
    const resourcesService = new ResourcesService(client);
    const documentsService = new DocumentsService(apiService, resourcesService);
    const utilities = new UtilitiesService(client);
    const varRelationService: VarSettingsService = new VarSettingsService(utilities);


    let result;

    const collectionName = request.query.name;
    switch (request.method) {
        case 'GET': {
            
            const key = request.query.key;
            if (collectionName) {
                if (key) {
                    result = await documentsService.getDocumentByKey(collectionName, key);
                }
                else {
                    result = await documentsService.find(collectionName, request.query);
                }
            }
            else {
                throw new Error('Collection name cannot be empty');
            }
            break;
        }
        case 'POST': {
            const containedArrayLimit: number = await varRelationService.getSettingsByName(limitationTypes.ItemsOfContainedArray);
            result = await documentsService.upsert(collectionName, request.body, containedArrayLimit);
            break;
        }
        default: {
            let err: any = new Error(`Method ${request.method} not allowed`);
            err.code = 405;
            throw err;
        }
    }
    return result;
}

export async function export_data_source(client: Client, request: Request) {
    const service = new ServerDocumentsService(client)
    if (request.method == 'POST') {
        return service.exportDataSource(request.body);
    }
    else if (request.method == 'GET') {
        throw new Error(`Method ${request.method} not supported`);       
    }
}

export async function import_data_source(client: Client, request: Request) {
    const service = new ServerDocumentsService(client)
    const collectionsService = new CollectionsService(client)
    const collectionName = request.query.collection_name || '';
    if (request.method == 'POST') {
        try {
            return await service.importDataSource(request.body, collectionName);
        }
        catch (error) {
            console.log(`import data for collection ${collectionName} failed with error ${JSON.stringify(error)}`);
            throw error;
        }
    }
    else if (request.method == 'GET') {
        throw new Error(`Method ${request.method} not supported`);       
    }
}

export async function collections_number(client: Client, request: Request) {
    const service = new CollectionsService(client);
    const collections = await service.find();

    return {
        Title: "Setup",
        "Resources": [
            {
                "Data": "Collections",
                "Description": "Number of collections", 
                "Size": collections.length,
            },
        ],
        "ReportingPeriod": "Weekly",
        "AggregationFunction": "LAST"
    }
}

export async function total_documents(client: Client, request: Request) {
    const collectionsService = new CollectionsService(client);
    const documentsService = new ServerDocumentsService(client);
    const count = await documentsService.getAllDocumentsCount(collectionsService);
    
    return {
        Title: "Data",
        "Resources": [
            {
                "Data": "Documents",
                "Description": "Number of documents",
                "Size": count,
            },
        ],
        "ReportingPeriod": "Weekly",
        "AggregationFunction": "LAST"
    }
}

export async function documents_per_collection(client: Client, request: Request) {
    const collectionsService = new CollectionsService(client);
    const documentsService = new ServerDocumentsService(client);
    const collections = await collectionsService.find({page_size: -1}) as Collection[];
    const documentsPerCollection = await documentsService.getDocumentsCountForCollection(collections);
    
    return {
        Title: "Collections",
        Resources: documentsPerCollection,
        ReportingPeriod: "Weekly",
        AggregationFunction: "LAST"
    }
    
}

export async function mappings(client: Client, request: Request) {
    const service = new MappingsService(client);

    let result;
    switch (request.method) {
        case 'GET': {
            const atdID = Number(request.query.atd_id);
            result = await service.find(request.query, atdID);
            break;
            
        }
        case 'POST': {
            result = await service.upsert(request.body);
            break;
        }
        default: {
            let err: any = new Error(`Method ${request.method} not allowed`);
            err.code = 405;
            throw err;
        }
    }
    
    return result;
    
}

export async function get_atd(client: Client, request: Request) {
    const service = new UtilitiesService(client);
    let result;
    
    switch (request.method) {
        case 'GET': {
            const uuid = request.query.uuid;
            result = await service.getAtd(uuid);
            break;
        }
        default: {
            let err: any = new Error(`Method ${request.method} not allowed`);
            err.code = 405;
            throw err;
        }        
    }
    
    return result;   
}

export async function fields(client: Client, request: Request) {
    const service = new FieldsService(client);
    let result: FieldsResult = {
        Transactions: [],
        Items: [],
        Accounts: [],
        Activities: [],
        TransactionLines: []
    }
    
    switch (request.method) {
        case 'GET': {
            const atd_uuid = request.query.atd_uuid;
            const atd = await service.utilities.getAtd(atd_uuid);
            result.Transactions = atd.Type === 2 ? await service.getFields(atd.InternalID, "transactions") : [];
            result.Items = await service.getFields(atd.InternalID, "items");
            result.Accounts = await service.getFields(atd.InternalID, "accounts");
            result.Activities = atd.Type === 99 ? await service.getFields(atd.InternalID, "activities") : [];
            result.TransactionLines = atd.Type === 2 ? await service.getFields(atd.InternalID, "transaction_lines") : [];
            break;
        }
        default: {
            let err: any = new Error(`Method ${request.method} not allowed`);
            err.code = 405;
            throw err;
        }        
    }
    
    return result;
}

export async function export_udc_mappings(client: Client, request: Request) {
    const service = new MappingsService(client);
    switch (request.method) {
        case 'GET': {
            try {
                const atdID = Number(request.query.internal_id);
                const result = await service.find(request.query, atdID) as UdcMapping[];
                if (result && result.length > 0) {
                    return {
                        succes: true,
                        DataForImport: {
                            mappings: result.map(item => {
                                return {
                                    Field: item.Field,
                                    Resource: item.Resource,
                                    DataSource: item.DataSource,
                                    DocumentKeyMapping: item.DocumentKeyMapping
                                }
                            })
                        }
                    }
                }
                else {
                    return {
                        success:true,
                        DataForImport: {}
                    }
                }
            }
            catch(err) {
                console.log('export_udc_mappings Failed with error:', err);
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
        default: {
            let err: any = new Error(`Method ${request.method} not allowed`);
            err.code = 405;
            throw err;
        }        
    }
}

export async function import_udc_mappings(client: Client, request: Request) {
    const mappingService = new MappingsService(client);
    const fieldService = new FieldsService(client);
    switch (request.method) {
        case 'POST': {
            try {
                const atdID = Number(request.body?.InternalID);
                const data = request.body?.DataFromExport || undefined;
                if (data && data.mappings) {
                    await Promise.all(data.mappings.map(async (item) => {
                        const objToUpdate = {
                            AtdID : atdID,
                            ...item
                        }
                        await mappingService.upsert(objToUpdate);
                        await fieldService.upsert(objToUpdate);
                    }));
                }
                return {
                    success: true
                }
            }
            catch(err) {
                console.log('import_udc_mappings Failed with error:', err);
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
        default: {
            let err: any = new Error(`Method ${request.method} not allowed`);
            err.code = 405;
            throw err;
        }        
    }
}

export async function create(client: Client, request: Request) {
    const collectionsService = new CollectionsService(client);
    const serverDocumentsService = new ServerDocumentsService(client);
    const apiService = new ApiService(client);
    const resourcesService = new ResourcesService(client);
    const documentsService = new DocumentsService(apiService, resourcesService);

    switch (request.method) {
        case 'POST': {
            let collectionName = request.query.collection_name || '';
            if(collectionName) {
                return await serverDocumentsService.create(collectionsService, collectionName, request.body)
            }
            else {
                collectionName = request.body?.Name || undefined;
                return await collectionsService.create(documentsService, collectionName, request.body);
            }
        }
        default: {
            let err: any = new Error(`Method ${request.method} not allowed`);
            err.code = 405;
            throw err;
            
        }
    }
}

export async function hard_delete(client: Client, request: Request) {
    const documentsService = new ServerDocumentsService(client);
    const collectionsService = new CollectionsService(client);
    switch (request.method) {
        case 'POST': {
            const collectionName = request.query.collection_name || '';
            const key = request.query.key || '';
            const force = request.body.Force || false;
            if (collectionName) {
                if (key) {
                    return await documentsService.hardDelete(collectionName, key, force);
                }
                else {
                    return await collectionsService.hardDelete(collectionName, force);
                }
            }
            else {
                throw new Error(`collection_name is mandatory`);
            }
        }
        default: {
            let err: any = new Error(`Method ${request.method} not allowed`);
            err.code = 405;
            throw err;
        }
    }
}

export function unique(client: Client, request: Request) {
    const error: any = new Error("this method is not supported by this resource");
    error.code = 405;
    throw error;
}

export async function search(client: Client, request: Request) {
    const resourceName = request.query.resource_name;
    const apiService = new ApiService(client);
    const resourcesService = new ResourcesService(client);
    const documentsService = new DocumentsService(apiService, resourcesService);

    switch(request.method) {
        case 'POST': {
            return await documentsService.search(resourceName, request.body);
        }
        default: {
            const err: any = new Error(`method ${request.method} is not allowed`);
            err.code = 405;
            throw err;
        }
    }
}
    
export async function collection_fields(client: Client, request: Request) {
    const resourceName = request.query.collection_name || '';
    const service = new CollectionsService(client);
    
    switch(request.method) {
        case 'GET': {
            const fields = {};
            const collection = await service.findByName(resourceName);
            if (collection) {
                const fieldNames = Object.keys(collection.Fields!).forEach(fieldName => {
                    if (collection.Fields![fieldName].Indexed) {
                        fields[fieldName] = {...collection.Fields![fieldName]};
                    }
                });
            }
            return {
                Fields: fields
            }
        }
        default: {
            const err: any = new Error(`method ${request.method} is not allowed`);
            err.code = 405;
            throw err;
        }
    }
}

export async function clean_rebuild(client: Client, request: Request) {
    const resourceName = request.query.collection_name || '';
    const service = new CollectionsService(client);
    
    switch(request.method) {
        case 'POST': {
            return await service.cleanRebuild(resourceName);
        }
        default: {
            const err: any = new Error(`method ${request.method} is not allowed`);
            err.code = 405;
            throw err;
        }
    }
}

export async function collection_events(client: Client, request: Request) {
    const collectionName = request.query.collection_name || '';
    const service = new CollectionsService(client);
    switch (request.method) {
        case 'GET': {
            return await service.getCollectionEvents(collectionName);
        }
        default: {
            const err: any = new Error(`method ${request.method} is not allowed`);
            err.code = 405;
            throw err;
        }
    }
}
