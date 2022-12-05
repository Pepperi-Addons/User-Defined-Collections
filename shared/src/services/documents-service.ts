import { AddonData, AddonDataScheme, Collection, CollectionField, FindOptions, SchemeFieldType, SearchBody } from "@pepperi-addons/papi-sdk";
import { Schema, Validator } from "jsonschema";
import { ReferenceValidationResult } from "../entities";
import { DocumentSchema } from "../jsonSchemes/documents";
import { IApiService } from "./api-service";
import { GlobalService } from "./global-service";
import { IResourcesServices } from "./resources-service";

export class DocumentsService {
    globalService = new GlobalService();

    constructor(private apiService: IApiService, private resourcesService: IResourcesServices) {}

    async find(collectionName: any, options: any): Promise<AddonData[]> {
        return await this.apiService.find(collectionName, options);
    }
    
    async getDocumentByKey(collectionName: any, key: any): Promise<AddonData> {
        return await this.apiService.getByKey(collectionName, key);
    }
    
    async upsert(collectionName: any, body: any): Promise<AddonData> {
        const updatingHidden = 'Hidden' in body && body.Hidden;
        const collectionScheme = await this.apiService.findCollectionByName(collectionName);
        body.Key = this.globalService.getItemKey(collectionScheme, body);
        const validationResult = await this.validateDocument(collectionScheme, body);
        if (validationResult.valid || updatingHidden) {
            return await this.apiService.upsert(collectionName, body);
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

    async validateDocument(collection: Collection, body: any) {
        const referenceResult = await this.validateReference(collection.Fields!, body);
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

    async search(collectionName: string, body: SearchBody): Promise<AddonData[]> {
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
        const options: FindOptions = {
            fields: body.Fields ? body.Fields : undefined,
            where: whereClause,
            page: body.Page,
            page_size: body.PageSize,
        }
        return await this.find(collectionName, options);
    }

    getWhereClaus(fieldID: string, fieldValues: string[]): string{
        return fieldValues.reduce((previous, current, index) => {
            const clause = `${fieldID} = '${current}'`;
            return index == 0 ? clause : previous + `OR ${clause}`;
        })
    }

    async validateReference(schemeFields: {[key:string]: CollectionField}, document: AddonData): Promise<ReferenceValidationResult> {
        let valid = true;
        const errors: string[] = [];
        await Promise.all(Object.keys(schemeFields).map(async(field) => {
            if (schemeFields[field].Type === 'Object' && field in document) {
                const result:ReferenceValidationResult = await this.validateReference(schemeFields[field].Fields!, document[field]);
                errors.push(...result.Errors);
                document[field] = result.Document;
            }
            else if(schemeFields[field].Type == 'Array' && schemeFields[field].Items?.Type === 'Object' && (field in document && document[field].length > 0)) {
                let arr = [...document[field]];
                document[field] = [];
                for await (let item of arr) {
                    const result:ReferenceValidationResult = await this.validateReference(schemeFields[field].Items!.Fields!, item);
                    errors.push(...result.Errors);
                    document[field].push(result.Document);
                }
            }
            const resourceName = schemeFields[field].Resource || ""
            if (schemeFields[field].Type === 'Resource') {
                if (resourceName != "") {
                    // TBD - remove once getByKey on abstract scheme will work
                    // if the reference is for schema of type 'abstract' don't validate.
                    const resourceScheme = await this.resourcesService.getByKey('resources', resourceName) as AddonDataScheme;
                    if (resourceScheme && resourceScheme.Type !== 'abstract') {
                        if (field in document) {
                            valid = await this.getReferencedObject(document[field], resourceName) != undefined;
                        }
                        else {
                            document = await this.checkUniqueFields(resourceName, document, field);
                            valid = document[field] != ""; // if reference field has value than the reference is valid
                        }
                    }
                    else {
                        valid = true
                    }
                }
                else {
                    console.log(`Resource on field ${field} is empty. cannot verify reference`);
                    valid = false;
                }
            }
            else {
                if (schemeFields[field].Type === 'Array' && schemeFields[field].Items!.Type === 'Resource') {
                    if (resourceName != "") {
                        // TBD - remove once getByKey on abstract scheme will work
                        // if the reference is for schema of type 'abstract' don't validate.
                        const resourceScheme = await this.resourcesService.getByKey('resources', resourceName) as AddonDataScheme;
                        if (resourceScheme && resourceScheme.Type !== 'abstract') {
                            if(field in document && document[field].length > 0) {
                                valid = (await this.getReferencedObjects(document[field], resourceName)).length ===  document[field].length;
                            }
                        }
                        else {
                            valid = true;
                        }
                    }
                    else {
                        console.log(`Resource on field ${field} is empty. cannot verify reference`);
                        valid = false;
                    }
                }    
            }
            if(!valid) {
                errors.push(`Field ${field} contains broken reference`);
            }
        }))
        return {
            Errors: errors, 
            Document: document
        };
    }

    async getReferencedObject(objKey: string, collectionName: string): Promise<AddonData | undefined> {
        let item: AddonData | undefined = undefined;
        try {
            item = await this.resourcesService.getByKey(collectionName, objKey);
        }
        catch (err) {
            console.log(`Could not get item ${objKey} from collection ${collectionName}`);
        }
        return item;
    }

    async getReferencedObjects(objKeys: string[], collectionName: string): Promise<AddonData[]> {
        let items: AddonData[] = [];
        try {
            items = await this.resourcesService.search(collectionName, {
                KeyList: objKeys,
            });
        }
        catch (err) {
            console.log(`Could not get the following items ${objKeys} from collection ${collectionName}`);
        }
        return items;
    }

    async getReferencedObjectByUniqueField(fieldID: string, fieldValue:string, collectionName: string): Promise<AddonData | undefined> {
        let item: AddonData | undefined = undefined;
        try {
            item = await this.resourcesService.getByUniqueField(collectionName, fieldID, fieldValue);
        }
        catch (err) {
            console.log(`Could not get item ${fieldID} from collection ${collectionName}`);
        }
        return item;
    }

    async checkUniqueFields(resourceName: string, document: AddonData, referenceField: string): Promise<AddonData> {
        try {
            const scheme = await this.resourcesService.getByKey('resources', resourceName);
            const uniqueFields = Object.keys(scheme.Fields).filter((field: string) => scheme.Fields[field].Unique);
            let fieldsInDocument: string[] = []; // we don't want to have more than one unique field on a document, so we counting.
            await Promise.all(uniqueFields.map(async (field) => {
                const fieldID = `${referenceField}.${field}`;
                if (fieldID in document) {
                    fieldsInDocument.push(fieldID);
                    if(fieldsInDocument.length <= 1) {
                        const item = await this.getReferencedObjectByUniqueField(field, document[fieldID], resourceName);
                        if (item) {
                            // if we found the item using the unique field, we need to replace the unique field with the item key
                            document[referenceField] = item.Key || "";
                            delete document[fieldID];
                        }
                    }
                    else {
                        throw new Error(`Document cannot contain more than 1 unique field, fields: ${fieldsInDocument.join(',')}`)
                    }
                }
            }));
        }
        catch (err) {
            console.log(`could not get generic scheme with name ${resourceName}, got exception ${JSON.stringify(err)}`);
            if (err instanceof Error && err.message.indexOf('Document cannot contain more than 1 unique field') > -1) {
                throw err;
            }
        }
        return document;
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
        Object.keys(fields).forEach(fieldName => {
            const field = fields[fieldName];
            // validate only fields that are not coming from base schema
            if (field.ExtendedField === false) {
                if (field.Type === 'Object') {
                    propertiesScheme[fieldName] = {
                        type: 'object',
                        required: field.Mandatory,
                        properties: {
                            ...this.createObjectScheme(field.Fields!)
                        }
                    }
                }
                else if((field.Type === 'Array' && field.Items!.Type === 'Object')) {
                    propertiesScheme[fieldName] = {
                        type: 'array',
                        required: field.Mandatory,
                        items:{
                            type: 'object',
                            properties: {
                                ...this.createObjectScheme(field.Items!.Fields!)
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
    
}

export default DocumentsService;