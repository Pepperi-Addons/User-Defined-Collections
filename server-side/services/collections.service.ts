import { UtilitiesService } from './utilities.service';
import { AddonDataScheme, Collection } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';
import { DimxRelations, UdcMappingsScheme} from '../metadata';
import { DocumentsService } from './documents.service';
import { Validator, ValidatorResult } from 'jsonschema';
import { collectionSchema, documentKeySchema, dataViewSchema, fieldsSchema } from '../jsonSchemes/collections';
export class CollectionsService {
        
    utilities: UtilitiesService = new UtilitiesService(this.client);

    constructor(private client: Client) {
    }

    
    async upsert(service: DocumentsService, body: any) {
        const collectionObj = {
            Type: "meta_data",
            ...body,
        }
        const updatingHidden = 'Hidden' in body && body.Hidden;
        const validResult = this.validateScheme(body);
        if (validResult.valid || updatingHidden) {
            await service.checkHidden(body);
            const collection = await this.utilities.papiClient.addons.data.schemes.post(collectionObj);
            await this.createDIMXRelations(collection.Name);
            return collection;
        }
        else {
            const errors = validResult.errors.map(error => error.stack.replace("instance.", ""));
            throw new Error(errors.join("\n"));
        }
    }

    validateScheme(collection: Collection): ValidatorResult {
        const validator = new Validator();
        documentKeySchema.properties!['Fields'].items!['enum'] = Object.keys(collection.Fields || {});
        validator.addSchema(documentKeySchema, "/DocumentKey");
        validator.addSchema(fieldsSchema, "/Fields");
        validator.addSchema(dataViewSchema, "/DataView");
        const result = validator.validate(collection, collectionSchema);
        return result;
    }
    
    async findByName(tableName:string): Promise<Collection> {
        return await this.utilities.papiClient.addons.data.schemes.name(tableName).get() as Collection;
    }
    
    async find(options: any = {}): Promise<AddonDataScheme[]> {
        let collections = await this.utilities.papiClient.addons.data.schemes.get(options);
        return collections.filter(collection => collection.Name !== UdcMappingsScheme.Name);
    }

    async createDIMXRelations(collectionName: string) {
        await Promise.all(DimxRelations.map(async (singleRelation) => {
            // overide the name with the collectionName
            singleRelation.Name = collectionName;
            await this.utilities.papiClient.addons.data.relations.upsert(singleRelation);
        }));
    }
}

