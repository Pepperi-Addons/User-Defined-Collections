import jwt from 'jwt-decode';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { Collection, FindOptions, PapiClient } from '@pepperi-addons/papi-sdk';
import { PepAddonService, PepHttpService, PepSessionService } from '@pepperi-addons/ngx-lib';

import { existingErrorMessage, existingInRecycleBinErrorMessage } from 'udc-shared';
import { UtilitiesService } from './utilities.service';
import { API_FILE_NAME, COLLECTIONS_FUNCTION_NAME, CREATE_FUNCTION_NAME, REBUILD_FUNCTION_NAME } from '../entities';
import { config } from '../addon.config';

@Injectable({ providedIn: 'root' })
export class CollectionsService {
    constructor(
        public session:  PepSessionService,
        private httpService: PepHttpService,
        private addonService: PepAddonService,
        private utilities: UtilitiesService,
        private translate: TranslateService,
    ) {
    }

    async getCollections(hidden: boolean = false, params: any = {}): Promise<Collection[]> {
        let options: any = {
            where: '',
            page_size: -1
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
        const url = this.utilities.getFunctionURL(COLLECTIONS_FUNCTION_NAME, options)
        return await this.addonService.getAddonApiCall(config.AddonUUID, API_FILE_NAME, url).toPromise();
    }
    
    async getMappingsCollections() {
        const collections = await this.getCollections();
        return collections.filter(collection => {
            return collection.DocumentKey.Type === 'Composite'
        })
    }
    
    async upsertCollection(obj: Collection) {
        
        return await this.addonService.postAddonApiCall(config.AddonUUID, API_FILE_NAME, COLLECTIONS_FUNCTION_NAME, obj).toPromise();
    }
    
    async createCollection(obj: Collection) {
        return await this.addonService.postAddonApiCall(config.AddonUUID, API_FILE_NAME, CREATE_FUNCTION_NAME, obj).toPromise();
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
            if(errors.length > 1) {
                content = this.translate.instant('Collection_UpdateFailed_Content', {error: errors.map(error=> `<li>${error}</li>`)});
            }
            else {
                content = errorMessage;
            }
        }
        this.utilities.showMessageDialog(title, content);
    }

    async cleanRebuild(collectionName: string): Promise<string> {

        const url = this.utilities.getFunctionURL(REBUILD_FUNCTION_NAME, {collection_name: collectionName});
        const result = await this.addonService.postAddonApiCall(config.AddonUUID, API_FILE_NAME, url, {}).toPromise();
        return result ? result.URI : '';
    }

    isCollectionIndexed(collection: Collection): boolean {
        let result: boolean = false;
        Object.keys(collection.Fields || {}).forEach(fieldName => {
            if (collection.Fields[fieldName].Indexed) {
                result = true;
            }
        })
        return result;
    }

    async handleCleanRebuild(collectionName: string) {
        try {
            const auditLog = await this.cleanRebuild(collectionName);
            if (auditLog) {
                this.utilities.handleCleanRebuild(auditLog, collectionName);
            }
        }
        catch (error) {
            console.log(`clean rebuild for ${collectionName} failed with error: ${error}`);
        }
    }
}
