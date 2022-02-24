import MyService from './my.service'
import { Client, Request } from '@pepperi-addons/debug-server'
import { DimxRelations } from './metadata'
import { v4 as uuid } from 'uuid';

export async function collection(client: Client, request: Request) {
    const service = new MyService(client);
    let result;

    switch (request.method) {
        case 'GET': {
            const collectionName = request.query.name;
            if (collectionName) {
                result = await service.getCollection(collectionName, request.query);
            }
            else {
                result = await service.getAllCollections(request.query);
            }
            break;
        }
        case 'POST': {
            await checkHidden(service, request.body);
            result = await service.upsertCollection(request.body);
            if (request.body.Name) {
                await createDIMXRelations(service, request.body.Name);
            }
            else {
                console.error('Could not create Dimx relations on collection without name');
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
    const service = new MyService(client);
    let result;

    const collectionName = request.query.name;
    switch (request.method) {
        case 'GET': {
            
            const key = request.query.key;
            if (collectionName) {
                if (key) {
                    result = await service.getItemByKey(collectionName, key);
                }
                else {
                    result = await service.getAllitemsInCollection(collectionName, request.query);
                }
            }
            else {
                throw new Error('Collection name cannot be empty');
            }
            break;
        }
        case 'POST': {
            request.body.Key = await getItemKey(service, request.body, collectionName);            
            result = await service.upsertItem(collectionName, request.body);
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
    const service = new MyService(client)
    if (request.method == 'POST') {
        return service.exportDataSource(request.body);
    }
    else if (request.method == 'GET') {
        throw new Error(`Method ${request.method} not supported`);       
    }
}

export function import_data_source(client: Client, request: Request) {
    const service = new MyService(client)
    if (request.method == 'POST') {
        return service.importDataSource(request.body);
    }
    else if (request.method == 'GET') {
        throw new Error(`Method ${request.method} not supported`);       
    }
}

async function createDIMXRelations(service: MyService, collectionName: string) {
    DimxRelations.forEach(async (singleRelation) => {
        // overide the name with the collectionName
        singleRelation.Name = collectionName;
        await service.upsertRelation(singleRelation);
    });
}

async function checkHidden(service: MyService, body: any) {
    if ('Hidden' in body && body.Hidden) {
        const collectionName = body.Name;
        const items = await service.getAllitemsInCollection(collectionName, {});
        if (items.length > 0) {
            throw new Error('Cannot delete collection with items not hidden');
        }
    }
}

async function getItemKey(service: MyService, body: any, collectionName: string): Promise<string> {
    let key = '';

    if ('Key' in body) {
        key = body.Key;
    }
    else {
        const scheme: any = await service.getCollection(collectionName);
        if (scheme.CompositeKeyType === 'Generate') {
            key = uuid();
        }
        else if (scheme.CompositeKeyType === 'Fields') {
            let fieldsValues: string[] = [];
            scheme.CompositeKeyFields.forEach((field) => {
                fieldsValues.push(body[field]);
            })
            key = fieldsValues.join('_');
        }
    }

    return key
}

