import jwt from 'jwt-decode';
import { AddonData, AddonDataScheme, Collection, FindOptions, PapiClient } from '@pepperi-addons/papi-sdk';
import { Injectable } from '@angular/core';

import { EMPTY_OBJECT_NAME, RebuildStatus, COLLECTIONS_FUNCTION_NAME, DOCUMENTS_FUNCTION_NAME, ADDONS_BASE_URL, API_FILE_NAME, API_PAGE_SIZE, SEARCH_DOCUMENTS_FUNCTION_NAME} from '../entities';
import { config } from '../addon.config';
import { PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { TranslateService } from '@ngx-translate/core';

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
        private pepHttp: PepHttpService,
        private translate: TranslateService,
        private dialogService: PepDialogService
    ) {
        this.addonUUID = config.AddonUUID;
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
                SyncData: {
                    Sync: true,
                    SyncFieldLevel: false
                },
                GenericResource: true,
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
            // DI-21452 - is there are no indexed fields, search only on 'Key'
            if (searchFields.length === 0) {
                options.where += `Key LIKE '${params.searchString}%'`;
            }
            else {
                options.where += this.getWhereClause(params.searchString, searchFields);
            }
        }

        const qs = UtilitiesService.encodeQueryParams({resource_name: collectionName});
        const url = qs ? `${SEARCH_DOCUMENTS_FUNCTION_NAME}?${qs}`: SEARCH_DOCUMENTS_FUNCTION_NAME;
        
        return await this.addonService.postAddonApiCall(config.AddonUUID, API_FILE_NAME, url, options).toPromise();
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
            
    async getReferenceResources(): Promise<AddonDataScheme[]> {
        const resources = await this.papiClient.resources.resource('resources').get();
        return (resources as AddonDataScheme[]).filter(x => x.Type != 'contained' && x.Name != 'resources');
    }

    showMessageDialog(title: string, content: string) {
        const dataMsg = new PepDialogData({
            title: title,
            actionsType: 'close',
            content: content
        });
        this.dialogService.openDefaultDialog(dataMsg);
    }
}
