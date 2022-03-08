import jwt from 'jwt-decode';
import { AddonData, Collection, FindOptions, PapiClient } from '@pepperi-addons/papi-sdk';
import { Injectable } from '@angular/core';

import { PepHttpService, PepSessionService } from '@pepperi-addons/ngx-lib';

export type FormMode = 'Add' | 'Edit';
export const EMPTY_OBJECT_NAME = 'NewCollection';
@Injectable({ providedIn: 'root' })
export class UtilitiesService {
    
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
                Fields: {},
                ListView: {
                    Type: 'Grid',
                    Fields: [],
                },
            };
        }
    }

    async getCollectionDocuments(collectionName: string, options: FindOptions = {}): Promise<AddonData[]> {
        return await this.papiClient.userDefinedCollections.documents(collectionName).find(options);
    }
        
}
