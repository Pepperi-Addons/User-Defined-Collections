import { Client } from "@pepperi-addons/debug-server/dist";
import { AddonData, SearchBody } from "@pepperi-addons/papi-sdk";
import { IResourcesServices } from "udc-shared";
import { UtilitiesService } from "./utilities.service";

export class ResourcesService extends IResourcesServices {
    utilities = new UtilitiesService(this.client);
    constructor(private client: Client) {
        super();
    }

    async getByKey(resourceName: string, itemKey: string): Promise<AddonData> {
        return await this.utilities.papiClient.resources.resource(resourceName).key(itemKey).get();
    }

    async getByUniqueField(resourceName: string, fieldID: string, fieldValue: string): Promise<AddonData> {
        return await this.utilities.papiClient.resources.resource(resourceName).unique(fieldID).get(fieldValue);
    }

    async search(resourceName: string, params: SearchBody): Promise<AddonData[]> {
        return await this.utilities.papiClient.resources.resource(resourceName).search(params);
    }
}