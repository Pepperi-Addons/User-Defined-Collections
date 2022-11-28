import jwt from 'jwt-decode';
import { AddonData, Collection, FindOptions, PapiClient } from '@pepperi-addons/papi-sdk';
import { Injectable } from '@angular/core';

import { PepHttpService, PepSessionService } from '@pepperi-addons/ngx-lib';
import { UtilitiesService } from './utilities.service';
import { PepDialogData } from '@pepperi-addons/ngx-lib/dialog';
import { TranslateService } from '@ngx-translate/core';
import { existingErrorMessage, existingInRecycleBinErrorMessage } from 'udc-shared';

@Injectable({ providedIn: 'root' })
export class CollectionsService {
    constructor(
        public session:  PepSessionService,
        private pepHttp: PepHttpService,
        private utilities: UtilitiesService,
        private translate: TranslateService
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
            return collection.DocumentKey.Type === 'Composite'
        })
    }
    
    async upsertCollection(obj: Collection) {
        return await this.utilities.papiClient.userDefinedCollections.schemes.upsert(obj);
    }
    
    async createCollection(obj: Collection) {
        return await this.utilities.papiClient.addons.api.uuid(this.utilities.addonUUID).file('api').func('create').post(undefined, obj);
    } 
    
    async getContainedCollections(params?: FindOptions) {
        return (await this.utilities.papiClient.userDefinedCollections.schemes.find(params)).filter(x => x.Type === 'contained');
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
