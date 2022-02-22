import { PapiClient, InstalledAddon, AddonDataScheme, AddonData } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';
import { DimxRelations } from './metadata';

class MyService {
    
    papiClient: PapiClient
    
    constructor(private client: Client) {
        this.papiClient = new PapiClient({
            baseURL: client.BaseURL,
            token: client.OAuthAccessToken,
            addonUUID: client.AddonUUID,
            addonSecretKey: client.AddonSecretKey,
            actionUUID: client.AddonUUID
        });
    }
    
    // For page block template
    upsertRelation(relation): Promise<any> {
        return this.papiClient.post('/addons/data/relations', relation);
    }
    
    async upsertCollection(body: any) {
        const collectionObj = {
            ...body,
            Type: "meta_data"
        }
        return await this.papiClient.addons.data.schemes.post(collectionObj);
    }
    
    async getCollection(tableName:string): Promise<AddonDataScheme> {
        return await this.papiClient.addons.data.schemes.name.get(tableName);
    }
    
    async getAllCollections(): Promise<AddonDataScheme[]> {
        return await this.papiClient.addons.data.schemes.get();
    }
    
    async getAllitemsInCollection(collectionName: any, options: any): Promise<AddonData[]> {
        return await this.papiClient.addons.data.uuid(this.client.AddonUUID).table(collectionName).find(options);
    }
    
    async getItemByKey(collectionName: any, key: any): Promise<AddonData> {
        return await this.papiClient.addons.data.uuid(this.client.AddonUUID).table(collectionName).key(key).get();
    }
    
    async upsertItem(collectionName: any, body: any): Promise<AddonData> {
        return await this.papiClient.addons.data.uuid(this.client.AddonUUID).table(collectionName).upsert(body);
    }

    //DIMX
    // for the AddonRelativeURL of the relation
    async importDataSource(body) {
        console.log("importing data")
        return body;
    }

    async exportDataSource(body) {
        console.log("exporting data")
        return body;
     }
}

export default MyService;