import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { KeyValuePair } from '@pepperi-addons/ngx-lib';
import { AddonData, ApiFieldObject, BaseFormDataViewField, Collection, Type, FormDataView, SchemeFieldType } from '@pepperi-addons/papi-sdk';

import { MappingFieldType, MappingFieldTypes, MappingResource, UdcMapping } from 'udc-shared';

import { FormMode, UtilitiesService } from './utilities.service';
import { CollectionsService } from './collections.service';

@Injectable({ providedIn: 'root' })
export class MappingsService {
    constructor(
        private utilitiesService: UtilitiesService,
        private collectionsService: CollectionsService,
        private translate: TranslateService
    ) {}

    async getMappings(atdID: number): Promise<UdcMapping[]> {
        return await this.utilitiesService.papiClient.addons.api.uuid(this.utilitiesService.addonUUID).file('api').func('mappings').get({
            atd_id: atdID
        });
    }

    async upsertMapping(mappingObj: MappingFormItem): Promise<UdcMapping> {
        const obj = this.convertToApiObject(mappingObj)
        return await this.utilitiesService.papiClient.addons.api.uuid(this.utilitiesService.addonUUID).file('api').func('mappings').post(undefined, obj);
    }

    async deleteMapping(mappingObj: UdcMapping): Promise<UdcMapping> {
        mappingObj.Hidden = true;
        return await this.utilitiesService.papiClient.addons.api.uuid(this.utilitiesService.addonUUID).file('api').func('mappings').post(undefined, mappingObj);
    }
    
    async getAtd(uuid: string): Promise<Type>{
        return await this.utilitiesService.papiClient.addons.api.uuid(this.utilitiesService.addonUUID).file('api').func('get_atd').get({'uuid': uuid});
    }

    convertToApiObject(objToConvert: MappingFormItem): UdcMapping {
        return {
            Key: objToConvert.Key,
            AtdID: objToConvert.Atd.InternalID,
            DataSource: {
                Collection: objToConvert.Collection,
                Field: objToConvert.CollectionField,
                Delimiter: objToConvert.CollectionDelimiter
            },
            Field: {
                ApiName: objToConvert.ApiName,
                Title: objToConvert.Title,
                Temporary: objToConvert.Temporary,
                Description: objToConvert.Description,
                Type: objToConvert.Type
            },
            Resource: objToConvert.Resource,
            DocumentKeyMapping: objToConvert.DocumentKeyMapping
        }
    }
    
    async createDataView(mode: FormMode, item: MappingFormItem): Promise<FormDataView> {
        const dv: FormDataView = {
            Type: 'Form',
            Context: {
                Name: '',
                Profile: { },
                ScreenSize: 'Tablet'
            },
            Fields: [{
                FieldID: 'Title',
                Mandatory: true,
                ReadOnly: false,
                Title: this.translate.instant('Field name'),
                Type: 'TextBox',
                Layout: {
                    Origin: {
                        X: 0,
                        Y: 0
                    },
                    Size: {
                        Width: 1,
                        Height: 0
                    }
                },
                Style: {
                    Alignment: {
                        Horizontal: 'Stretch',
                        Vertical: 'Stretch'
                    }
                }
            }, 
            {
                FieldID: 'Type',
                Mandatory: true,
                ReadOnly: mode == 'Edit',
                Title: this.translate.instant('Type'),
                Type: 'ComboBox',
                Layout: {
                    Origin: {
                        X: 0,
                        Y: 2
                    },
                    Size: {
                        Width: 1,
                        Height: 0
                    }
                },
                Style: {
                    Alignment: {
                        Horizontal: 'Stretch',
                        Vertical: 'Stretch'
                    }
                }
            }, 
            {
                FieldID: 'ApiName',
                Mandatory: true,
                ReadOnly: mode === 'Edit',
                Title: this.translate.instant('Field API name'),
                Type: 'TextBox',
                Layout: {
                    Origin: {
                        X: 0,
                        Y: 1
                    },
                    Size: {
                        Width: 1,
                        Height: 0
                    }
                },
                Style: {
                    Alignment: {
                        Horizontal: 'Stretch',
                        Vertical: 'Stretch'
                    }
                }
            },
            {
                FieldID: 'Description',
                Mandatory: true,
                ReadOnly: false,
                Title: this.translate.instant('Field description'),
                Type: 'TextBox',
                Layout: {
                    Origin: {
                        X: 1,
                        Y: 0
                    },
                    Size: {
                        Width: 1,
                        Height: 0
                    }
                },
                Style: {
                    Alignment: {
                        Horizontal: 'Stretch',
                        Vertical: 'Stretch'
                    }
                }
            },
            {
                FieldID: 'Temporary',
                Mandatory: false,
                ReadOnly: false,
                Title: this.translate.instant('Temporary'),
                Type: 'ComboBox',
                Layout: {
                    Origin: {
                        X: 1,
                        Y: 1
                    },
                    Size: {
                        Width: 1,
                        Height: 0
                    }
                },
                Style: {
                    Alignment: {
                        Horizontal: 'Stretch',
                        Vertical: 'Stretch'
                    }
                }
            },
            {
                FieldID: 'DataSource',
                Mandatory: false,
                ReadOnly: false,
                Title: this.translate.instant('Data source'),
                Type: 'Separator',
                Layout: {
                    Origin: {
                        X: 0,
                        Y: 3
                    },
                    Size: {
                        Width: 2,
                        Height: 0
                    }
                },
                Style: {
                    Alignment: {
                        Horizontal: 'Stretch',
                        Vertical: 'Stretch'
                    }
                }
            },
            {
                FieldID: 'Filter',
                Mandatory: false,
                ReadOnly: false,
                Title: this.translate.instant('Filter'),
                Type: 'Separator',
                Layout: {
                    Origin: {
                        X: 0,
                        Y: 5
                    },
                    Size: {
                        Width: 2,
                        Height: 0
                    }
                },
                Style: {
                    Alignment: {
                        Horizontal: 'Stretch',
                        Vertical: 'Stretch'
                    }
                }

            },
        ],
        Columns: [{}, {}],

        }

        dv.Fields[1]["OptionalValues"] = MappingFieldTypes.map(type => {
            return {
                Key: type,
                Value: this.translate.instant(`FieldType_${type}`)
            }
        })
        dv.Fields[4]["OptionalValues"] = [{
            Key: true,
            Value: 'True'
        },
        {
            Key: false,
            Value: 'False'
        }]

        if (item.Atd.Type === 2) {
    
            dv.Fields.push(this.getResourceDataView(mode));
        }

        const collectionDV = await this.getCollectionDataView();
        dv.Fields.push(collectionDV);

        if (item.Collection && item.Collection != '') {
            const collectionObj: Collection = await this.utilitiesService.getCollectionByName(item.Collection);
            const filterDVFields = await this.getFilterDataView(item, collectionObj);
            const collectionFieldDV: BaseFormDataViewField = {
                FieldID: 'CollectionField',
                Mandatory: true,
                ReadOnly: false,
                Title: this.translate.instant('Collection field'),
                Type: 'ComboBox',
                Layout: {
                    Origin: {
                        X: 1,
                        Y: 4
                    },
                    Size: {
                        Width: 1,
                        Height: 0
                    }
                },
                Style: {
                    Alignment: {
                        Horizontal: 'Stretch',
                        Vertical: 'Stretch'
                    }
                }
            }
            collectionFieldDV["OptionalValues"] = this.getCollectionFields(collectionObj, item.Type);
            
            dv.Fields.push(...filterDVFields);
            dv.Fields.push(collectionFieldDV);
        }

        return dv;
    }

    async getFields(atdUUID: string): Promise<any> {
        return await this.utilitiesService.papiClient.addons.api.uuid(this.utilitiesService.addonUUID).file('api').func('fields').get({
            atd_uuid: atdUUID
        });
    }

    filterFieldsByType(fields: ApiFieldObject[], fieldType: SchemeFieldType): ApiFieldObject[] {
        return fields.filter((field: ApiFieldObject) => {
            let retVal = false;
            switch (fieldType) {
                case 'String': {
                    retVal = field.Format == 'String' || field.Format == 'Guid'
                    break;
                }
                case 'DateTime': {
                    retVal = field.Format == 'DateTime'
                    break;
                }
                case 'Integer': {
                    retVal = field.Format == 'Int16' || field.Format == 'Int32' || field.Format == 'Int64'
                    break;
                }
                case 'Double': {
                    retVal = field.Format == 'Decimal' || field.Format == 'Double'
                    break;
                }
                case 'Bool': {
                    retVal = field.Type == 'Boolean'
                    break;
                }
            }
            return retVal;
        })
    }

    async getFilterDataView(item: MappingFormItem, collection: Collection): Promise<BaseFormDataViewField[]> {
        const tsaFields = await this.getFields(item.Atd.UUID);
        const filterDVFields = await Promise.all(collection.DocumentKey?.Fields.map(async (field, index, arr): Promise<BaseFormDataViewField> => {
            const fieldType = collection.Fields[field].Type !== 'Array' ? collection.Fields[field].Type : collection.Fields[field].Items.Type;
            const intrest = index % 2;
            const fieldDV: BaseFormDataViewField = {
                FieldID: `DocumentMapping${index}`,
                Mandatory: true,
                ReadOnly: false,
                Title: this.translate.instant('Mapping_FilterTitle', {FieldName: field}),
                Type: 'ComboBox',
                Layout: {
                    Origin: {
                        X: intrest,
                        Y: intrest == 0 ? index + 6 : index + 5
                    },
                    Size: {
                        Width: 1,
                        Height: 0
                    }
                },
                Style: {
                    Alignment: {
                        Horizontal: 'Stretch',
                        Vertical: 'Stretch'
                    }
                }
            }
            
            fieldDV["OptionalValues"] = this.getFilterOptions(tsaFields, fieldType, item.Resource);
            
            return fieldDV
        }));
        return filterDVFields;
    }

    getCollectionFields(collection: Collection, fieldType: MappingFieldType) {
        const filteredFields = Object.keys(collection.Fields).filter(field => {
            let retVal = false;
            switch (fieldType) {
                case 'TextBox':
                case 'TextArea':
                case 'ComboBox':
                case 'RichTextHTML': {
                    retVal = collection.Fields[field].Type === 'String';
                    break;
                }
                case 'Date':
                case 'DateAndTime': {
                    retVal = collection.Fields[field].Type === 'DateTime';
                    break;
                }
                case 'Boolean': {
                    retVal = collection.Fields[field].Type === 'Bool';
                    break;
                }
                case 'NumberInteger': {
                    retVal = collection.Fields[field].Type === 'Integer';
                    break;
                }
                case 'NumberReal': 
                case 'Currency' : {
                    retVal = collection.Fields[field].Type === 'Double';
                    break;
                }
            }
            return retVal;
        });
        return filteredFields.map(field => {
            return {
                Key: field,
                Value: field
            }
        })
    }

    async getCollectionDataView(): Promise<BaseFormDataViewField> {
        const dv: BaseFormDataViewField = {
            FieldID: 'Collection',
            Mandatory: true,
            ReadOnly: false,
            Title: this.translate.instant('Collection'),
            Type: 'ComboBox',
            Layout: {
                Origin: {
                    X: 0,
                    Y: 4
                },
                Size: {
                    Width: 1,
                    Height: 0
                }
            },
            Style: {
                Alignment: {
                    Horizontal: 'Stretch',
                    Vertical: 'Stretch'
                }
            }
        }

        dv["OptionalValues"] = (await this.collectionsService.getMappingsCollections()).map(collection => {
            return {
                Key: collection.Name,
                Value: collection.Name
            }
        })

        return dv;
    }

    getResourceDataView(mode: FormMode) {
        const resourceField: BaseFormDataViewField = {
            FieldID: 'Resource',
            Mandatory: true,
            ReadOnly: mode === 'Edit',
            Title: this.translate.instant('Resource'),
            Type: 'ComboBox',
            Layout: {
                Origin: {
                    X: 1,
                    Y: 2
                },
                Size: {
                    Width: 1,
                    Height: 0
                }
            },
            Style: {
                Alignment: {
                    Horizontal: 'Stretch',
                    Vertical: 'Stretch'
                }
            },
        }

        resourceField["OptionalValues"] = [{
            Key: 'transactions',
            Value: 'Transactions'
        },
        {
            Key: 'transaction_lines',
            Value: 'Transaction Lines'
        }]

        return resourceField;
    }

    getFilterOptions(tsaFields, fieldType, itemResource) {
        const transactionPrefix = itemResource === 'transaction_lines' ? 'Transaction.' : '';
        const tranactionsFieldsOptions = itemResource != 'activities' ? this.filterFieldsByType(tsaFields.Transactions, fieldType).map(field => {
            return {
                Key: `${transactionPrefix}${field.FieldID}`,
                Value: `${transactionPrefix}${field.Label}`
            }
        }) : [];
        const activitiesFieldsOptions = itemResource === 'activities' ? this.filterFieldsByType(tsaFields.Activities, fieldType).map(field => {
            return {
                Key: `${field.FieldID}`,
                Value: `${field.Label}`
            }
        }) : [];
        const itemsFieldsOptions = itemResource === 'transaction_lines' ? this.filterFieldsByType(tsaFields.Items, fieldType).map(field => {
            return {
                Key: `Item.${field.FieldID}`,
                Value: `Item.${field.Label}`
            }
        }) : [];
        const accountsFieldsOptions = this.filterFieldsByType(tsaFields.Accounts, fieldType).map(field => {
            return {
                Key: `Account.${field.FieldID}`,
                Value: `Account.${field.Label}`
            }
        });
        const linesFieldsOptions = itemResource === 'transaction_lines' ? this.filterFieldsByType(tsaFields.TransactionLines, fieldType).map(field => {
            return {
                Key: field.FieldID,
                Value: field.Label
            }
        }) : [];
        
        return [
            ...tranactionsFieldsOptions,
            ...activitiesFieldsOptions,
            ...itemsFieldsOptions,
            ...accountsFieldsOptions,
            ...linesFieldsOptions
        ].sort()
    }
}

export interface MappingFormItem extends AddonData {
    Atd: Type;
    Title: string;
    ApiName: string;
    Description: string;
    Type: MappingFieldType;
    Temporary: boolean;
    Collection: string;
    CollectionField: string;
    CollectionDelimiter: string;
    Resource?: MappingResource;
    DocumentKeyMapping: {
        Key: string,
        Value: string
    }[];
}

