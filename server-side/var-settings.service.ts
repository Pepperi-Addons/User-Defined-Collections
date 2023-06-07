import { IPepGenericFormDataView, IPepGenericFormDataViewField } from '@pepperi-addons/ngx-composite-lib/generic-form';
import { Client, Request } from '@pepperi-addons/debug-server'
import { AddonData, PapiClient } from '@pepperi-addons/papi-sdk';
import config from '../addon.config.json';
import { DataLimitationMapping, limitationField } from './entities';
import { UtilitiesService } from './services/utilities.service';


export class VarSettingsService{
    // data view
    getDataViewFields(): IPepGenericFormDataViewField[]{ // create list of data view fields
        let dataViewObject: any[] = [];
        
        DataLimitationMapping.forEach( (value, key) =>{
            dataViewObject.push(this.getDataViewFieldsData(key, value['title']));
        })
        return dataViewObject;
    }

    getDataViewFieldsData(field, title){ // create a single field data view
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

    getDataView(): IPepGenericFormDataView{ // create the data view
        return {
            UID: 'ABCD-DCBA-FGHD-POLK',
            Type: 'Form',
            Hidden: false,
            Columns: [{}],
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
            Rows: []
        };
    }

    // get and post var settings
    // GET - on var settings reload, get the relevant data
    async setVarSettingsConfiguration(client: Client, request: Request): Promise<limitationField>{
        let settingsBody: any = {};
        const utils: UtilitiesService = new UtilitiesService(client);
        const res: AddonData = await utils.getSettings()

        for(const element of DataLimitationMapping.keys()){ // create the list of items returned to var settings
            settingsBody[element] = res[element];
        }
        return settingsBody;
    }
    
    // POST - get the requested change from var settings, and set the table accordingly
    async getUpdatedVarSettings(client: Client, request: Request){
        const utils: UtilitiesService = new UtilitiesService(client);
        const distributorID = utils.getDistributorID();

        let settingsBody = { Key: distributorID };
        const settings = request.body;

        for(const element of DataLimitationMapping.keys()){
            utils.isValidValue(element, settings[element]);
            settingsBody[element] = settings[element]; // create field for each key
        }

        await utils.upsertSettings(settingsBody); // post to settings table
    }
}