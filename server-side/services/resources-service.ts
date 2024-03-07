import { Client } from "@pepperi-addons/debug-server/dist";
import { AddonData, Collection, SearchBody, SearchData } from "@pepperi-addons/papi-sdk";
import { IResourcesServices } from "udc-shared";
import { UtilitiesService } from "./utilities.service";
import { ResourcesForCollectionForm } from "udc-shared/src/entities";

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

    async search(resourceName: string, params: SearchBody): Promise<SearchData<AddonData>> {
        return await this.utilities.papiClient.resources.resource(resourceName).search(params);
    }


    async getResourcesForCollectionForm(collectionName: string): Promise<ResourcesForCollectionForm> {
        const allCOllections = (await this.utilities.papiClient.resources.resource('resources').search({ PageSize: 500 })).Objects;

        // first we get the requested collection
        const collection = allCOllections.find(c => c.Name === collectionName);
        if (!collection) {
            throw new Error(`Collection ${collectionName} not found`);
        }

        // next we need to leave out the collection called "resources"
        const collectionsWithoutResources = allCOllections.filter(c => c.Name !== 'resources');

        // next we get all collections with type="contained" and not including the requested collection
        const containedCollections = collectionsWithoutResources.filter(c => c.Type === 'contained' && c.Name !== collectionName);

        // now we need all collections not including the previously found collections
        const allCollectionsToReturn = collectionsWithoutResources.filter(c => c.Type !== 'contained' && c.Name !== collectionName);

        return {
            Collection: collection as Collection,
            ContainedCollections: containedCollections as Collection[],
            Resources: allCollectionsToReturn as Collection[]
        }
    }

}