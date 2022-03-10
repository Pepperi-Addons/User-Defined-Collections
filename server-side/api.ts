import { Client, Request } from '@pepperi-addons/debug-server'
import { CollectionsService } from './services/collections.service'
import { DocumentsService } from './services/documents.service';
import { UtilitiesService } from './services/utilities.service';

export async function collection(client: Client, request: Request) {
    
    const collectionService = new CollectionsService(client);
    const documentsService = new DocumentsService(client);
    let result;

    const collectionName = request.query.name || request.body.Name;
    switch (request.method) {
        case 'GET': {
            if (collectionName) {
                result = await collectionService.getCollection(collectionName, request.query);
            }
            else {
                result = await collectionService.getAllCollections(request.query);
            }
            break;
        }
        case 'POST': {
            if (collectionName) {
                result = await collectionService.upsertCollection(documentsService, request.body);
            }
            else {
                throw new Error('Could not create collection without name');
            }
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

export async function items(client: Client, request: Request) {
    const documentsService = new DocumentsService(client);
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
            result = await documentsService.upsertDocument(collectionName, request.body);
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


