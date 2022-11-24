import '@pepperi-addons/cpi-node'
import { IResourcesServices } from "udc-shared";
import { AddonData, SearchBody } from '@pepperi-addons/papi-sdk'


export class ResourcesService extends IResourcesServices {
    
    constructor() {
        super();
    }

    async getByKey(resourceName: string, itemKey: string): Promise<AddonData> {
        return await pepperi.resources.resource(resourceName).key(itemKey).get();
    }

    async getByUniqueField(resourceName: string, fieldID: string, fieldValue: string): Promise<AddonData> {
        return await pepperi.resources.resource(resourceName).unique(fieldID).get(fieldValue);
    }

    async search(resourceName: string, params: SearchBody): Promise<AddonData[]> {
        return (await pepperi.resources.resource(resourceName).search(params)).Objects;
    }
}