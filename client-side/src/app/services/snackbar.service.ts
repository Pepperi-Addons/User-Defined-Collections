import { Injectable, TemplateRef } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { MatSnackBarRef } from '@angular/material/snack-bar';


import { PepAddonService, PepHttpService, PepSessionService } from '@pepperi-addons/ngx-lib';
import { PepSnackBarService } from '@pepperi-addons/ngx-lib/snack-bar';

import { FileStatusPanelComponent } from '@pepperi-addons/ngx-composite-lib/file-status-panel';

import {  RebuildStatus, DeletionStatus} from '../entities';
import { CollectionsService } from "../services/collections.service";
import { AuditLog } from '@pepperi-addons/papi-sdk';


@Injectable({ providedIn: 'root' })
export class SnackbarService {
    
    private currentSnackBar: MatSnackBarRef<FileStatusPanelComponent> | null = null;
    private cleanRebuilds: RebuildStatus[] = []
    private cleanRebuildsIndex = 0;

    private deletionIndex = 0;
    private deletionStatus: DeletionStatus[] = []

    constructor(
        public session:  PepSessionService,
        private httpService: PepHttpService,
        private translate: TranslateService,
        private snackBarService: PepSnackBarService,
        private collectionsService: CollectionsService,

    ) { }

    private updateSnackBar(content: RebuildStatus[] | DeletionStatus[], title: string,) {
        if (!this.currentSnackBar?.instance || this.currentSnackBar.instance.data.title != title) {
            this.currentSnackBar = this.snackBarService.openSnackBarFromComponent(FileStatusPanelComponent, {
                title: title,
                content: content
            })
            this.currentSnackBar.instance.closeClick.subscribe(() => {
                this.currentSnackBar = null;
            });
        }
        else {
            this.currentSnackBar.instance.data.content = content;
            if (content.length === 0) {
                this.currentSnackBar.instance.snackBarRef.dismiss();
                this.currentSnackBar = null;
            }
        }
    }

    private async pollAuditLog(auditLog: string, statusObj: RebuildStatus | DeletionStatus, title: string, statusObjects: RebuildStatus[] | DeletionStatus[] ): Promise<string> {
        
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
                    this.updateSnackBar(statusObjects, title);
                    break;
                case 'Success':
                    console.log(`operation succeeded`);
                    break;
                default:
                    statusObj.status = "failed";
                    console.log(`operation failed with an unknown audit log type: ${result["Status"]}`);
                    this.updateSnackBar(statusObjects, title);
            }
            return result.AuditInfo.ErrorMessage;
        }
        catch (ex) {
            console.error(`clean rebuild exception: ${JSON.stringify(ex)}`);
            statusObj.status = "failed";
            this.updateSnackBar(this.deletionStatus, title);
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
        const cleanRebuildSnackBarTitle = this.translate.instant('CleanRebuild_SnackBar_Title');
        this.updateSnackBar(this.cleanRebuilds, cleanRebuildSnackBarTitle);
        const error = await this.pollAuditLog(auditLog, status, cleanRebuildSnackBarTitle, this.cleanRebuilds);
        if (error === undefined) {
            status.status = 'done';
            this.updateSnackBar(this.cleanRebuilds, cleanRebuildSnackBarTitle);
        }
    }

    async handleCollectionDeletion(collectionName: string){
        const deleteCollectionSnackBarTitle = this.translate.instant("DeleteCollection_SnackBar_Title");

        let deletionStatus = this.createDeleteStatusObject(collectionName);

        this.deletionStatus.push(deletionStatus);
        this.updateSnackBar( this.deletionStatus, deleteCollectionSnackBarTitle);

        const res = await this.collectionsService.deleteCollection(collectionName); // if hard_delete takes less than 30 seconds, deletedCounter is returned, else- executionUUID of async operation

        if(res['ExecutionUUID']){
            const error = await this.pollAuditLog(res['URI'], deletionStatus, deleteCollectionSnackBarTitle, this.cleanRebuilds);
            if (error === undefined) {
                deletionStatus.status = 'done';
                this.updateSnackBar( this.deletionStatus, deleteCollectionSnackBarTitle);
            }
        } else{
            deletionStatus.status = 'done';
            this.updateSnackBar( this.deletionStatus, deleteCollectionSnackBarTitle);
        }
    }

    private createDeleteStatusObject(collectionName): DeletionStatus {
        return {
            key: this.deletionIndex++,
            name: collectionName,
            status: 'deleting'
        }
    }
}
