import { v4 as uuid } from 'uuid';
import { AddonData, AddonDataScheme, Collection, CollectionField, DataViewFieldType, GridDataViewField, PapiClient, SchemeFieldType } from '@pepperi-addons/papi-sdk';
import { DataLimitationMapping, SoftLimitsDeaultValues } from '../entities';
import jwtDecode from "jwt-decode";
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

    // used to define UDC items limitations
    async createSettingsTable(){
        let fields: any = {};
        for(const element of DataLimitationMapping.keys()){
            fields[element] = { Type: 'Integer' } // create field for each key
        }
       
        await this.papiClient.addons.data.schemes.post({
            Name: 'UserDefinedCollectionsSettings', 
            Type: 'data', 
            Fields: {
                metadata: { 
                    Type:'Integer'
                },
                documents: { 
                    Type:'Integer'
                },
                documentsNotIndexed: { 
                    Type:'Integer'
                },
                containedArrayItems: {
                    Type:'Integer'
                },
                fields: {
                    Type:'Integer'
                },
                fieldsOfContained: {
                    Type:'Integer'
                }
            } 
        });

        await this.insertSettingsDefaultValues(); // initialize settings with default values
    }

    async insertSettingsDefaultValues(){
        const distributorID: string = this.getDistributorID()
        const settingsBody: AddonData = {
            Key: distributorID,
            metadata: SoftLimitsDeaultValues.get('Metadata'),
            documents: SoftLimitsDeaultValues.get('Documents'),
            documentsNotIndexed: SoftLimitsDeaultValues.get('DocumentsNotIndexed'),
            containedArrayItems: SoftLimitsDeaultValues.get('ContainedArrayItems'),
            fields: SoftLimitsDeaultValues.get('Fields'),
            fieldsOfContained: SoftLimitsDeaultValues.get('FieldsOfContained')
        };

        await this.upsertSettings(settingsBody);
    }

    getDistributorID(): string{
        return jwtDecode(this.client.OAuthAccessToken)['pepperi.distributorid'].toString();
    }

    async getSettings(): Promise<AddonData>{
        try{
            const distributorID = this.getDistributorID();
            console.log(`About to get settings table`);
            const res = await this.papiClient.addons.data.uuid(this.client.AddonUUID).table('UserDefinedCollectionsSettings').key(distributorID).get();
            console.log(`Got data from settings table.`);
            return res;

        } catch(err){
            console.log(`Error get settings table: ${err}`);
            throw new Error(`Error get settings table: ${err}`);
        }
    }

    async upsertSettings(settingsBody){
        try{
            console.log(`About to upsert data to settings table`);
            await this.papiClient.addons.data.uuid(this.client.AddonUUID).table('UserDefinedCollectionsSettings').upsert(settingsBody);
            console.log(`Post data to settings table.`);

        } catch(err){
            console.log(`Error get settings table: ${err}`);
            throw new Error(`Error get settings table: ${err}`);
        }
    }
    
    // check if soft limit is compatible with hard limit- throw error if not
    isValidValue(element, value){ 
        if(value > DataLimitationMapping.get(element)!.hardLimit){
            throw new Error(`Cannot set ${element} new value`)
        }
    }
}

