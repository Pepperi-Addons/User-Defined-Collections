import jwt from 'jwt-decode';
import { AddonData, Collection, PapiClient } from '@pepperi-addons/papi-sdk';
import { Injectable } from '@angular/core';

import { PepAddonService, PepHttpService, PepSessionService } from '@pepperi-addons/ngx-lib';
import { UtilitiesService } from './utilities.service';
import { config } from '../addon.config';
import { API_FILE_NAME, CREATE_FUNCTION_NAME, DOCUMENTS_FUNCTION_NAME, DELETE_FUNCTION_NAME } from '../entities';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
    
    constructor(
        public session:  PepSessionService,
        private httpService: PepHttpService,
        private addonService: PepAddonService,
        private UtilitiesService: UtilitiesService
    ) {
    }
    
    async upsertDocument(collectionName: string, obj: AddonData) {   
        const url = this.UtilitiesService.getFunctionURL(DOCUMENTS_FUNCTION_NAME, {name: collectionName});
        return await this.addonService.postAddonApiCall(config.AddonUUID, API_FILE_NAME, url, obj).toPromise();
    }
    
    async createDocument(collectionName: string, obj: AddonData) {
        const url = this.UtilitiesService.getFunctionURL(CREATE_FUNCTION_NAME, {collection_name: collectionName});
        return await this.addonService.postAddonApiCall(config.AddonUUID, API_FILE_NAME, url, obj).toPromise();
    }

    async deleteDocument(collectionName: string, key: string){
        const url = this.UtilitiesService.getFunctionURL(DELETE_FUNCTION_NAME, {collection_name: collectionName, key: key});
        return await this.addonService.postAddonApiCall(config.AddonUUID, API_FILE_NAME, url).toPromise();
    }
}
