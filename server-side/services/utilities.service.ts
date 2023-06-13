import { v4 as uuid } from 'uuid';
import { AddonData, AddonDataScheme, Collection, CollectionField, DataViewFieldType, GridDataViewField, PapiClient, SchemeFieldType } from '@pepperi-addons/papi-sdk';
import { Client } from '@pepperi-addons/debug-server';

export class UtilitiesService {
    
    papiClient: PapiClient

    constructor(private client: Client) {
        this.papiClient = new PapiClient({
            baseURL: client.BaseURL,
            token: client.OAuthAccessToken,
            addonUUID: client.AddonUUID,
            addonSecretKey: client.AddonSecretKey,
            actionUUID: client.ActionUUID
        });
    }

    getToken(){
        return this.client.OAuthAccessToken;
    }

    async createRelations(relations) {
        await Promise.all(relations.map(async (singleRelation) => {
            await this.papiClient.addons.data.relations.upsert(singleRelation);
        }));
    }
        
    async getAtd(uuid: string) {
        return  await this.papiClient.types.find({
            where: `UUID='${uuid}'`
        }).then((types) => {
            return types[0]
        });
    }

    getDataViewField(fieldName: string, field: CollectionField): GridDataViewField {
        const hasOptionalValues = field.OptionalValues ? field.OptionalValues.length > 0 : false;
        return {
            FieldID: fieldName,
            Mandatory: field.Mandatory,
            ReadOnly: true,
            Title: fieldName,
            Type: this.getDataViewFieldType(field.Type, hasOptionalValues)
        }
    }
    
    getDataViewFieldType(fieldType: SchemeFieldType, hasOptionalValues: boolean): DataViewFieldType{
        let type: DataViewFieldType;
        switch (fieldType) {
            case 'String': {
                type = 'TextBox'
                break;
            }
            case 'Integer': {
                type = 'NumberInteger'
                break;
            }
            case 'Double': {
                type = 'NumberReal'
                break;
            }
            case 'Bool': {
                type = 'Boolean'
                break;
            }
            case 'DateTime': {
                type = 'DateAndTime'
                break;
            }
            case 'Array': {
                if (hasOptionalValues) {
                    type = 'MultiTickBox';
                }
                else {
                    type = 'TextBox'
                }
                break;
            }
            default: {
                type = 'TextBox'
                break;
            }
        }
        if (hasOptionalValues && fieldType !== 'Array') {
            type = 'ComboBox'
        }
        return type;
    }
}

