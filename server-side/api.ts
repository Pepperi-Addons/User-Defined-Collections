import { Client, Request } from '@pepperi-addons/debug-server'
import { Collection } from '@pepperi-addons/papi-sdk';
import { AtdService } from './services/atd.service';
import { CollectionsService } from './services/collections.service'
import { DocumentsService } from './services/documents.service';
import { MappingsService } from './services/mappings.service';
import { UtilitiesService } from './services/utilities.service';

export async function schemes(client: Client, request: Request) {
    
    const collectionService = new CollectionsService(client);
    const documentsService = new DocumentsService(client);
    let result;

    const collectionName = request.query?.name || request.body?.Name;
    switch (request.method) {
        case 'GET': {
            if (collectionName) {
                result = await collectionService.getCollection(collectionName);
            }
            else {
                result = await collectionService.getAllCollections(request.query);
            }
            break;
        }
        case 'POST': {
            result = await collectionService.upsertCollection(documentsService, request.body);
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
                    result = await documentsService.getAllDocumentsInCollection(collectionName, request.query);
                }
            }
            else {
                throw new Error('Collection name cannot be empty');
            }
            break;
        }
        case 'POST': {
            result = await documentsService.upsertDocument(collectionService, collectionName, request.body);
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
    const collections = await service.getAllCollections();

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

export async function mappings(client: Client, request: Request) {
    const service = new MappingsService(client);

    let result;
    switch (request.method) {
        case 'GET': {
            result = await service.getMappings(request.query);
            break;
        }
        case 'POST': {
            result = await service.upsertMapping(request.body);
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

export async function field(client: Client, request: Request) {
    const service = new AtdService(client);
    let result;
    
    switch (request.method) {
        case 'GET': {
            const atdID = request.query.AtdID;
            const resource = request.query.Resource;
            const fieldID = request.query.FieldID;
            result = await service.getField(atdID, resource, fieldID);
            break;
        }
        case 'POST': {
            const atdID = request.body.AtdID;
            const resource = request.body.Resource;
            const field = request.body.Field;
            result = await service.upsertField(atdID, resource, field);
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
    const service = new AtdService(client);
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