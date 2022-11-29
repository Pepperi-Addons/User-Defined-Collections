import jwt from 'jwt-decode';
import { AddonData, AddonDataScheme, Collection, FindOptions, PapiClient, SchemeField } from '@pepperi-addons/papi-sdk';
import { Injectable, TemplateRef } from '@angular/core';

import { PepAddonService, PepHttpService, PepSessionService } from '@pepperi-addons/ngx-lib';
import { ADDONS_BASE_URL, API_FILE_NAME, COLLECTIONS_FUNCTION_NAME, DOCUMENTS_FUNCTION_NAME, EMPTY_OBJECT_NAME, SelectOptions } from '../entities';
import { config } from '../addon.config';
import { PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { TranslateService } from '@ngx-translate/core';
import { ComponentType } from '@angular/cdk/portal';
import { MatDialogRef } from '@angular/material/dialog';

@Injectable({ providedIn: 'root' })
export class UtilitiesService {

    constructor(
        public session:  PepSessionService,
        private httpService: PepHttpService,
        private translate: TranslateService,
        private dialogService: PepDialogService
    ) { }

    async getCollectionByName(collectionName: string): Promise<Collection> {
        if (collectionName !== EMPTY_OBJECT_NAME) {
            const url = this.getAddonApiURL(COLLECTIONS_FUNCTION_NAME, {name: collectionName});
            return await this.httpService.getPapiApiCall(url).toPromise();
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
        const url = this.getAddonApiURL(DOCUMENTS_FUNCTION_NAME, { name: collectionName, ...options });
        return await this.httpService.getPapiApiCall(url).toPromise();
    }

    getWhereClause(searchString: string, fields: string[]) {
        let whereClause = '';
        fields.forEach(field => {
            whereClause += `${field} LIKE "%${searchString}%" OR `;
        })
        return whereClause.substring(0, whereClause.length - 3);
    }

    getErrors(message: string): string[] {
        const start = message.indexOf('exception:') + 10;
        const end = message.indexOf('","detail');
        const errors = message.substring(start, end).split("\\n");
        return errors;
    }
            
    async getReferenceResources(): Promise<AddonDataScheme[]> {
        const resources = await this.httpService.getPapiApiCall('/resources/resources').toPromise();
        return (resources as AddonDataScheme[]).filter(x => x.Type != 'contained' && x.Name != 'resources');
    }
    
    async getResourceFields(resourceName: string): Promise<AddonDataScheme['Fields']> {
        const resource: AddonDataScheme = await this.httpService.getPapiApiCall(`/resources/resources/key/${resourceName}`).toPromise();
        let fields = {}
        if (resource) {
            fields = resource.Fields;
        }
        return fields;
    }

    showMessageDialog(title: string, content: string) {
        const dataMsg = new PepDialogData({
            title: title,
            actionsType: 'close',
            content: content
        });
        this.dialogService.openDefaultDialog(dataMsg);
    }

    async getAbstractSchemes() {
        const papiClient = new PapiClient({
            baseURL: this.session.getPapiBaseUrl(),
            token: this.session.getIdpToken(),
            suppressLogging: true
        });

        const schemes = await papiClient.addons.data.schemes.get({});
        return schemes.filter(scheme => scheme.Type === 'abstract');
    }

    openComponentInDialog(ref: ComponentType<unknown> | TemplateRef<unknown>, data: any, callback: (value:any)=>void) {
        const dialogConfig = this.dialogService.getDialogConfig();
        this.dialogService.openDialog(ref, data).afterClosed().subscribe(value=> {
            if (callback) {
                callback(value);
            }
        })
    }

    getAddonApiURL(functionName: string, params: any = {}) {
        const paramsQS = UtilitiesService.encodeQueryParams(params);
        const query = paramsQS ? `?${paramsQS}` : '';
        return `${ADDONS_BASE_URL}/${config.AddonUUID}/${API_FILE_NAME}/${functionName}${query}`;
    }

    private static encodeQueryParams(params: any) {
        const ret: string[] = [];

        Object.keys(params).forEach((key) => {
            ret.push(key + '=' + encodeURIComponent(params[key]));
        });

        return ret.join('&');
    }
}
