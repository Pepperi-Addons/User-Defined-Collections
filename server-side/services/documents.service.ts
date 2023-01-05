import { AddonDataScheme, Collection } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';
import { UtilitiesService } from './utilities.service';
import { CollectionsService } from './collections.service';
import { existingErrorMessage, existingInRecycleBinErrorMessage, GlobalService, DocumentsService } from 'udc-shared';
import { ApiService } from './api-service';
import { ResourcesService } from './resources-service';

export class ServerDocumentsService {
    
    utilities: UtilitiesService = new UtilitiesService(this.client);
    globalService = new GlobalService();
    apiService = new ApiService(this.client);
    resourcesService = new ResourcesService(this.client);
    documentsService = new DocumentsService(this.apiService, this.resourcesService);
    
    constructor(private client: Client) {
    }
    
    
    async getAllDocumentsCount(collectionsService: CollectionsService): Promise<number> {
        const collections = await collectionsService.find();
        let count = 0;
        await Promise.all(collections.map(async (collection) => {
            const documents = await this.utilities.papiClient.userDefinedCollections.documents(collection.Name).iter().toArray()
            count += documents.length;
        }));

        return count;
    }

    async getDocumentsCountForCollection(collections: AddonDataScheme[]) {
        const retVal: any[] = []
        await Promise.all(collections.map(async (item) => {
            try {
                const documents = await this.utilities.papiClient.userDefinedCollections.documents(item.Name).find({fields: ['Hidden'], page_size: -1});
                if (documents) {
                    retVal.push ({
                        Data: item.Name,
                        Description: `Number of documents in ${item.Name}`,
                        Size: documents.length,
                    })
                }
            }
            catch (err) {
                console.log(`could not get documents for collection ${item.Name}. error: ${err}`)
            }
        }))
        return retVal;
    }

    //DIMX
    // for the AddonRelativeURL of the relation
    async importDataSource(body, collectionName) {
        console.log(`@@@@importing documents: ${JSON.stringify(body)}@@@@`);
        let items = body.DIMXObjects.map(obj => {
            return obj.Object;
        })
        const itemsWithValidation = await this.documentsService.processItemsToSave(collectionName, items);
        body.DIMXObjects = itemsWithValidation.map((element, index) => {
            const dimxObject = body.DIMXObjects[index];
            dimxObject.Object = {...element.Item};
            if (!element.ValidationResult.valid) {
                const errors = element.ValidationResult.errors.map(error => error.stack.replace("instance.", ""));
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
                    const result = await this.documentsService.upsert(collectionName, body)
                    return result;
                }
            }
            throw error;
        }
    }

}
