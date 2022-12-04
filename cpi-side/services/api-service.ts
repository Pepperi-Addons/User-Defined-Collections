import { FindOptions, AddonData, SearchBody, Collection } from "@pepperi-addons/papi-sdk";
import { IApiService } from "udc-shared";
import config from '../../addon.config.json'

export class ApiService extends IApiService {
    constructor() {
        super();
    }

    async find(collectionName: string, options: FindOptions): Promise<AddonData[]> {
        return (await pepperi.addons.data.uuid(config.AddonUUID).table(collectionName).search({
            Fields: options.fields || [],
            Where: options.where || '',
            Page: options.page || 1,
            PageSize: options.page_size || 100,
            SortBy: options.order_by || ''
        })).Objects;
    }

    async getByKey(collectionName: string, documentKey: string): Promise<AddonData> {
        return await pepperi.addons.data.uuid(config.AddonUUID).table(collectionName).key(documentKey).get();
    }

    async upsert(collectionName: string, document: AddonData): Promise<AddonData> {
        return await pepperi.addons.data.uuid(config.AddonUUID).table(collectionName).upsert(document);
    }

    async search(collectionName: string, params: SearchBody): Promise<AddonData> {
        return (await pepperi.addons.data.uuid(config.AddonUUID).table(collectionName).search(params)).Objects;
    }

    async findCollectionByName(collectionName: string): Promise<Collection> {
        return await pepperi.addons.data.schemes.uuid(config.AddonUUID).name(collectionName).get() as unknown as Collection;
    }
}