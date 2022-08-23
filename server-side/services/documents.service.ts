import { AddonData, AddonDataScheme, Collection, SchemeField, FindOptions, SchemeFieldType, SearchBody, CollectionField } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';
import { UtilitiesService } from './utilities.service';
import { CollectionsService } from './collections.service';
import { DocumentSchema } from '../jsonSchemes/documents';
import { Schema, Validator, ValidatorResult } from 'jsonschema';
import { existingErrorMessage, existingInRecycleBinErrorMessage, ReferenceValidationResult } from 'udc-shared';

export class DocumentsService {
    
    utilities: UtilitiesService = new UtilitiesService(this.client);
    
    constructor(private client: Client) {
    }
    
    async find(collectionName: any, options: any): Promise<AddonData[]> {
        return await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(collectionName).find(options);
    }
    
    async getDocumentByKey(collectionName: any, key: any): Promise<AddonData> {
        return await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(collectionName).key(encodeURIComponent(key)).get();
    }
    
    async upsert(service: CollectionsService, collectionName: any, body: any): Promise<AddonData> {
        const updatingHidden = 'Hidden' in body && body.Hidden;
        const collectionScheme = await service.findByName(collectionName);
        body.Key = this.utilities.getItemKey(collectionScheme, body);
        const validationResult = await this.validateDocument(collectionScheme, body);
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
    async importDataSource(body, collection: Collection) {
        console.log(`@@@@importing documents: ${JSON.stringify(body)}@@@@`);
        body.DIMXObjects = await Promise.all(body.DIMXObjects.map(async (item) => {
            const itemKey = this.utilities.getItemKey(collection, item.Object);
            item.Object.Key = itemKey;
            console.log(`@@@@item key got from function is ${itemKey}`);
            const validationResult = await this.validateDocument(collection, item.Object);
            if (!validationResult.valid) {
                const errors = validationResult.errors.map(error => error.stack.replace("instance.", ""));
                item.Status = 'Error';
                item.Details = `Document validation failed.\n ${errors.join("\n")}`;
                item.Key = itemKey;
            }
            return item;
        }));
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
            const itemKey = this.utilities.getItemKey(collection, body);
            const document = await this.getDocumentByKey(collectionName, itemKey);
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
                    const result = await this.upsert(collectionsService, collectionName, body)
                    return result;
                }
            }
            throw error;
        }
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
                    if (field in document) {
                        valid = await this.getReferencedObject(document[field], resourceName) != undefined;
                    }
                    else {
                        document = await this.checkUniqueFields(resourceName, document, field);
                        valid = document[field] != ""; // if reference field has value than the reference is valid
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
                        if(field in document && document[field].length > 0) {
                            valid = (await this.getReferencedObjects(document[field], resourceName)).length ===  document[field].length;
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
            item = await this.utilities.papiClient.resources.resource(collectionName).key(objKey).get();
        }
        catch (err) {
            console.log(`Could not get item ${objKey} from collection ${collectionName}`);
        }
        return item;
    }

    async getReferencedObjects(objKeys: string[], collectionName: string): Promise<AddonData[]> {
        let items: AddonData[] = [];
        try {
            items = await this.utilities.papiClient.resources.resource(collectionName).search({
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
            item = await this.utilities.papiClient.resources.resource(collectionName).unique(fieldID).get(fieldValue);
        }
        catch (err) {
            console.log(`Could not get item ${fieldID} from collection ${collectionName}`);
        }
        return item;
    }

    async checkUniqueFields(resourceName: string, document: AddonData, referenceField: string): Promise<AddonData> {
        try {
            const scheme = await this.utilities.papiClient.resources.resource('resources').key(resourceName).get();
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
}
