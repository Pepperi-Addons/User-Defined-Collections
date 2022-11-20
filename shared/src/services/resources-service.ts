import { AddonData, SearchBody } from "@pepperi-addons/papi-sdk";

export abstract class IResourcesServices {
    constructor() {}

    abstract getByKey(resourceName: string, objKey: string): Promise<AddonData>;

    abstract getByUniqueField(resourceName: string, fieldID: string, fieldValue: string): Promise<AddonData>;
    
    abstract search(resourceName: string, params: SearchBody): Promise<AddonData[]>;
}