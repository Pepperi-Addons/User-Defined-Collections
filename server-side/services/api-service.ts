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

    async upsert(collectionName: string, document: AddonData, awaitIndexing: boolean = false): Promise<AddonData> {
        return await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(collectionName).upsert(document, awaitIndexing);
    }

    async getByKey(collectionName: string, docKey: string): Promise<AddonData> {
        return await this.utilities.papiClient.addons.data.uuid(this.client.AddonUUID).table(collectionName).key(docKey).get();
    }

    async search(collectionName: string, params: SearchBody): Promise<SearchData<AddonData>> {
        //DI-22105 - until ADAL will support string array, we are converting fields to string
        const newParams: any = {...params}
        if (params.Fields) {
            newParams.Fields = params.Fields.join(',');
        }
        return await this.utilities.papiClient.addons.data.search.uuid(this.client.AddonUUID).table(collectionName).post(newParams);
    }

    async findCollectionByName(collectionName: string): Promise<Collection> {
        return await this.utilities.papiClient.addons.data.schemes.name(collectionName).get() as Collection;
    }
}