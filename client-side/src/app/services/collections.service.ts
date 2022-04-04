import jwt from 'jwt-decode';
import { AddonData, Collection, PapiClient } from '@pepperi-addons/papi-sdk';
import { Injectable } from '@angular/core';

import { PepHttpService, PepSessionService } from '@pepperi-addons/ngx-lib';
import { EMPTY_OBJECT_NAME, UtilitiesService } from './utilities.service';

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
            options.where ='Hidden = true';
        }
        if (params.searchString) {
            options.where = `Name LIKE ${params.searchString} OR Description LIKE ${params.searchString}`;
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
}
