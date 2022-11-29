import jwt from 'jwt-decode';
import { AddonData, Collection, FindOptions, PapiClient } from '@pepperi-addons/papi-sdk';
import { Injectable } from '@angular/core';

import { PepAddonService, PepHttpService, PepSessionService } from '@pepperi-addons/ngx-lib';
import { UtilitiesService } from './utilities.service';
import { PepDialogData } from '@pepperi-addons/ngx-lib/dialog';
import { TranslateService } from '@ngx-translate/core';
import { existingErrorMessage, existingInRecycleBinErrorMessage } from 'udc-shared';
import { config } from '../addon.config';
import { COLLECTIONS_FUNCTION_NAME, CREATE_FUNCTION_NAME } from '../entities';

@Injectable({ providedIn: 'root' })
export class CollectionsService {
    constructor(
        public session:  PepSessionService,
        private httpService: PepHttpService,
        private utilities: UtilitiesService,
        private translate: TranslateService
    ) {
    }

    async getCollections(hidden: boolean = false, params: any = {}): Promise<Collection[]> {
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
        const url = this.utilities.getAddonApiURL(COLLECTIONS_FUNCTION_NAME, options)
        return await this.httpService.getPapiApiCall(url).toPromise()
    }
    
    async getMappingsCollections() {
        const collections = await this.getCollections();
        return collections.filter(collection => {
            return collection.DocumentKey.Type === 'Composite'
        })
    }
    
    async upsertCollection(obj: Collection) {
        const url = this.utilities.getAddonApiURL(COLLECTIONS_FUNCTION_NAME);
        return await this.httpService.postPapiApiCall(url, obj).toPromise();
    }
    
    async createCollection(obj: Collection) {
        const url = this.utilities.getAddonApiURL(CREATE_FUNCTION_NAME);
        return await this.httpService.postPapiApiCall(url, obj).toPromise();
    } 
    
    async getContainedCollections(params?: FindOptions) {
        const collections = await this.getCollections();
        return collections.filter(collection => {
            return collection.Type === 'contained'
        })
    }

    showUpsertFailureMessage(errorMessage: string, collectionName: string) {
        let content = '';
        let title = this.translate.instant('Collection_UpdateFailed_Title');
        if (errorMessage.indexOf(existingInRecycleBinErrorMessage) >= 0) {
            content = this.translate.instant('Collection_ExistingRecycleBinError_Content', {collectionName: collectionName});
            this.utilities.showMessageDialog(title, content);
        }
        else if(errorMessage.indexOf(existingErrorMessage) >= 0){
            content = this.translate.instant('Collection_ExistingError_Content', {collectionName: collectionName});
            this.utilities.showMessageDialog(title, content);
        }
        else {
            const errors = this.utilities.getErrors(errorMessage);
            content = this.translate.instant('Collection_UpdateFailed_Content', {error: errors.map(error=> `<li>${error}</li>`)});
        }
        this.utilities.showMessageDialog(title, content);
    }
}
