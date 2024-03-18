import { AddonData, AddonDataScheme, Collection, SearchData } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';
import { UtilitiesService } from './utilities.service';
import { CollectionsService } from './collections.service';
import { existingErrorMessage, existingInRecycleBinErrorMessage, GlobalService, DocumentsService } from 'udc-shared';
import { ApiService } from './api-service';
import { ResourcesService } from './resources-service';
import { VarSettingsService } from '../services/var-settings.service';
import { limitationTypes } from '../metadata';
import { DIMXImportInitData } from '../../shared/src/entities';

import config from '../../addon.config.json'

export class ServerDocumentsService {
    
    utilities: UtilitiesService = new UtilitiesService(this.client);
    globalService = new GlobalService();
    apiService = new ApiService(this.client);
    resourcesService = new ResourcesService(this.client);
    documentsService: DocumentsService;
    varRelationService: VarSettingsService = new VarSettingsService(this.utilities);
    
    constructor(private client: Client, private initData?: DIMXImportInitData) {
        if (!initData) {
            console.log('ServerDocumentService: initData not provided.');
        }
        this.documentsService = new DocumentsService(this.apiService, this.resourcesService, initData);
    }
    
    
    async getAllDocumentsCount(collectionsService: CollectionsService): Promise<number> {
        const collections = await collectionsService.find() as Collection[];
        let count = 0;
        await Promise.all(collections.map(async (item) => {
            try {
                if(item.Type === 'data') {
                    const documentsCount = await this.getDocumentsCountForSingleCollection(item)
                    count += documentsCount
                }
            }
            catch (err) {
                console.log(`could not get documents for collection ${item.Name}. error: ${err}`)
            }
        }))

        return count;
    }

    async getDocumentsCountForCollection(collections: Collection[]) {
        const retVal: any[] = []
        await Promise.all(collections.map(async (item) => {
            try {
                if(item.Type === 'data') {
                    const documentsCount = await this.getDocumentsCountForSingleCollection(item)
                    retVal.push ({
                        Data: item.Name,
                        Description: `Number of documents in ${item.Name}`,
                        Size: documentsCount
                    })
                }
            }
            catch (err) {
                console.log(`could not get documents for collection ${item.Name}. error: ${err}`)
            }
        }))
        return retVal.sort(((prev,curr) => prev.Data.localeCompare(curr.Data)));
    }

    async getDocumentsCountForSingleCollection(collectionScheme: Collection): Promise<number> {
        const isCollectionIndexed = this.globalService.isCollectionIndexed(collectionScheme);
        let documents: SearchData<AddonData>;

        if (isCollectionIndexed) {
            documents = await this.utilities.papiClient.addons.data.search.uuid(config.AddonUUID).table(collectionScheme.Name).post({IncludeCount: true, Fields: ['Hidden'], Where: 'Hidden = false'});
        }
        else {
            const objects = await this.utilities.papiClient.userDefinedCollections.documents(collectionScheme.Name).find({fields: ['Hidden'], page_size: -1});
            documents = {
                Objects: objects || [],
                Count: objects?.length || 0
            }
        }

        return documents.Count || 0;
    }

    async assertDocumentsNumber(collection, documents): Promise<string>{
        const settings: AddonData | undefined = await this.varRelationService.getSettings();
        const indexedCollection = this.globalService.isCollectionIndexed(collection);

        const description: string = `Number of documents in ${collection.Name}`;
        let errorDescription: string;
        if(settings && ((indexedCollection && documents.length > settings[limitationTypes.Documents]) || 
            (!indexedCollection && documents.length > settings[limitationTypes.NotIndexedDocument]))){
            errorDescription = description + ` - Documents number is above limit`
        }
        return description;
    }

    //DIMX
    // for the AddonRelativeURL of the relation
    async importDataSource(body, collectionName) {
        console.log(`@@@@importing documents: ${JSON.stringify(body)}@@@@`);

        let collectionScheme;
        if (this.initData) {
            collectionScheme = this.initData.CollectionScheme;
        } else {
            console.log(`Collection ${collectionName} not provided in Init. GETting it now`);
            collectionScheme = await this.apiService.findCollectionByName(collectionName);
        }
          
        let items = body.DIMXObjects.map(obj => {
            return obj.Object;
        })
        const itemsWithValidation = await this.documentsService.processItemsToSave(collectionScheme, items);
        body.DIMXObjects = itemsWithValidation.map((element, index) => {
            const dimxObject = body.DIMXObjects[index];
            dimxObject.Object = {...element.Item};
            if (!element.ValidationResult.valid) {
                const errors = element.ValidationResult.errors.map(error => {
                    return this.documentsService.getValidationErrorMessage(element, error); 
                });
                dimxObject.Status = 'Error';
                dimxObject.Details = `Document validation failed.\n ${errors.join("\n")}`;
                dimxObject.Key = element.Item.Key;
            }
            return dimxObject;
        })
        console.log('@@@@returned object is:@@@@', JSON.stringify(body));

        return body;
    }

    exportDataSource(body) {
        console.log(`exporting documents: ${JSON.stringify(body)}`);
        return body;
     }

    async hardDelete(collection:string, key: string, force: boolean) {
        return await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(collection).key(key).hardDelete(force);
    }

    async create(collectionsService: CollectionsService, collectionName: string, body: any) {
        try {
            const collection = await collectionsService.findByName(collectionName);
            const itemKey = this.globalService.getItemKey(collection, body);
            const document = await this.documentsService.getDocumentByKey(collectionName, itemKey);
            if (document.Hidden) {
                throw new Error(existingInRecycleBinErrorMessage)
            }
            else {
                throw new Error(existingErrorMessage);
            }
        }
        catch (error) {
            if(error instanceof Error) {
                if (error?.message?.indexOf('Object ID does not exist') >= 0) {
                    const containedArrayLimit = await this.varRelationService.getSettingsByName(limitationTypes.ItemsOfContainedArray);
                    const result = await this.documentsService.upsert(collectionName, body, containedArrayLimit)
                    return result;
                }
            }
            throw error;
        }
    }

    async getDIMXImportInitData(collectionName: string): Promise<DIMXImportInitData> {
        const collectionScheme = await this.apiService.findCollectionByName(collectionName);
        const referenceSchemes = await this.documentsService.getReferenceSchemes(collectionScheme);

        return {
            ReferenceSchemes: referenceSchemes,
            CollectionScheme: collectionScheme
        }
    }

}
