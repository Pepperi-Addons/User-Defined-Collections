import jwt from 'jwt-decode';
import { Injectable, TemplateRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ComponentType } from '@angular/cdk/portal';

import { AddonData, AddonDataScheme, AuditLog, Collection, FindOptions, PapiClient, SchemeField } from '@pepperi-addons/papi-sdk';

import { PepHttpService, PepSessionService } from '@pepperi-addons/ngx-lib';
import { PepDialogActionsType, PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { PepSnackBarService } from '@pepperi-addons/ngx-lib/snack-bar';

import { FileStatusPanelComponent } from '@pepperi-addons/ngx-composite-lib/file-status-panel';

import { MatSnackBarRef } from '@angular/material/snack-bar';

import { EMPTY_OBJECT_NAME, RebuildStatus, SelectOptions } from '../entities';
import { config } from '../addon.config';

@Injectable({ providedIn: 'root' })
export class UtilitiesService {
    
    accessToken = '';
    parsedToken: any
    papiBaseURL = ''
    addonUUID;

    private currentSnackBar: MatSnackBarRef<FileStatusPanelComponent> | null = null;
    private cleanRebuilds: RebuildStatus[] = []
    private cleanRebuildsIndex = 0;

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
        private dialogService: PepDialogService,
        private snackBarService: PepSnackBarService
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
            
    async getReferenceResources(): Promise<AddonDataScheme[]> {
        const resources = await this.papiClient.resources.resource('resources').get();
        return (resources as AddonDataScheme[]).filter(x => x.Type != 'contained' && x.Name != 'resources');
    }

    async getResourceFields(resourceName: string): Promise<AddonDataScheme['Fields']> {
        const resource: AddonDataScheme = await this.papiClient.resources.resource('resources').key(resourceName).get() as AddonDataScheme;
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
            baseURL: this.papiBaseURL,
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

    private async pollAuditLog(auditLog: string, statusObj: RebuildStatus) {
        console.log(`polling clean rebuild process with executionUUID: ${auditLog}`);
        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
        const waitingTime = 1000; //in ms
        try {
            let result: AuditLog;
            while (true) {
                result = await this.papiClient.auditLogs.uuid(auditLog).get() as AuditLog;

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
                case 'Success':
                    console.log(`operation succeeded`);
                default:
                    statusObj.status = "failed";
                    console.log(`operation failed with an unknown audit log type: ${result["Status"]}`);
                    this.updateSnackBar();
                    return null
            }
        }
        catch (ex) {
            console.error(`clean rebuild exception: ${ex}`);
            statusObj.status = "failed";
            this.updateSnackBar();
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
        await this.pollAuditLog(auditLog, status);
        status.status = 'done';
        this.updateSnackBar();
    }
}
