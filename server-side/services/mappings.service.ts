import { Client } from "@pepperi-addons/debug-server/dist";
import { AddonData, FindOptions } from "@pepperi-addons/papi-sdk";
import { UdcMappingsScheme } from "../metadata";
import { UtilitiesService } from "./utilities.service";
    
export class MappingsService {
    
    utilities: UtilitiesService = new UtilitiesService(this.client);
    
    constructor(private client: Client) {
    }
    
    async getMappings(params: FindOptions) {
        return await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(UdcMappingsScheme.Name).find(params);
    }

    async upsertMapping(obj: AddonData) {
        return await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(UdcMappingsScheme.Name).upsert(obj);
    }
}