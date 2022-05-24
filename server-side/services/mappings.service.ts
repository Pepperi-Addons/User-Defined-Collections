import { Client } from "@pepperi-addons/debug-server/dist";
import { ApiFieldObject, DataViewFieldTypes, FindOptions } from "@pepperi-addons/papi-sdk";
import { UdcMapping } from 'udc-shared';
import { FieldsService } from "./fields.service";
import { UtilitiesService } from "./utilities.service";
import { UdcMappingsScheme } from '../metadata'
    
export class MappingsService {
    
    utilities: UtilitiesService = new UtilitiesService(this.client);
    fieldsService: FieldsService = new FieldsService(this.client);
    
    constructor(private client: Client) {
    } 
    
    async find(params: FindOptions, atdID: number = -1) {
        const mappings = await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(UdcMappingsScheme.Name).find(params);
        if (atdID > 0) {
            return mappings.filter(mapping => mapping.AtdID === atdID);
        }
        else {
            return mappings;
        }
    }

    async upsert(obj: UdcMapping) {
        await this.fieldsService.upsert(obj);
        let retVal = await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(UdcMappingsScheme.Name).upsert(obj);
        return retVal;
    }
}