import jwt from 'jwt-decode';
import { AddonData, Collection, PapiClient } from '@pepperi-addons/papi-sdk';
import { Injectable } from '@angular/core';

import { PepHttpService, PepSessionService } from '@pepperi-addons/ngx-lib';
import { UtilitiesService } from './utilities.service';

@Injectable({ providedIn: 'root' })
export class CollectionsService {
    constructor(
        public session:  PepSessionService,
        private pepHttp: PepHttpService,
        private utilities: UtilitiesService
    ) {
    }

    async getCollections(hidden: boolean = false, params: any) {
        let options: any = {
            where: ''
        };
        if (hidden) {
            options.include_deleted = true;
            if (params.searchString) {
                options.where = `Hidden = true And Name LIKE "%${params.searchString}%"`;
            }
            else {
                options.where = `Hidden = true`;
            }
        }
        else if (params.searchString) {
            options.where = `Name LIKE "%${params.searchString}%"`;
        }
        return await this.utilities.papiClient.userDefinedCollections.schemes.find(options);
    }

    async getMappingsCollections() {
        const collections = await this.utilities.papiClient.userDefinedCollections.schemes.find();
        return collections.filter(collection => {
            return collection.Type === 'cpi_meta_data' && collection.DocumentKey.Type === 'Composite'
        })
    }
    
    async upsertCollection(obj: Collection) {
        return await this.utilities.papiClient.userDefinedCollections.schemes.upsert(obj);
    }

    async createCollection(obj: Collection) {
        return await this.utilities.papiClient.addons.api.uuid(this.utilities.addonUUID).file('api').func('create').post(undefined, obj);
} 
}
