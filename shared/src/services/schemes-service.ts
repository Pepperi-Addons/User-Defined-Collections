import { Collection } from "@pepperi-addons/papi-sdk";
import IApiService from "./api-service";

// saves cache of existing schemes
export class SchemesService {

    private containedSchemes: {
        [key: string]: Collection
    } = {};
    
    constructor(private apiService: IApiService) {
    }

    // returns the resource, if cached will not get collection again
    public async getResource(resource: string): Promise<Collection> {
        let cachedResource = this.containedSchemes[resource];

        if (cachedResource === undefined) {
            cachedResource = await this.apiService.findCollectionByName(resource);
            this.containedSchemes[resource] = cachedResource;
        }
        
        return cachedResource;
    }
}