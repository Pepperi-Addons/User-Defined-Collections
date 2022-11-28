import { UtilitiesService } from './utilities.service';
import { AddonDataScheme, Collection, FindOptions } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';
import { ADAL_UUID, AtdRelations, DataQueryRelation, DimxRelations, EXPORT_FUNCTION_NAME, IMPORT_FUNCTION_NAME, UdcMappingsScheme} from '../metadata';
import { Validator, ValidatorResult } from 'jsonschema';
import { collectionSchema, documentKeySchema, dataViewSchema, fieldsSchema } from '../jsonSchemes/collections';
import { existingErrorMessage, existingInRecycleBinErrorMessage, DocumentsService, collectionNameRegex } from 'udc-shared';
export class CollectionsService {
        
    utilities: UtilitiesService = new UtilitiesService(this.client);

    constructor(private client: Client) {
    }

    
    async upsert(service: DocumentsService, body: Collection) {
        const collectionObj: any = {
            Type: body.Type || 'data',
            GenericResource: true,
            ...body,
            UserDefined: true,
        }
        if (!collectionObj.DocumentKey || !collectionObj.DocumentKey.Type) {
            collectionObj.DocumentKey = {
                Type: 'Key'
            }
        }
        const updatingHidden = 'Hidden' in body && body.Hidden;
        const collectionForValidation = this.removeExtensionFields(collectionObj);
        const validResult = this.validateScheme(collectionForValidation);
        const errors: string[] = []
        if (validResult.valid || updatingHidden) {
            await service.checkHidden(body);
            const fieldsValid = await this.validateFieldsType(collectionObj);
            if (fieldsValid.size === 0) {
                const collection = await this.utilities.papiClient.addons.data.schemes.post(collectionObj);
                await this.createDIMXRelations(collection.Name);
                if(collection.Type !== 'contained') {
                    await this.createDataQueryRelations(collection);
                }
                return collection;
            }
            else {
                for (const [key, value] of fieldsValid) {
                    errors.push(`field ${key} already exist with different type on the following collections: ${value.join(',')}. Please change the field's type.`);
                }
            }
        }
        else {
            validResult.errors.forEach(error => {
                if (error.name === 'additionalProperties' && error.property === 'instance.Fields') {
                    errors.push(`Field ${error.argument} must start with lowercase letter, and can only contains URL safe characters`);
                }
                else if (error.name === 'pattern' && error.property === 'instance.Name') {
                    errors.push(`collection name must begin with capital letter, and can only contains URL safe characters`);
                }
                else {
                    errors.push(error.stack.replace("instance.", ""));
                }
            });
        }
        throw new Error(errors.join("\n"));
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
            const functionName = singleRelation.RelationName == 'DataImportResource' ? IMPORT_FUNCTION_NAME : EXPORT_FUNCTION_NAME;
            singleRelation.Name = collectionName;
            singleRelation.AddonRelativeURL = `/api/${functionName}?collection_name=${collectionName}`
            await this.utilities.papiClient.addons.data.relations.upsert(singleRelation);
        }));
    }
    
    async createDataQueryRelations(collection: AddonDataScheme) {
        for (let relation of DataQueryRelation) {
            relation.Name = collection.Name;
            relation.AddonRelativeURL = `/addons/shared_index/index/${this.client.AddonUUID}_data/search/${ADAL_UUID}/${collection.Name}`;
            relation.SchemaRelativeURL = `/addons/api/${this.client.AddonUUID}/api/collection_fields?collection_name=${collection.Name}`;
            Object.keys(collection.Fields || {}).forEach((fieldName) => {
                const collectionField = collection.Fields![fieldName];
                if (collectionField.Type === 'Resource') {
                    if (collectionField.Resource === 'accounts' && fieldName === 'account') {
                        relation.AccountFieldID = 'UUID',
                        relation.IndexedAccountFieldID = `${fieldName}.Key`
                    }
                    if (collectionField.Resource === 'users' && fieldName === 'user') {
                        relation.UserFieldID = 'UUID',
                        relation.IndexedUserFieldID = `${fieldName}.Key`
                    }
                }
            })

            await this.utilities.papiClient.addons.data.relations.upsert(relation);
        }
    }

    async hardDelete(collectionName: string, force: boolean) {
        const collection = await this.findByName(collectionName);
        if (force || collection.Hidden) {
            return await this.utilities.papiClient.post(`/addons/data/schemes/${collectionName}/purge`);
        }
        else {
            throw new Error('Cannot delete non hidden collection.')
        }
    }
    
    async create(documentsService: DocumentsService, collectionName: string, body: any) {
        try {
            const regex = new RegExp(collectionNameRegex);
            if(regex.test(collectionName)) {
                const collection = await this.findByName(collectionName);
                if (collection.Hidden) {
                    throw new Error(existingInRecycleBinErrorMessage);
                }
                else {
                    throw new Error(existingErrorMessage);
                }
            }
            else {
               throw new Error('collection name must begin with capital letter, and can only contains URL safe characters') 
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

    async validateFieldsType(collectionObj: Collection) {
        let validMap = new Map();
        const collections = await this.find({ include_deleted: true, where: `Name != ${collectionObj.Name}` });
        // only check for field's type when there are Fields on the collection
        if (collectionObj.Fields) {
            for (const fieldID of Object.keys(collectionObj.Fields!)) {
                collections.forEach((collection => {
                    if (collection.Fields && collection.Fields[fieldID]) {
                        // if one of the collection has a field with the same ID, check to see if it's the same type.
                        if (collectionObj.Fields![fieldID].Type != collection.Fields![fieldID].Type) { 
                            this.addFieldToMap(validMap, fieldID, collection.Name);
                        }
                        // If they both of type 'Array' check their item's type.
                        else if (collectionObj.Fields![fieldID].Type === 'Array' && collectionObj.Fields![fieldID].Items!.Type != collection.Fields![fieldID].Items!.Type) {
                            this.addFieldToMap(validMap, fieldID, collection.Name);                    
                        }
                    }
                }));
            }
        }
        return validMap;
    }
    
    addFieldToMap(map, fieldID, collectionName) {
        const list = map.get(fieldID);
        if (!list) {
            map.set(fieldID, [collectionName]);
        } else {
            list.push(collectionName);
        }
    }

    removeExtensionFields(collection: Collection): Collection {
        const ret: Collection = {...collection};
        // empty return object Fields & ListView properties to reconstruct it without extension fields
        ret.Fields = {};
        if (ret.ListView) {
            ret.ListView.Fields = [];
            ret.ListView.Columns = [];
        }

        Object.keys(collection.Fields || {}).forEach(field => {
            if (collection.Fields![field]['ExtendedField'] === false) {
                ret.Fields![field] = collection.Fields![field];
                if(collection.ListView && collection.ListView.Fields) {
                    const dvField = collection.ListView.Fields.find(x => x.FieldID === field);
                    if (dvField) {
                        ret.ListView!.Fields!.push(dvField);
                        ret.ListView!.Columns!.push({
                            Width: 10
                        })
                    }
                }
            }
        })

        return ret;
    }
}

