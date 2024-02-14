import { UtilitiesService } from './utilities.service';
import { AddonDataScheme, Collection, FindOptions } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';
import { DataQueryRelation, DimxRelations, EXPORT_FUNCTION_NAME, IMPORT_FUNCTION_NAME, limitationTypes, UdcMappingsScheme } from '../metadata';
import { Validator, ValidatorResult } from 'jsonschema';
import { collectionSchema, documentKeySchema, dataViewSchema, fieldsSchema } from '../jsonSchemes/collections';
import { existingErrorMessage, existingInRecycleBinErrorMessage, DocumentsService, collectionNameRegex, UserEvent, GlobalService } from 'udc-shared';
import { UserEventsService } from './user-events.service';
import { VarSettingsService } from '../services/var-settings.service';
import { AddonData } from '@pepperi-addons/papi-sdk/dist/entities';

export class CollectionsService {

    utilities: UtilitiesService = new UtilitiesService(this.client);
    globalService: GlobalService = new GlobalService();
    varRelationService: VarSettingsService = new VarSettingsService(this.utilities);

    constructor(private client: Client) {
    }


    async upsert(service: DocumentsService, body: Collection) {
        const collections = await this.find();
        await this.assertObjectCount(limitationTypes.Metadata, collections.length); // collections count validation

        let collectionObj: any = {
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
        const collectionForValidation = this.removeExtensionFields(collectionObj, true);
        const validResult = this.validateScheme(collectionForValidation);
        const errors: string[] = []
        if (validResult.valid || updatingHidden) {
            await service.checkHidden(body);
            const fieldsValid = await this.validateFieldsType(collectionObj);
            if (fieldsValid.size === 0) {
                // DI-22303 after we create the collection, we need to update it's Data view to have all the fields, and then post the new object
                collectionObj = this.updateListView(collectionObj);
                // before sending data to ADAL, remove extended fields, without changing the DV
                collectionObj = this.removeExtensionFields(collectionObj, false);
                collectionObj = this.handleSyncForContained(collectionObj);
                let collection = await this.utilities.papiClient.addons.data.schemes.post(collectionObj) as Collection;
                await this.createDIMXRelations(collection);
                // if the collection has no indexed fields (don't have data in elastic) or of type 'contained' don't create DQ relation
                if (collection.Type !== 'contained' && this.globalService.isCollectionIndexed(collection)) {
                    await this.createDataQueryRelations(collection);
                }
                return collection
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

    async findByName(tableName: string): Promise<Collection> {
        return await this.utilities.papiClient.addons.data.schemes.name(tableName).get() as Collection;
    }

    async find(options: FindOptions = {}): Promise<AddonDataScheme[]> {
        let collections = await this.utilities.papiClient.addons.data.schemes.get(options);
        return collections.filter(collection => collection.Name !== UdcMappingsScheme.Name);
    }

    async createDIMXRelations(collection: AddonDataScheme) {
        await Promise.all(DimxRelations.map(async (singleRelation) => {
            // override the name with the collectionName
            const functionName = singleRelation.RelationName == 'DataImportResource' ? IMPORT_FUNCTION_NAME : EXPORT_FUNCTION_NAME;
            singleRelation.Name = collection.Name;
            singleRelation.AddonRelativeURL = `/api/${functionName}?collection_name=${collection.Name}`
            singleRelation.Hidden = collection.Hidden;
            singleRelation.InitRelationDataRelativeURL = singleRelation.RelationName == 'DataImportResource' ? `/api/init_import_data_source?collection_name=${collection.Name}` : undefined;
            await this.utilities.papiClient.addons.data.relations.upsert(singleRelation);
        }));
    }

    async createDataQueryRelations(collection: Collection) {
        for (let relation of DataQueryRelation) {
            relation.Name = collection.Name;
            relation.AddonRelativeURL = await this.getQueryURL(collection.Name);
            relation.SchemaRelativeURL = `/addons/api/${this.client.AddonUUID}/api/collection_fields?collection_name=${collection.Name}`;
            let accountFound = false;
            let userFound = false;
            Object.keys(collection.Fields || {}).forEach((fieldName) => {
                const collectionField = collection.Fields![fieldName];
                if (collectionField.Type === 'Resource') {
                    // we want to take the first account we found, so we are checking whether we already found one.
                    if (collectionField.Resource === 'accounts' && collectionField.ApplySystemFilter && !accountFound) {
                        accountFound = true;
                        relation.AccountFieldID = 'UUID',
                            relation.IndexedAccountFieldID = `${fieldName}.Key`
                    }
                    if (collectionField.Resource === 'users' && collectionField.ApplySystemFilter && !userFound) {
                        userFound = true;
                        relation.UserFieldID = 'UUID',
                            relation.IndexedUserFieldID = `${fieldName}.Key`
                    }
                }
            })
            relation.Hidden = collection.Hidden;

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
            if (regex.test(collectionName)) {
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
            if (error instanceof Error) {
                if (error?.message?.indexOf('Object ID does not exist') >= 0) {
                    const result = await this.upsert(documentsService, body)
                    return result;
                }
            }
            throw error;
        }
    }

    async getCollectionFieldsLength(collectionName: string) {
        const res = await this.findByName(collectionName);
        return Object.keys(res.Fields!).length;
    }

    async validateFieldsType(collectionObj: Collection) {
        let validMap = new Map();
        let fieldsCount = 0;
        const collections = await this.find({ include_deleted: true, where: `Name != ${collectionObj.Name}` });
        // only check for field's type when there are Fields on the collection
        if (collectionObj.Fields) {
            for (const fieldID of Object.keys(collectionObj.Fields!)) {
                if (collectionObj.Fields![fieldID].Type === 'ContainedResource') { // if field type is contained, count contained schema fields
                    const collectionFieldsCount = await this.getCollectionFieldsLength(collectionObj.Fields![fieldID].Resource!);
                    fieldsCount += collectionFieldsCount;
                } else {
                    fieldsCount++;
                }
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

        await this.validateCollectionField(collectionObj, fieldsCount);
        return validMap;
    }

    async validateCollectionField(collectionObj, fieldsCount) {
        if (collectionObj.Type == 'contained') {
            await this.assertObjectCount(limitationTypes.ContainedSchemaFields, fieldsCount);
        } else {
            await this.assertObjectCount(limitationTypes.Fields, fieldsCount);
        }
    }

    async assertObjectCount(element: string, elementCount: number) {
        const softLimit: number = await this.varRelationService.getSettingsByName(element);

        if (elementCount > softLimit) {
            throw new Error(`${element} should not have more than ${softLimit} fields`);
        }
    }

    addFieldToMap(map, fieldID, collectionName) {
        const list = map.get(fieldID);
        if (!list) {
            map.set(fieldID, [collectionName]);
        } else {
            list.push(collectionName);
        }
    }

    removeExtensionFields(collection: Collection, changeDV: boolean): Collection {
        const ret: Collection = JSON.parse(JSON.stringify(collection));
        // empty return object Fields & ListView properties to reconstruct it without extension fields
        ret.Fields = {};
        if (ret.ListView && changeDV) {
            ret.ListView.Fields = [];
            ret.ListView.Columns = [];
        }

        Object.keys(collection.Fields || {}).forEach(field => {
            if (!collection.Fields![field].ExtendedField) {
                ret.Fields![field] = collection.Fields![field];
                if (collection.ListView && collection.ListView.Fields && changeDV) {
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

    async cleanRebuild(collectionName: string) {
        return this.utilities.papiClient.post(`/addons/data/schemes/${collectionName}/clean_rebuild`);
    }

    async getCollectionEvents(collectionName: string) {
        const collection: Collection = await this.findByName(collectionName);
        const service = new UserEventsService(this.client);
        const collectionNames: string[] = [collectionName];
        const res: UserEvent[] = [];

        // if the collection is extending other collections, get their events as well
        if (collection.SuperTypes) {
            collectionNames.push(...collection.SuperTypes);
        }
        for (const name of collectionNames) {
            const events = await service.getCollectionEvents(name);
            // add events filter to the events returned from the relation
            service.addEventFilter(events, collectionName);
            res.push(...events.Events);
        }

        return res;
    }

    private updateListView(collection: Collection): Collection {
        const res: Collection = JSON.parse(JSON.stringify(collection));

        // if there is no ListView, create an empty one
        if (!res.ListView || !res.ListView!.Fields) {
            res.ListView = {
                Type: 'Grid',
                Fields: [],
                Columns: []
            }
        }
        // remove fields that are deleted from the fields object
        else {
            res.ListView!.Fields = res.ListView!.Fields!.filter(element => {
                return res.Fields!.hasOwnProperty(element.FieldID);
            })
        }

        // append to the end all the fields that are not part of the list view
        Object.keys(collection.Fields || {}).forEach(fieldName => {
            let dvField = res.ListView!.Fields!.find(x => x.FieldID === fieldName);
            if (!dvField) {
                dvField = this.utilities.getDataViewField(fieldName, collection.Fields![fieldName]);
                res.ListView!.Fields!.push(dvField);
                res.ListView!.Columns!.push({ Width: 10 });
            }
        })


        return res;
    }

    private handleSyncForContained(collection: Collection): Collection {
        if (collection.Type === 'contained') {
            collection.SyncData = {
                Sync: true
            }
        }
        return collection;
    }

    async migrateDIMXRelations() {
        try {
            const collections = await this.find({ page_size: -1 }) as Collection[];
            await Promise.all(collections.map(collection => this.createDIMXRelations(collection)));
            return {
                success: true,
                resultObject: {}
            };
        } catch (err) {
            return {
                success: false,
                resultObject: err as Error,
                errorMessage: `Error in migrating DIMX relations. error - ${err}`
            };
        }
    }

    async unmigrateDIMXRelations() {
        try {
            const relations = await this.utilities.papiClient.addons.data.relations.find({ where: `RelationName='DataImportResource' and AddonUUID='${this.client.AddonUUID}'` });
            await Promise.all(relations.map(async (relation) => {
                relation.InitRelationDataRelativeURL = '';
                return await this.utilities.papiClient.addons.data.relations.upsert(relation);
            }));
            return {
                success: true,
                resultObject: {}
            };
        }
        catch (ex) {
            return {
                success: false,
                resultObject: ex,
                errorMessage: `Error in unmigrating DIMX relations. error - ${ex}`
            };
        }
    }

    private async getQueryURL(collectionName: string): Promise<string> {
        let res: string = '';
        try {
            res = await this.utilities.papiClient.get(`/addons/data/schemes/${collectionName}/query_url`);
        }
        // ignore crushes of the query_url function
        catch { }
        return res;
    }
}

