import { AddonData, AddonDataScheme, Collection, CollectionField, SearchData, SchemeFieldType, SearchBody } from "@pepperi-addons/papi-sdk";
import { Schema, Validator } from "jsonschema";
import { CollectionFields, ReferenceValidationResult } from "../entities";
import { DocumentSchema } from "../jsonSchemes/documents";
import { IApiService } from "./api-service";
import { GlobalService } from "./global-service";
import { ReferenceService } from "./reference-service";
import { IResourcesServices } from "./resources-service";

export class DocumentsService {
    globalService = new GlobalService();
    referencesService: ReferenceService = new ReferenceService(this.resourcesService);

    constructor(private apiService: IApiService, private resourcesService: IResourcesServices) {}

    async find(collectionName: any, options: any): Promise<AddonData> {
        return await this.apiService.find(collectionName, options);
    }
    
    async getDocumentByKey(collectionName: any, key: any): Promise<AddonData> {
        return await this.apiService.getByKey(collectionName, key);
    }
    
    async upsert(collectionName: any, body: any): Promise<AddonData> {
        const updatingHidden = 'Hidden' in body && body.Hidden;
        const item = (await this.processItemsToSave(collectionName, [body]))[0];
        if (item.ValidationResult.valid || updatingHidden) {
            return await this.apiService.upsert(collectionName, item.Item);
        }
        else {
            const errors = item.ValidationResult.errors.map(error => error.stack.replace("instance.", ""));
            throw new Error(errors.join("\n"));
        }
    }

    async checkHidden(body: any) {
        if ('Hidden' in body && body.Hidden) {
            const collectionName = body.Name;
            const items = await this.search(collectionName, {});
            if (items.Objects.length > 0) {
                throw new Error('Cannot delete collection with documents');
            }
        }
    }

    validateDocument(collection: Collection, body: any, collectionFields: CollectionFields) {
        const referenceResult = this.validateReference(collectionFields, body);
        body = { ...referenceResult.Document };
        const schema = this.createSchema(collection);
        console.log(`validating document ${JSON.stringify(body)} for collection ${collection.Name}. schema is ${JSON.stringify(schema)}`);
        const validator = new Validator();
        const result = validator.validate(body, schema);
        if(referenceResult.Errors.length > 0) {
            referenceResult.Errors.forEach(error => {
                result.addError(error);
            })
        }
        return result;
    }

    async search(collectionName: string, body: SearchBody): Promise<SearchData<AddonData>> {
        let whereClause = '';
        if(!body.Where) {
            if (body.KeyList && body.KeyList.length > 0) {
                whereClause = this.getWhereClaus('Key', body.KeyList);
            }
            else if(body.UniqueFieldsList && body.UniqueFieldsList.length > 0) {
                whereClause = this.getWhereClaus(body.UniqueFieldID!, body.UniqueFieldsList);
            }
        }
        else {
            whereClause = body.Where;
        }
        return await this.apiService.search(collectionName, body);
    }

    getWhereClaus(fieldID: string, fieldValues: string[]): string{
        return fieldValues.reduce((previous, current, index) => {
            const clause = `${fieldID} = '${current}'`;
            return index == 0 ? clause : previous + `OR ${clause}`;
        })
    }

    validateReference(schemeFields: CollectionFields, document: AddonData): ReferenceValidationResult {
        let valid = true;
        const errors: string[] = [];
        Object.keys(document).forEach(prop => {
            try {
                const refField = this.referencesService.referenceFields.find(item => item.FieldID === prop);
                // if the property name include a dot, than we have reference with unique field.
                // because we already populated all the referenced items, we can check for the existance of the reference field on the object
                // if he exists, this means that we were able to retrieve the item using the unique field
                if(prop.indexOf('.') > 0) {
                    const parts = prop.split('.');
                    if (parts.length === 2) {
                        valid = document[parts[0]] ? true : false;
                        // after validation we can remove the dot annotation field so it won't stay on the document
                        delete document[prop];
                    }
                    else {
                        valid = false;
                    }
                }
                // if this propery exist on the reference fields, check the item he references exist
                else if (refField) {
                    const item = this.referencesService.getItemByUniqueField(refField.ResourceName, 'Key', document[prop]);
                    valid = item ? true : false;
                }
                else {
                    valid = true;
                }
                if (!valid) {
                    errors.push(`Field ${prop} contains broken reference`);
                }
            }
            catch (err) {
                console.log(`could not validate ${prop}. got error ${JSON.stringify(err)}`);
            }
        })
        return {
            Errors: errors, 
            Document: document
        };
    }

    createSchema(collection: Collection): Schema {
        const schema: Schema = {
            $id: DocumentSchema.$id,
            description: DocumentSchema.description,
            type: 'object',
            properties: {
                ...DocumentSchema.properties,
                ...this.createObjectScheme(collection.Fields!)
            }
        };
        
        return schema;
    }
    
    createObjectScheme(fields: { [key: string]:CollectionField}) {
        const propertiesScheme = {};
        Object.keys(fields || {}).forEach(fieldName => {
            const field = fields[fieldName];
            // validate only fields that are not coming from base schema
            if (!field.ExtendedField) {
                if (field.Type === 'ContainedResource') {
                    propertiesScheme[fieldName] = {
                        type: 'object',
                        required: field.Mandatory,
                        properties: {
                            ...this.createObjectScheme(field.Fields || {})
                        }
                    }
                }
                else if((field.Type === 'Array' && field.Items!.Type === 'ContainedResource')) {
                    propertiesScheme[fieldName] = {
                        type: 'array',
                        required: field.Mandatory,
                        items:{
                            type: 'object',
                            properties: {
                                ...this.createObjectScheme(field.Items!.Fields || {})
                            }
                        }
                    }
                }
                else {
                    propertiesScheme[fieldName] = {
                        ...this.getFieldSchemaType(field.Type, field.Items?.Type || 'String'),
                        required: field.Mandatory
                    }
                    if (field.OptionalValues && field.OptionalValues.length > 0) {
                        if (field.Type === 'Array') {
                            propertiesScheme[fieldName].items!['enum'] = field.OptionalValues;
                        }
                        else {
                            propertiesScheme[fieldName].enum = field.OptionalValues;
                        }
                    }
                }
            }
        })

        return propertiesScheme;
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
            case 'Object': 
            case 'ContainedResource': {
                retVal.type = "object";
                break;
            }
            default: {
                retVal.type = "string";
            }
        }
        return retVal;
    }

    async processItemsToSave(collectionName: string, items: AddonData[]) {
        const collectionScheme = await this.apiService.findCollectionByName(collectionName);
        const collectionFields = collectionScheme.Fields || {};
        items = (await this.referencesService.handleDotAnnotationItems(collectionFields, items));
        return items.map(item => {
            item.Key = this.globalService.getItemKey(collectionScheme, item);
            const validationResult = this.validateDocument(collectionScheme, item, collectionFields);
            return {
                Item: item,
                ValidationResult: validationResult
            }
        });
    }
    
}

export default DocumentsService;