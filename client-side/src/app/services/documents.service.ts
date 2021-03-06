import jwt from 'jwt-decode';
import { AddonData, Collection, PapiClient } from '@pepperi-addons/papi-sdk';
import { Injectable } from '@angular/core';

import { PepHttpService, PepSessionService } from '@pepperi-addons/ngx-lib';
import { UtilitiesService } from './utilities.service';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
    
    constructor(
        public session:  PepSessionService,
        private pepHttp: PepHttpService,
        private UtilitiesService: UtilitiesService
    ) {
    }
    
    async upsertDocument(collectionName: string, obj: AddonData) {
        await this.UtilitiesService.papiClient.userDefinedCollections.documents(collectionName).upsert(obj);
    }

    async createCollection(collectionName: string, obj: AddonData) {
        return await this.UtilitiesService.papiClient.addons.api.uuid(this.UtilitiesService.addonUUID).file('api').func('create').post({
            collection_name: collectionName
        }, obj);
    }  
}
