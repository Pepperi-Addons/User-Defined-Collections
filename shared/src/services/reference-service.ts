import { AddonData, AddonDataScheme, Collection, SearchBody } from "@pepperi-addons/papi-sdk"
import { CollectionFields, ReferenceObject } from "../entities";
import { IResourcesServices } from "./resources-service";

export class ReferenceService {
    referenceFields: ReferenceObject[] = [];
    referenceObjects: {
        [key: string]: {
            UniqueField: {
                [FieldID: string]: {
                    Values: Set<string>
                }
            }
            Items: AddonData[];   
        }
    } = {};

    referenceSchemes: {
        [key: string]: Collection
    } = {};

    constructor(private resourcesService: IResourcesServices) { }

    getItemByUniqueField(resourceName: string, fieldName: string, fieldValue: string): AddonData | undefined {
        let item: AddonData | undefined;
        if (this.referenceObjects.hasOwnProperty(resourceName) && this.referenceObjects[resourceName].Items) {
            item = this.referenceObjects[resourceName].Items.find(item => item[fieldName] === fieldValue);
        }
        return item;
    }

    async handleDotAnnotationItems(schemeFields: CollectionFields, documents: AddonData[]) {
        await this.handleReferences(schemeFields, documents);
        return await Promise.all(documents.map(async (doc) => {
            await Promise.all(Object.keys(doc).map(async(prop) => {
                // if the property name has '.' in it, the we need to split it and get referenced object by it's unique field
                // i.e. if we have a field called myAccount.ExternalID, and myAccount referenced to accounts, then we need
                // to delete myAccountExternalID from the object, and insert 'myAccount' instead with the key of the account
                // if we didn't find the externalID, we will later fail it with reference not exist
                if (prop.indexOf('.') > 0) {
                    const parts = prop.split('.');
                    if (parts.length === 2) {
                        const field = schemeFields![parts[0]];
                        if(field) {
                            // if the referenced field is not unique, ignore it
                            const unique = await this.isUniqueField(field.Resource, parts[1]);
                            if(unique) {
                                const item = this.getItemByUniqueField(field.Resource || '', parts[1], doc[prop]);
                                doc[parts[0]] = item ? item.Key : '';
                            }
                        }
                    }
                }
            }));
            return doc;
        }))
    }
    
    private async handleReferences(schemeFields: CollectionFields, documents: AddonData[]) {
        await this.getReferenceFields(schemeFields);
        await Promise.all(documents.map(async(doc) => {
            await this.collectItemReferences(doc, schemeFields);
        }));
        await this.popualateAllResources();
    }

    private addValueToResource(resourceName: string, fieldName: string, fieldValue: string | string[]) {
        // if the resource name has not been inserted, create a new property
        if (!this.referenceObjects.hasOwnProperty(resourceName)) {
            this.referenceObjects[resourceName] = {
                UniqueField: {},
                Items: []
            }
        }

        // if the unique field has not been inserted, create a new property
        if (!this.referenceObjects[resourceName].UniqueField.hasOwnProperty(fieldName)) {
            this.referenceObjects[resourceName].UniqueField[fieldName] = {
                Values: new Set()
            }
        }

        if(Array.isArray(fieldValue)) {
            fieldValue.forEach(value => {
                this.addValueToUniqueField(resourceName, fieldName, value);
            });
        }
        else {
            this.addValueToUniqueField(resourceName, fieldName, fieldValue);
        }
    }
    
    private addValueToUniqueField(resourceName, fieldName, value) {
        // to avoid duplicates, check if the field value already exists
        if (!this.referenceObjects[resourceName].UniqueField[fieldName].Values.has(value)) {
            this.referenceObjects[resourceName].UniqueField[fieldName].Values.add(value);
        }
    }

    private async populateItemsForResource(resourceName: string, fieldName: string) {
        try {
            if(this.referenceObjects.hasOwnProperty(resourceName) && this.referenceObjects[resourceName].UniqueField.hasOwnProperty(fieldName)) {
                const valuesForSearch = Array.from(this.referenceObjects[resourceName].UniqueField[fieldName].Values.values());
                let searchBody: SearchBody = {
                    Fields: [
                        "Key",
                        "InternalID",
                        "ExternalID"
                    ],
                    UniqueFieldID: fieldName,
                    UniqueFieldList: [...valuesForSearch]
                }
                console.log(`about to call search on resource ${resourceName} with body ${JSON.stringify(searchBody)}`);
                const items = await this.resourcesService.search(resourceName, searchBody);
                console.log(`after getting items from resource ${resourceName}. recieved ${items.Objects.length} objects`);
                this.referenceObjects[resourceName].Items = items.Objects;
            }
        }
        catch (err) {
            console.error(`could not get items for resource name ${resourceName} on field ${fieldName}. got error ${JSON.stringify(err)}`);
        }
    }

    private async popualateAllResources() {
        return await Promise.all(Object.keys(this.referenceObjects || {}).map(async (resource) => {
            await Promise.all(Object.keys(this.referenceObjects[resource].UniqueField || {}).map(async (field) => {
                await this.populateItemsForResource(resource, field);
            }));
        }));
    }

    private async getReferenceFields(schemeFields: CollectionFields) {
        await Promise.all(Object.keys(schemeFields || {}).map(async (fieldName) => {
            if (schemeFields![fieldName].Type === 'Resource') {
                const scheme: Collection = await this.getResourceScheme(schemeFields![fieldName].Resource || '');
                // TBD - remove once getByKey on abstract scheme will work
                // if the reference is for schema of type 'abstract' don't add it as referenced field.
                if (scheme && scheme.Type != 'abstract') {
                    this.referenceFields.push({
                        FieldID: fieldName, 
                        ResourceName: schemeFields![fieldName].Resource || ''
                    });
                }
            }
        }));
    }

    private async collectItemReferences(doc: AddonData, schemeFields: CollectionFields) {
        if(doc) {
            await Promise.all(Object.keys(doc || {}).map(async(prop) => {
                const refField = this.referenceFields.find(item => item.FieldID === prop);
                const field = schemeFields![prop];
                // property has unique field of resource
                if (prop.indexOf('.') > 0) {
                    await this.handleDotAnnotationFields(doc, prop, this.referenceFields)
                }
                // current prop is a reference by itself, need to add it's value with 'Key' field
                else if (refField) {
                    this.addValueToResource(refField.ResourceName, 'Key', doc[prop]);
                }
            }))
        }
    }

    private async handleDotAnnotationFields(doc:AddonData, fieldName: string, referenceFields: ReferenceObject[]) {
        const parts = fieldName.split('.');
        // we are not supporting nested references
        if(parts.length == 2) {
            const field = referenceFields.find(item => item.FieldID === parts[0]);
            if (field) {
                if (field.ResourceName) {
                    const unique = await this.isUniqueField(field.ResourceName, parts[1]);
                    if(unique) {
                        this.addValueToResource(field.ResourceName, parts[1], doc[fieldName]);
                    }
                }
            }
        }
    }

    private async isUniqueField(resourceName, fieldID): Promise<boolean> {
        let unique = false;
        const resourceScheme = await this.getResourceScheme(resourceName);
        if(resourceScheme && resourceScheme.Fields && resourceScheme.Fields[fieldID]) {
            unique = resourceScheme.Fields[fieldID].Unique || false;
        }
        return unique
    }
    
    private async getResourceScheme(resourceName: string): Promise<Collection> {
        let resourceScheme = this.referenceSchemes[resourceName];
        if(!resourceScheme) {
            resourceScheme = await this.resourcesService.getByKey('resources', resourceName) as Collection;
            this.referenceSchemes[resourceName] = resourceScheme;
        }
        return resourceScheme;
    }
}