import { Client, Request } from '@pepperi-addons/debug-server'
import { ApiFieldObject } from '@pepperi-addons/papi-sdk';

import { FieldsService } from './services/fields.service';
import { CollectionsService } from './services/collections.service'
import { DocumentsService } from './services/documents.service';
import { MappingsService } from './services/mappings.service';
import { UtilitiesService } from './services/utilities.service';
import { existingCollectionErrorMessage, UdcMapping } from './entities';


export async function schemes(client: Client, request: Request) {
    
    const collectionService = new CollectionsService(client);
    const documentsService = new DocumentsService(client);
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
    const documentsService = new DocumentsService(client);
    const collectionService = new CollectionsService(client);

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
            result = await documentsService.upsert(collectionService, collectionName, request.body);
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

export function export_data_source(client: Client, request: Request) {
    const service = new DocumentsService(client)
    if (request.method == 'POST') {
        return service.exportDataSource(request.body);
    }
    else if (request.method == 'GET') {
        throw new Error(`Method ${request.method} not supported`);       
    }
}

export function import_data_source(client: Client, request: Request) {
    const service = new DocumentsService(client)
    if (request.method == 'POST') {
        return service.importDataSource(request.body);
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
    const documentsService = new DocumentsService(client);
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
    const documentsService = new DocumentsService(client);
    const collections = await collectionsService.find({page_size: -1});
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
                return {
                    success: false,
                    errorMessage: 'message' in err ? err.message : 'unknown error occured'
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
                return {
                    success: false,
                    errorMessage: 'message' in err ? err.message : 'unknown error occured'
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

export async function create_if_not_exist(client: Client, request: Request) {
    const service = new CollectionsService(client);
    const documentsService = new DocumentsService(client);
    switch (request.method) {
        case 'POST': {
            try {
                const collectionName = request.body?.Name;
                try {
                    const collection = await service.findByName(collectionName);
                    if (collection.Hidden == true) {
                        request.body.Hidden = false;
                        const result = await service.upsert(documentsService, request.body)
                        return result;
                    }
                    else {
                        throw new Error(existingCollectionErrorMessage);
                    }
                }
                catch (error) {
                    if (error?.message?.indexOf('Object ID does not exist') >= 0) {
                        const result = await service.upsert(documentsService, request.body)
                        return result;
                    }
                    throw error;
                }
            }
            catch (err) {
                if (err?.message?.indexOf(existingCollectionErrorMessage) >= 0) {
                    throw err;
                }
                else {
                    console.log('error creating collection.', err);
                    return {
                        success: false,
                        errorMessage: 'message' in err ? err.message : 'unknown error occured'
                    }
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

export async function purge(client: Client, request: Request) {
    const service = new CollectionsService(client);
    
    switch (request.method) {
        case 'POST': {
            const collectionName = request.query.collection_name || '';
            if (collectionName) {
                return await service.purge(collectionName);
            }
            else {
                throw new Error('collection_name is required');
            }
        }
        default: {
            let err: any = new Error(`Method ${request.method} not allowed`);
            err.code = 405;
            throw err;
        }
    }
}

type FieldsResult = {
    Transactions: ApiFieldObject[],
    Items: ApiFieldObject[],
    Accounts: ApiFieldObject[],
    Activities: ApiFieldObject[],
    TransactionLines: ApiFieldObject[]
}