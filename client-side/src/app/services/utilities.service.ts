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
                    Columns: [],
                },
            };
        }
    }

    async getCollectionDocuments(collectionName: string, params: any = {}, searchFields: string[] = [], hidden: boolean = false): Promise<AddonData[]> {
        const pageSize = (params.toIndex - params.fromIndex) + 1 || 50;
        const options: FindOptions = {
            page: (params.fromIndex / pageSize) + 1 || 1,
            page_size: pageSize,
            where: ''
        };

        if (hidden) {
            options.include_deleted = true;
            options.where = 'Hidden = true';
        }

        if (params.searchString) {
            options.where += this.getWhereClause(params.searchString, searchFields);
        }

        return await this.papiClient.userDefinedCollections.documents(collectionName).find(options);
    }

    getWhereClause(searchString: string, fields: string[]) {
        let whereClause = '';
        fields.forEach(field => {
            whereClause += `${field} LIKE "%${searchString}%" OR `;
        })
        return whereClause.substring(0, whereClause.length - 3);
    }

    getErrors(message:string): string[] {
        const start = message.indexOf('exception:') + 10;
        const end = message.indexOf('","detail');
        const errors = message.substring(start, end).split("\\n");
        return errors;
    }
        
}
