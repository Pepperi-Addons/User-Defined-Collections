import jwt from 'jwt-decode';
import { Injectable, TemplateRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ComponentType } from '@angular/cdk/portal';
import { MatSnackBarRef } from '@angular/material/snack-bar';

import { AddonData, AddonDataScheme, AuditLog, Collection, FindOptions, PapiClient, SchemeField, SearchBody, SearchData } from '@pepperi-addons/papi-sdk';

import { PepHttpService, PepSessionService } from '@pepperi-addons/ngx-lib';
import { PepDialogActionsType, PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { PepSnackBarService } from '@pepperi-addons/ngx-lib/snack-bar';

import { FileStatusPanelComponent } from '@pepperi-addons/ngx-composite-lib/file-status-panel';

import { EMPTY_OBJECT_NAME, RebuildStatus, COLLECTIONS_FUNCTION_NAME, DOCUMENTS_FUNCTION_NAME, ADDONS_BASE_URL, API_FILE_NAME} from '../entities';
import { config } from '../addon.config';

@Injectable({ providedIn: 'root' })
export class UtilitiesService {
    
    private currentSnackBar: MatSnackBarRef<FileStatusPanelComponent> | null = null;
    private cleanRebuilds: RebuildStatus[] = []
    private cleanRebuildsIndex = 0;

    constructor(
        public session:  PepSessionService,
        private httpService: PepHttpService,
        private translate: TranslateService,
        private dialogService: PepDialogService,
        private snackBarService: PepSnackBarService
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

    async getCollectionDocuments(collectionName: string, params: any = {}, searchFields: string[] = [], hidden: boolean = false): Promise<SearchData<AddonData>> {
        const pageSize = (params.toIndex - params.fromIndex) + 1 || 50;
        const options: SearchBody = {
            Page: (params.fromIndex / pageSize) + 1 || 1,
            PageSize: pageSize,
            Where: '',
            IncludeCount: true,
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

    showMessageDialog(title: string, content: string, actionsType: PepDialogActionsType = 'close', callback: (value) => void = undefined) {
        const dataMsg = new PepDialogData({
            title: title,
            actionsType: actionsType,
            content: content
        });
        this.dialogService.openDefaultDialog(dataMsg).afterClosed().subscribe(value => {
            if(callback) {
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

    private updateSnackBar() {
        if (!this.currentSnackBar?.instance) {
            this.currentSnackBar = this.snackBarService.openSnackBarFromComponent(FileStatusPanelComponent, {
                title: this.translate.instant('CleanRebuild_SnackBar_Title'),
                content: this.cleanRebuilds
            })
            this.currentSnackBar.instance.closeClick.subscribe(() => {
                this.currentSnackBar = null;

            });
        }
        else {
            this.currentSnackBar.instance.data.content = this.cleanRebuilds;
            if (this.cleanRebuilds.length === 0) {
                this.currentSnackBar.instance.snackBarRef.dismiss();
                this.currentSnackBar = null;
            }
        }
    }

    private async pollAuditLog(auditLog: string, statusObj: RebuildStatus): Promise<string> {
        
        console.log(`polling clean rebuild process with URI: ${auditLog}`);
        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
        const waitingTime = 1000; //in ms
        try {
            let result: AuditLog;
            while (true) {
                result = await this.httpService.getPapiApiCall(auditLog).toPromise();

                if (!result || result.Status.ID === 2 || result.Status.ID === 4 || result.Status.ID === 5) {
                    await delay(waitingTime);
                }
                else {
                    break;
                }
            }
            switch (result.Status.Name) {
                case 'Failure':
                    statusObj.status = "failed";
                    console.log(`operation failed with error: ${result.AuditInfo.ErrorMessage}`);
                    this.updateSnackBar();
                    break;
                case 'Success':
                    console.log(`operation succeeded`);
                    break;
                default:
                    statusObj.status = "failed";
                    console.log(`operation failed with an unknown audit log type: ${result["Status"]}`);
                    this.updateSnackBar();
            }
            return result.AuditInfo.ErrorMessage;
        }
        catch (ex) {
            console.error(`clean rebuild exception: ${JSON.stringify(ex)}`);
            statusObj.status = "failed";
            this.updateSnackBar();
            return 'Unknown error occured';
        }
    }

    private createRebuildStatusObject(collectionName): RebuildStatus {
        return {
            key: this.cleanRebuildsIndex++,
            name: collectionName,
            status: 'indexing',
        }
    }

    async handleCleanRebuild(auditLog: string, collectionName: string) {
        let status = this.createRebuildStatusObject(collectionName)
        this.cleanRebuilds.push(status);
        this.updateSnackBar();
        const error = await this.pollAuditLog(auditLog, status);
        if (error === undefined) {
            status.status = 'done';
            this.updateSnackBar();
        }
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

    isValidDate(d) {
        return d instanceof Date && !isNaN(d.getTime());
    }
}
