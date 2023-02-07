import '@pepperi-addons/cpi-node'
import { IResourcesServices } from "udc-shared";
import { AddonData, AddonDataScheme, Collection, SearchBody, SearchData } from '@pepperi-addons/papi-sdk'


export class ResourcesService extends IResourcesServices {

    constructor() {
        super();
    }

    async getByKey(resourceName: string, itemKey: string): Promise<AddonData> {
        const addonUUID = await this.getResourceAddonUUID(resourceName);
        return await pepperi.addons.data.uuid(addonUUID).table(resourceName).key(itemKey).get();
    }

    async getByUniqueField(resourceName: string, fieldID: string, fieldValue: string): Promise<AddonData> {
        const body: any = {
            UniqueFieldID: fieldID,
            UniqueFieldList: [fieldValue]
        }
        return await this.search(resourceName, body);
    }

    async search(resourceName: string, params: SearchBody): Promise<SearchData<AddonData>> {
        const addonUUID = await this.getResourceAddonUUID(resourceName);
        return (await pepperi.addons.data.uuid(addonUUID).table(resourceName).search(params));
    }
    
    async getResourceAddonUUID(resourceName): Promise<string> {
        const resourceScheme = await this.getResourceScheme(resourceName);
        let addonUUID = '';
        if(resourceScheme) {
            addonUUID = resourceScheme.AddonUUID || '';
        }
        return addonUUID;
    }

    async getSchemeByKey(resourceName: string): Promise<AddonDataScheme> {
        return await pepperi.resources.resource('resources').key(resourceName).get() as AddonDataScheme;
    }
}