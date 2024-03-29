import { AddonData, BaseFormDataViewField, FormDataView } from '@pepperi-addons/papi-sdk';
import { DataLimitationMapping, limitationField, SoftLimitsDeaultValues } from '../entities';
import { UtilitiesService } from './utilities.service';
import jwtDecode from "jwt-decode";
import { limitationTypes, settingsTable, SettingsTableName } from '../metadata';
import config from '../../addon.config.json'

export class VarSettingsService{
    utilities: UtilitiesService;

    constructor(utilities: UtilitiesService){
        this.utilities = utilities;
    }

    // data view
    getDataViewFields(): BaseFormDataViewField[] { // create list of data view fields
        let dataViewObject: BaseFormDataViewField[] = [];
        
        DataLimitationMapping.forEach( (value, key) =>{
            dataViewObject.push(this.getDataViewFieldsData(key, value['title']));
        })
        return dataViewObject;
    }

    getDataViewFieldsData(field, title): BaseFormDataViewField{ // create a single field data view
        return {
            FieldID: field,
            Type: 'TextBox',
            Title: title,
            Mandatory: false,
            ReadOnly: false,
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
        }
    }

    getDataView(): FormDataView{ // create the data view
        return {
            Type: 'Form',
            Hidden: false,
            Context: {
                Object: {
                    Resource: "None",
                    InternalID: 1,
                },
                Name: 'User Defined Collections data view',
                ScreenSize: 'Tablet',
                Profile: {
                    InternalID: 1,
                    Name: 'MyProfile'
                }
            },
            Fields: this.getDataViewFields(),
        };
    }

    // get and post var settings
    // GET - on var settings reload, get the relevant data
    async getVarSettingsConfiguration(): Promise<limitationField>{
        let settingsBody: any = {};
        const res: AddonData | undefined = await this.getSettings()
        if(res){
            for(const element of DataLimitationMapping.keys()){ // create the list of items returned to var settings
                settingsBody[element] = res[element];
            }            
        }
        return settingsBody;
    }
    
    // POST - get the requested change from var settings, and set the table accordingly
    async setVarSettingsUpdatedValues(settings){
        const distributorUUID: string = this.getDistributorUUID();

        let settingsBody = { Key: distributorUUID };

        for(const element of DataLimitationMapping.keys()){
            this.isValidValue(element, settings[element]);
            settingsBody[element] = settings[element]; // create field for each key
        }

        await this.upsertSettings(settingsBody); // post to settings table
    }

    // used to define UDC items limitations
    async createSettingsTable(){
        try{
            console.log(`About to create settings table`);
            await this.utilities.papiClient.addons.data.schemes.post(settingsTable);
            console.log(`Created settings table successfully.`);
            
            await this.insertSettingsDefaultValues(); // initialize settings with default values

        } catch(error){
            console.log(`Error creating settings table: ${error}`);
            throw new Error(`Error creating settings table: ${error}`);
        }
    }

    async insertSettingsDefaultValues(){
        const distributorUUID: string = this.getDistributorUUID()
        const settingsBody: AddonData = {
            Key: distributorUUID,
            metadata: SoftLimitsDeaultValues.get(limitationTypes.Metadata),
            documents: SoftLimitsDeaultValues.get(limitationTypes.Documents),
            documentsNotIndexed: SoftLimitsDeaultValues.get(limitationTypes.NotIndexedDocument),
            containedArrayItems: SoftLimitsDeaultValues.get(limitationTypes.ItemsOfContainedArray),
            fields: SoftLimitsDeaultValues.get(limitationTypes.Fields),
            fieldsOfContained: SoftLimitsDeaultValues.get(limitationTypes.ContainedSchemaFields)
        };

        await this.upsertSettings(settingsBody);
    }

    getDistributorUUID(): string{
        const token = this.utilities.getToken();
        return jwtDecode(token)['pepperi.distributoruuid'].toString();
    }

    async getSettings(): Promise<AddonData | undefined>{
        try{
            const distributorUUID: string = this.getDistributorUUID();
            console.log(`About to get settings table`);
            const res = await this.utilities.papiClient.addons.data.uuid(config.AddonUUID).table(SettingsTableName).key(distributorUUID).get();
            console.log(`Got data from settings table.`);
            return res;

        } catch(err){
            console.log(`Error getting settings table: ${err}`);
            return undefined;
        }
    }

    async getSettingsByName(element: string): Promise<number>{
        let elementCount: number;
        const settings: AddonData | undefined = await this.getSettings();
        if(settings){
            elementCount = settings[element];
        } else{
            elementCount = SoftLimitsDeaultValues.get(element)!;
        }
        return elementCount;
    }

    async upsertSettings(settingsBody){
        try{
            console.log(`About to upsert data to settings table`);
            await this.utilities.papiClient.addons.data.uuid(config.AddonUUID).table(SettingsTableName).upsert(settingsBody);
            console.log(`Post data to settings table.`);

        } catch(err){
            console.log(`Error get settings table: ${err}`);
            throw new Error(`Error get settings table: ${err}`);
        }
    }
    
    // check if soft limit is compatible with hard limit- throw error if not
    isValidValue(element, value){
        const fieldHardLimit = DataLimitationMapping.get(element)!.hardLimit;
        if(value > fieldHardLimit){
            throw new Error(`Cannot set ${element} new value: requested value: ${value}, allowed values are lower than ${fieldHardLimit}`)
        }
    }
}
