import jwt from 'jwt-decode';
import { AddonData, Collection, PapiClient } from '@pepperi-addons/papi-sdk';
import { Injectable } from '@angular/core';

import { PepHttpService, PepSessionService } from '@pepperi-addons/ngx-lib';

export type FormMode = 'Add' | 'Edit';
export const EMPTY_OBJECT_NAME = 'NewCollection';
@Injectable({ providedIn: 'root' })
export class CollectionsService {
    
    accessToken = '';
    parsedToken: any
    papiBaseURL = ''
    addonUUID;

    get papiClient(): PapiClient {
        return new PapiClient({
            baseURL: this.papiBaseURL,
            token: this.session.getIdpToken(),
            addonUUID: this.addonUUID,
            suppressLogging:true
        })
    }

    constructor(
        public session:  PepSessionService,
        private pepHttp: PepHttpService
    ) {
        const accessToken = this.session.getIdpToken();
        this.parsedToken = jwt(accessToken);
        this.papiBaseURL = this.parsedToken["pepperi.baseurl"];
    }

    async getCollections(hidden: boolean = false, params: any) {
        let options: any = {};
        if (hidden) {
            options.include_deleted = true;
            options.where ='Hidden = true';
        }
        if (params.searchString) {
            options.where = `Name LIKE ${params.searchString} OR Description LIKE ${params.searchString}`;
        }
        return await this.papiClient.userDefinedCollections.schemes.find(options);
    }
    
    async upsertCollection(obj: Collection) {
        return await this.papiClient.userDefinedCollections.schemes.upsert(obj);
    }

    async getCollectionByName(collectionName: string): Promise<Collection> {
        if (collectionName !== EMPTY_OBJECT_NAME) {
            return await this.papiClient.userDefinedCollections.schemes.name(collectionName).get();
        }
        else {
            return {
                Name: '',
                DocumentKey: {
                    Delimiter: '@',
                    Type: 'AutoGenerate',
                    Fields: []
                },
                Fields: {}
            };
        }
    }

    async getCollectionDocuments(collectionName: string): Promise<AddonData[]> {
        return await this.papiClient.userDefinedCollections.documents(collectionName).find();
    }
        
}
