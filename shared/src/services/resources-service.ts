import { AddonData, SearchBody, SearchData, Collection, AddonDataScheme } from "@pepperi-addons/papi-sdk";

export abstract class IResourcesServices {
        
    referenceSchemes: {
        [key: string]: Collection
    } = {};

    constructor() {}

    abstract getByKey(resourceName: string, objKey: string): Promise<AddonData>;

    abstract getByUniqueField(resourceName: string, fieldID: string, fieldValue: string): Promise<AddonData>;
    
    abstract search(resourceName: string, params: SearchBody): Promise<SearchData<AddonData>>;

    abstract getSchemeByKey(resourceName: string): Promise<AddonDataScheme>;

    async getResourceScheme(resourceName: string): Promise<Collection> {
        let resourceScheme = this.referenceSchemes[resourceName];
        if(!resourceScheme) {
            resourceScheme = await this.getSchemeByKey(resourceName) as Collection;
            this.referenceSchemes[resourceName] = resourceScheme;
        }
        return resourceScheme;
    }
}