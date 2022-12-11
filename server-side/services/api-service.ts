import { Client } from "@pepperi-addons/debug-server/dist";
import { AddonData, Collection, FindOptions, SearchBody, SearchData } from "@pepperi-addons/papi-sdk";
import { IApiService } from "udc-shared";
import { UtilitiesService } from "./utilities.service";

export class ApiService extends IApiService {
    utilities = new UtilitiesService(this.client);

    constructor(private client: Client) {
        super();
    }

    async find(collectionName: string, options: FindOptions): Promise<AddonData[]> {
        return await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(collectionName).find(options);
    }

    async upsert(collectionName: string, document: AddonData): Promise<AddonData> {
        return await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(collectionName).upsert(document);
    }

    async getByKey(collectionName: string, docKey: string): Promise<AddonData> {
        return await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(collectionName).key(docKey).get();
    }

    async search(collectionName: string, params: SearchBody): Promise<SearchData<AddonData>> {
        return await this.utilities.papiClient.addons.data.search.uuid(this.client.AddonUUID).table(collectionName).post(params);
    }

    async findCollectionByName(collectionName: string): Promise<Collection> {
        return await this.utilities.papiClient.addons.data.schemes.name(collectionName).get() as Collection;
    }
}