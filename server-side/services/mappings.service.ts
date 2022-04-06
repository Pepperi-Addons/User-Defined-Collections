import { Client } from "@pepperi-addons/debug-server/dist";
import { ApiFieldObject, DataViewFieldTypes, FindOptions } from "@pepperi-addons/papi-sdk";
import { UdcMapping } from '../entities';
import { FieldsService } from "./fields.service";
import { UtilitiesService } from "./utilities.service";
import { UdcMappingsScheme } from '../metadata'
    
export class MappingsService {
    
    utilities: UtilitiesService = new UtilitiesService(this.client);
    fieldsService: FieldsService = new FieldsService(this.client);
    
    constructor(private client: Client) {
    } 
    
    async getMappings(params: FindOptions, atdID: number) {
        const mappings = await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(UdcMappingsScheme.Name).find(params);
        if (atdID) {
            return mappings.filter(mapping => mapping.AtdID === atdID);
        }
        else {
            return mappings;
        }
    }

    async upsertMapping(obj: UdcMapping) {
        await this.fieldsService.upsertField(obj);
        let retVal = await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(UdcMappingsScheme.Name).upsert(obj);
        return retVal;
    }
}