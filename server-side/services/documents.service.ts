import { PapiClient, InstalledAddon, AddonDataScheme, AddonData } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';
import { DimxRelations } from '../metadata';
import { UtilitiesService } from './utilities.service';

export class DocumentsService {
    
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
    
    async getAllDocumentsInCollection(collectionName: any, options: any): Promise<AddonData[]> {
        return await this.papiClient.addons.data.uuid(this.client.AddonUUID).table(collectionName).find(options);
    }
    
    async getDocumentByKey(collectionName: any, key: any): Promise<AddonData> {
        return await this.papiClient.addons.data.uuid(this.client.AddonUUID).table(collectionName).key(key).get();
    }
    
    async upsertDocument(collectionName: any, body: any): Promise<AddonData> {
        return await this.papiClient.addons.data.uuid(this.client.AddonUUID).table(collectionName).upsert(body);
    }

    async checkHidden(body: any) {
        if ('Hidden' in body && body.Hidden) {
            const collectionName = body.Name;
            const items = await this.getAllDocumentsInCollection(collectionName, {});
            if (items.length > 0) {
                throw new Error('Cannot delete collection with documents');
            }
        }
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