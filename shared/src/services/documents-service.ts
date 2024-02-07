import { AddonData, AddonDataScheme, Collection, CollectionField, SearchData, SchemeFieldType, SearchBody } from "@pepperi-addons/papi-sdk";
import { Schema, Validator } from "jsonschema";
import { CollectionFields, DIMXImportInitData, ReferenceSchemes, ReferenceValidationResult } from "../entities";
import { DocumentSchema } from "../jsonSchemes/documents";
import { IApiService } from "./api-service";
import { GlobalService } from "./global-service";
import { ReferenceService } from "./reference-service";
import { IResourcesServices } from "./resources-service";
import { SchemesService } from "./schemes-service";


export class DocumentsService {
    globalService = new GlobalService();
    referencesService: ReferenceService;
    private schemesService: SchemesService;
    private containedLimit: number | undefined;

    constructor(private apiService: IApiService, private resourcesService: IResourcesServices, private initData?: DIMXImportInitData) {
        this.schemesService = new SchemesService(apiService);
        this.referencesService = new ReferenceService(resourcesService, initData?.ReferenceSchemes);
    }

    async find(collectionName: any, options: any): Promise<AddonData> {
        return await this.apiService.find(collectionName, options);
    }
    
    async getDocumentByKey(collectionName: any, key: any): Promise<AddonData> {
        return await this.apiService.getByKey(collectionName, key);
    }
    
    async upsert(collectionName: any, body: any, containedLimit?: number): Promise<AddonData> {
        const collectionScheme = await this.apiService.findCollectionByName(collectionName);
        const indexedCollection = this.globalService.isCollectionIndexed(collectionScheme)
        this.containedLimit = containedLimit;
        const item = (await this.processItemsToSave(collectionScheme, [body]))[0];
        if (item.ValidationResult.valid) {
            return await this.apiService.upsert(collectionName, item.Item, indexedCollection);
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

    async validateDocument(collection: Collection, body: any, collectionFields: CollectionFields) {
        const referenceResult = this.validateReference(collectionFields, body);
        body = { ...referenceResult.Document };
        const schema = await this.createSchema(collection);
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
            // if (body.KeyList && body.KeyList.length > 0) {
            //     whereClause = this.getWhereClaus('Key', body.KeyList);
            // }
            //else 
            if(body.UniqueFieldList && body.UniqueFieldList.length > 0) {
                // DI-23437 - because ADAL does not allow where clause on 'Key' to contain 'OR' operator, we are converting it to 'KeyList'
                if(body.UniqueFieldID === 'Key') {
                    body.KeyList = [...body.UniqueFieldList]
                }
                else {
                    whereClause = this.getWhereClaus(body.UniqueFieldID!, body.UniqueFieldList);
                    body.Where = whereClause;
                }
            }
        }
        return await this.apiService.search(collectionName, body);
    }

    getWhereClaus(fieldID: string, fieldValues: string[]): string{
        return fieldValues.reduce((previous, current, index) => {
            const clause = `${fieldID} = '${current}'`;
            return index == 0 ? clause : previous + ` OR ${clause}`;
        }, '')
    }

    validateReference(schemeFields: CollectionFields, document: AddonData): ReferenceValidationResult {
        let valid = true;
        const errors: string[] = [];
        Object.keys(document).forEach(prop => {
            try {
                let fieldValue = document[prop];
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
                    errors.push(`${prop} with value ${fieldValue} contains broken reference`);
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

    async createSchema(collection: Collection): Promise<Schema> {
        const schema: Schema = {
            $id: DocumentSchema.$id,
            description: DocumentSchema.description,
            type: 'object',
            properties: {
                ...DocumentSchema.properties,
                ...await this.createObjectScheme(collection.Fields!)
            }
        };
        
        return schema;
    }
    
    async createObjectScheme(fields: { [key: string]:CollectionField}) {
        const propertiesScheme = {};
        for(let fieldName of Object.keys(fields || {})) {
            const field = fields[fieldName];
            // validate only fields that are not coming from base schema
            if (!field.ExtendedField) {
                if (field.Type === 'ContainedResource') {
                    const collectionScheme = await this.schemesService.getResource(field.Resource!);
                    const properties = await this.createObjectScheme(collectionScheme.Fields || {});

                    propertiesScheme[fieldName] = {
                        type: 'object',
                        required: field.Mandatory,
                        properties: {
                            ...properties
                        }
                    }
                }
                else if((field.Type === 'Array' && field.Items!.Type === 'ContainedResource')) {
                    const collectionScheme = await this.schemesService.getResource(field.Resource!);
                    const properties = await this.createObjectScheme(collectionScheme.Fields || {});

                    propertiesScheme[fieldName] = {
                        type: 'array',
                        required: field.Mandatory,
                        items:{
                            type: 'object',
                            properties: {
                                ...properties
                            }
                        }
                    }
                    if(this.containedLimit){
                        propertiesScheme[fieldName]['maxItems'] = this.containedLimit;
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
        }

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

    async getReferenceSchemes(collectionScheme: Collection): Promise<ReferenceSchemes> {
        const collectionFields = collectionScheme.Fields || {};
        return await this.referencesService.getReferenceSchemes(collectionFields);
    }

    async processItemsToSave(collectionScheme: Collection, items: AddonData[]) {
        const collectionFields = collectionScheme.Fields || {};
        items = (await this.referencesService.handleDotAnnotationItems(collectionFields, items));
        const promises = items.map(async item => {
            const updatingHidden = 'Hidden' in item && item.Hidden;
            item.Key = this.globalService.getItemKey(collectionScheme, item);
            const validationResult = await this.validateDocument(collectionScheme, item, collectionFields);

            return {
                Item: item,
                ValidationResult: {
                    ...validationResult,
                    valid: validationResult.valid || updatingHidden
                },
            }
        });

        return Promise.all(promises);
    }
    
}

export default DocumentsService;