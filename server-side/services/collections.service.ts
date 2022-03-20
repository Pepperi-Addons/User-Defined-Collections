import { UtilitiesService } from './utilities.service';
import { PapiClient, AddonDataScheme, Collection } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';
import { DimxRelations } from '../metadata';
import { DocumentsService } from './documents.service';
import { Validator, ValidatorResult } from 'jsonschema';
import { collectionSchema, documentKeySchema, dataViewSchema, fieldsSchema } from '../jsonSchemes/collections';
export class CollectionsService {
        
    utilities: UtilitiesService = new UtilitiesService(this.client);

    constructor(private client: Client) {
    }

    
    async upsertCollection(service: DocumentsService, body: any) {
        const collectionObj = {
            ...body,
            Type: "meta_data"
        }
        const validResult = this.validateScheme(body);
        if(validResult.valid) {
            await service.checkHidden(body);
            const collection = await this.utilities.papiClient.addons.data.schemes.post(collectionObj);
            await this.createDIMXRelations(collection.Name);
            return collection;
        }
        else {
            return validResult.errors.map(error => error.stack.replace("instance.", ""));
        }
    }

    validateScheme(collection: Collection): ValidatorResult {
        const validator = new Validator();
        documentKeySchema.properties!['Fields'].enum = Object.keys(collection.Fields || {});
        validator.addSchema(documentKeySchema, "/DocumentKey");
        validator.addSchema(fieldsSchema, "/Fields");
        validator.addSchema(dataViewSchema, "/DataView");
        const result = validator.validate(collection, collectionSchema);
        return result;
    }
    
    async getCollection(tableName:string): Promise<Collection> {
        return await this.utilities.papiClient.addons.data.schemes.name(tableName).get() as Collection;
    }
    
    async getAllCollections(options: any = {}): Promise<AddonDataScheme[]> {
        return await this.utilities.papiClient.addons.data.schemes.get(options);
    }

    async createDIMXRelations(collectionName: string) {
        await Promise.all(DimxRelations.map(async (singleRelation) => {
            // overide the name with the collectionName
            singleRelation.Name = collectionName;
            await this.utilities.papiClient.addons.data.relations.upsert(singleRelation);
        }));
    }
}

