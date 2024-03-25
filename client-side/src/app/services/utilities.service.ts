import jwt from 'jwt-decode';
import { Injectable, TemplateRef } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { ComponentType } from '@angular/cdk/portal';
import { MatSnackBarRef } from '@angular/material/snack-bar';

import { AddonData, AddonDataScheme, AuditLog, Collection, FindOptions, PapiClient, SchemeField, SearchBody, SearchData } from '@pepperi-addons/papi-sdk';

import { PepAddonService, PepHttpService, PepSessionService } from '@pepperi-addons/ngx-lib';
import { PepDialogActionsType, PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { PepSnackBarService } from '@pepperi-addons/ngx-lib/snack-bar';

import { FileStatusPanelComponent } from '@pepperi-addons/ngx-composite-lib/file-status-panel';

import { EMPTY_OBJECT_NAME, RebuildStatus, COLLECTIONS_FUNCTION_NAME, DOCUMENTS_FUNCTION_NAME, ADDONS_BASE_URL, API_FILE_NAME, API_PAGE_SIZE, SEARCH_DOCUMENTS_FUNCTION_NAME, DeletionStatus, DATA_FOR_COLLECTION_FORM_FUNCTION_NAME } from '../entities';
import { config } from '../addon.config';
import { DataForCollectionForm } from 'udc-shared/src/entities'
import { IPepGenericListParams } from '@pepperi-addons/ngx-composite-lib/generic-list';

@Injectable({ providedIn: 'root' })
export class UtilitiesService {
    constructor(
        public session: PepSessionService,
        private httpService: PepHttpService,
        private addonService: PepAddonService,
        private dialogService: PepDialogService,
    ) { }

    async getCollectionByName(collectionName: string): Promise<Collection> {
        if (collectionName !== EMPTY_OBJECT_NAME) {
            const url = this.getFunctionURL(COLLECTIONS_FUNCTION_NAME, { name: collectionName });
            return await this.addonService.getAddonApiCall(config.AddonUUID, API_FILE_NAME, url).toPromise();
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

    async getDataForCollectionForm(collectionName: string): Promise<DataForCollectionForm> {
        const url = this.getFunctionURL(DATA_FOR_COLLECTION_FORM_FUNCTION_NAME, { collection_name: collectionName });
        return await this.addonService.getAddonApiCall(config.AddonUUID, API_FILE_NAME, url).toPromise();
    }

    async getCollectionDocuments(collectionName: string, params: IPepGenericListParams = {}, searchFields: string[] = [], hidden: boolean = false, listViewFields: string[] = []): Promise<SearchData<AddonData>> {
        const pageSize = (params.toIndex - params.fromIndex) + 1 || API_PAGE_SIZE;
        const page = params.pageIndex || (params.fromIndex / pageSize) + 1 || 1;
        const options: any = {
            Page: page,
            MaxPageSize: pageSize,
            IncludeCount:true,
            Where: ""
        };

        if (hidden) {
            options.IncludeDeleted = true;
            options.Where = 'Hidden = true';
        }

        if (params.searchString) {
            // DI-21452 - is there are no indexed fields, search only on 'Key'
            if (searchFields.length === 0) {
                options.Where += `Key LIKE '${params.searchString}%'`;
            }
            else {
                options.Where += this.getWhereClause(params.searchString, searchFields);
            }
        }

        if (listViewFields.length > 0) {
            options.Fields = listViewFields;
        }

        const qs = UtilitiesService.encodeQueryParams({ resource_name: collectionName });
        const url = qs ? `${SEARCH_DOCUMENTS_FUNCTION_NAME}?${qs}` : SEARCH_DOCUMENTS_FUNCTION_NAME;

        return await this.addonService.postAddonApiCall(config.AddonUUID, API_FILE_NAME, url, options).toPromise();
    }

    getWhereClause(searchString: string, fields: string[]) {
        let whereClause = '';
        fields.forEach(field => {
            whereClause += `${field} LIKE "%${searchString}%" OR `;
        })
        return whereClause.substring(0, whereClause.length - 3);
    }

    getErrors(message: string): string[] {
        let errors = [message];
        const start = message.indexOf('exception:') + 10;
        if (start > 9) {
            errors = message.substring(start).split("\n");
        }
        return errors;
    }

    async getResourceFields(resourceName: string): Promise<AddonDataScheme['Fields']> {
        const resource: AddonDataScheme = await this.httpService.getPapiApiCall(`/resources/resources/key/${resourceName}`).toPromise();
        let fields = {}
        if (resource) {
            fields = resource.Fields;
        }
        return fields;
    }

    showMessageDialog(title: string, content: string, actionsType: PepDialogActionsType = 'close', callback: (value) => void = undefined) {
        const dataMsg = new PepDialogData({
            title: title,
            actionsType: actionsType,
            content: content
        });
        this.dialogService.openDefaultDialog(dataMsg).afterClosed().subscribe(value => {
            if (callback) {
                callback(value);
            }
        });
    }

    async getAbstractSchemes() {
        const papiClient = new PapiClient({
            baseURL: this.session.getPapiBaseUrl(),
            token: this.session.getIdpToken(),
            suppressLogging: true
        });

        const abstractSchemes = await papiClient.addons.data.schemes.get({ page_size: 500, where: "Type='abstract'" });
        return abstractSchemes;
    }

    openComponentInDialog(ref: ComponentType<unknown> | TemplateRef<unknown>, data: any, callback: (value: any) => void) {
        const dialogConfig = this.dialogService.getDialogConfig({}, 'large');
        this.dialogService.openDialog(ref, data, dialogConfig).afterClosed().subscribe(value => {
            if (callback) {
                callback(value);
            }
        })
    }

    getFunctionURL(functionName: string, params: any = {}) {
        const paramsQS = UtilitiesService.encodeQueryParams(params);
        const query = paramsQS ? `?${paramsQS}` : '';
        return `${functionName}${query}`;
    }

    private static encodeQueryParams(params: any) {
        const ret: string[] = [];

        Object.keys(params).forEach((key) => {
            ret.push(key + '=' + encodeURIComponent(params[key]));
        });

        return ret.join('&');
    }

    isValidDate(d) {
        return d instanceof Date && !isNaN(d.getTime());
    }
}
