import { UtilitiesService } from './utilities.service';
import { PapiClient, AddonDataScheme } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';
import { DimxRelations } from '../metadata';
import { DocumentsService } from './documents.service';

export class CollectionsService {
    
    papiClient: PapiClient
    utilities: UtilitiesService = new UtilitiesService();

    constructor(private client: Client) {
        this.papiClient = new PapiClient({
            baseURL: client.BaseURL,
            token: client.OAuthAccessToken,
            addonUUID: client.AddonUUID,
            addonSecretKey: client.AddonSecretKey,
            actionUUID: client.AddonUUID
        });
    }

    
    async upsertCollection(service: DocumentsService, body: any) {
        const collectionObj = {
            ...body,
            Type: "meta_data"
        }
        await service.checkHidden(body);
        const collection = await this.papiClient.addons.data.schemes.post(collectionObj);
        await this.createDIMXRelations(collection.Name);
        return collection;
    }    
    
    async getCollection(tableName:string, options: any = {}): Promise<AddonDataScheme> {
        return await this.papiClient.addons.data.schemes.name(tableName).get(options);
    }
    
    async getAllCollections(options: any = {}): Promise<AddonDataScheme[]> {
        return await this.papiClient.addons.data.schemes.get(options);
    }

    async createDIMXRelations(collectionName: string) {
        await Promise.all(DimxRelations.map(async (singleRelation) => {
            // overide the name with the collectionName
            singleRelation.Name = collectionName;
            await this.papiClient.post('/addons/data/relations', singleRelation);
        }));
    }
}