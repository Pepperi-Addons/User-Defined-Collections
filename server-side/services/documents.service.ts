import { AddonData, AddonDataScheme, Collection, SchemeFieldType } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';
import { UtilitiesService } from './utilities.service';
import { CollectionsService } from './collections.service';
import { DocumentSchema } from '../jsonSchemes/documents';
import { Schema, Validator } from 'jsonschema';

export class DocumentsService {
    
    utilities: UtilitiesService = new UtilitiesService(this.client);
    
    constructor(private client: Client) {
    }
    
    async find(collectionName: any, options: any): Promise<AddonData[]> {
        return await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(collectionName).find(options);
    }
    
    async getDocumentByKey(collectionName: any, key: any): Promise<AddonData> {
        return await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(collectionName).key(key).get();
    }
    
    async upsert(service: CollectionsService, collectionName: any, body: any): Promise<AddonData> {
        const updatingHidden = 'Hidden' in body && body.Hidden;
        const collectionScheme = await service.findByName(collectionName);
        body.Key = await this.utilities.getItemKey(collectionScheme, body);
        const validationResult = this.validateDocument(collectionScheme, body);
        if (validationResult.valid || updatingHidden) {
            return await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(collectionName).upsert(body);
        }
        else {
            const errors = validationResult.errors.map(error => error.stack.replace("instance.", ""));
            throw new Error(errors.join("\n"));
        }
    }

    async checkHidden(body: any) {
        if ('Hidden' in body && body.Hidden) {
            const collectionName = body.Name;
            const items = await this.find(collectionName, {});
            if (items.length > 0) {
                throw new Error('Cannot delete collection with documents');
            }
        }
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
                const documents = await this.utilities.papiClient.userDefinedCollections.documents(item.Name).iter().toArray();
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

    validateDocument(collection: Collection, body: any) {
        const schema = this.createSchema(collection);
        const validator = new Validator();
        const result = validator.validate(body, schema);
        return result;
    }

    createSchema(collection: Collection): Schema {
        let schema: Schema = DocumentSchema;
        Object.keys(collection.Fields!).forEach(fieldName => {
            const field = collection.Fields![fieldName];

            schema.properties![fieldName] = {
                ...this.getFieldSchemaType(field.Type, field.Items?.Type || 'String'),
                required: field.Mandatory
            }
            if (field.OptionalValues && field.OptionalValues.length > 0) {
                if (field.Type === 'Array') {
                    schema.properties![fieldName].items!['enum'] = field.OptionalValues;
                }
                else {
                    schema.properties![fieldName].enum = field.OptionalValues;
                }
            }
        })

        return schema;
    }

    getFieldSchemaType(type: SchemeFieldType, itemsType: SchemeFieldType = 'String'): Schema {
        const retVal: Schema = {};
        switch (type) {
            case 'Array': {
                retVal.type = "array";
                retVal.items = this.getFieldSchemaType(itemsType)
                break;
            }
            case 'Bool': {
                retVal.type = "boolean";
                break;
            }
            case 'Double': 
            case 'Integer': {
                retVal.type = "number";
                break;
            }
            case 'DateTime': {
                retVal.type = "string";
                retVal.format = "date-time";
                break;
            }
            case 'String': {
                retVal.type = "string";
                break;
            }
            case 'Object': {
                retVal.type = "object";
                break;
            }
            default: {
                retVal.type = "string";
            }
        }
        return retVal;
    }

    //DIMX
    // for the AddonRelativeURL of the relation
    async importDataSource(body) {
        console.log(`importing documents: ${JSON.stringify(body)}`);
        return body;
    }

    async exportDataSource(body) {
        console.log(`exporting documents: ${JSON.stringify(body)}`);
        return body;
     }
}
