import { AddonData, Collection, FindOptions, SearchBody } from "@pepperi-addons/papi-sdk";

export abstract class IApiService {
    constructor () {}

    abstract find(collectionName: string, options: FindOptions): Promise<AddonData[]>;

    abstract upsert(collectionName: string, document: AddonData): Promise<AddonData>;

    abstract getByKey(collectionName: string, documentKey: string): Promise<AddonData>;

    abstract search(collectionName: string, params: SearchBody): Promise<AddonData>;

    abstract findCollectionByName(collectionName: string): Promise<Collection>
}

export default IApiService;