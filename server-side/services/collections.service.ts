import { UtilitiesService } from './utilities.service';
import { AddonDataScheme, Collection, FindOptions } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';
import { DimxRelations, UdcMappingsScheme} from '../metadata';
import { DocumentsService } from './documents.service';
import { Validator, ValidatorResult } from 'jsonschema';
import { collectionSchema, documentKeySchema, dataViewSchema, fieldsSchema } from '../jsonSchemes/collections';
import { existingErrorMessage, existingInRecycleBinErrorMessage } from 'udc-shared';
export class CollectionsService {
        
    utilities: UtilitiesService = new UtilitiesService(this.client);

    constructor(private client: Client) {
    }

    
    async upsert(service: DocumentsService, body: any) {
        const collectionObj = {
            Type: "meta_data",
            ...body,
        }
        if (!collectionObj.DocumentKey || !collectionObj.DocumentKey.Type) {
            collectionObj.DocumentKey = {
                Type: 'Key'
            }
        }
        const updatingHidden = 'Hidden' in body && body.Hidden;
        const validResult = this.validateScheme(collectionObj);
        console.log(validResult);
        if (validResult.valid || updatingHidden) {
            await service.checkHidden(body);
            const collection = await this.utilities.papiClient.addons.data.schemes.post(collectionObj);
            await this.createDIMXRelations(collection.Name);
            return collection;
        }
        else {
            const errors = validResult.errors.map(error => {
                if (error.name === 'additionalProperties' && error.instance === 'instance.Fields') {
                    return `Field ${error.argument} contains forbidden characters`;
                }
                else {
                    return error.stack.replace("instance.", "");
                }
            });
            throw new Error(errors.join("\n"));
        }
    }

    validateScheme(collection: Collection): ValidatorResult {
        const validator = new Validator();
        documentKeySchema.properties!['Fields'].items!['enum'] = Object.keys(collection.Fields || {});
        dataViewSchema.properties!['Fields'].items!['properties']['FieldID']['enum'] = Object.keys(collection.Fields || {});
        validator.addSchema(documentKeySchema, "/DocumentKey");
        validator.addSchema(fieldsSchema, "/Fields");
        validator.addSchema(dataViewSchema, "/DataView");
        const result = validator.validate(collection, collectionSchema);
        return result;
    }
    
    async findByName(tableName:string): Promise<Collection> {
        return await this.utilities.papiClient.addons.data.schemes.name(tableName).get() as Collection;
    }
    
    async find(options: FindOptions = {}): Promise<AddonDataScheme[]> {
        let collections = await this.utilities.papiClient.addons.data.schemes.get(options);
        return collections.filter(collection => collection.Name !== UdcMappingsScheme.Name);
    }

    async createDIMXRelations(collectionName: string) {
        await Promise.all(DimxRelations.map(async (singleRelation) => {
            // overide the name with the collectionName
            singleRelation.Name = collectionName;
            singleRelation.AddonRelativeURL = singleRelation.AddonRelativeURL?.replace('{collection_name}', collectionName);
            await this.utilities.papiClient.addons.data.relations.upsert(singleRelation);
        }));
    }

    async hardDelete(collectionName: string, force: boolean) {
        const collection = await this.findByName(collectionName);
        if (collection.Type !== 'cpi_meta_data') {
            if (force || collection.Hidden) {
                return await this.utilities.papiClient.post(`/addons/data/schemes/${collectionName}/purge`);
            }
            else {
                throw new Error('Cannot delete non hidden collection.')
            }
        }
        else {
            throw new Error('Cannot delete offline collections');
        }
    }
    
    async create(documentsService: DocumentsService, collectionName: string, body: any) {
        try {
            const collection = await this.findByName(collectionName);
            if (collection.Hidden) {
                throw new Error(existingInRecycleBinErrorMessage);
            }
            else {
                throw new Error(existingErrorMessage);
            }
        }
        catch (error) {
            if(error instanceof Error) {
                if (error?.message?.indexOf('Object ID does not exist') >= 0) {
                    const result = await this.upsert(documentsService, body)
                    return result;
                }
            }
            throw error;
        }
    }
}

