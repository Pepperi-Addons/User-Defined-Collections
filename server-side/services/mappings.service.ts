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
    
    async getMappings(params: FindOptions) {
        return await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(UdcMappingsScheme.Name).find(params);
    }

    async upsertMapping(obj: UdcMapping) {
        let retVal = await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(UdcMappingsScheme.Name).upsert(obj);
        await this.fieldsService.upsertField(obj);
        return retVal;
    }
}