import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { IPepFieldClickEvent, PepHttpService, PepLayoutService, PepScreenSizeType } from '@pepperi-addons/ngx-lib';
import { TranslateService } from '@ngx-translate/core';

import { UtilitiesService } from "../services/utilities.service";
import { CollectionsService } from "../services/collections.service";
import { IPepGenericListActions, IPepGenericListDataSource, IPepGenericListPager } from "@pepperi-addons/ngx-composite-lib/generic-list";
import { PepSelectionData } from "@pepperi-addons/ngx-lib/list";
import { PepMenuItem } from "@pepperi-addons/ngx-lib/menu";
import { ActivatedRoute, ActivatedRouteSnapshot, Router } from "@angular/router";
import { PepDialogData, PepDialogService } from "@pepperi-addons/ngx-lib/dialog";
import { AddonDataScheme, AuditLog, Collection } from "@pepperi-addons/papi-sdk";
import { FormMode, EMPTY_OBJECT_NAME, DeletionStatus } from "../entities";
import { config } from "../addon.config";
import { AddCollectionDialogComponent } from "./form/add-collection-dialog/add-collection-dialog.component";
import { FileStatusPanelComponent } from "@pepperi-addons/ngx-composite-lib/file-status-panel";
import { MatSnackBarRef } from "@angular/material/snack-bar";
import { PepSnackBarService } from "@pepperi-addons/ngx-lib/snack-bar";

@Component({
    selector: 'collection-list',
    templateUrl: './collection-list.component.html',
    styleUrls: ['./collection-list.component.scss']
})
export class CollectionListComponent implements OnInit {
    @Input() hostObject: any;
    
    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
    
    screenSize: PepScreenSizeType;

    dataSource: IPepGenericListDataSource;

    pager: IPepGenericListPager = {
        type: 'scroll',
    };

    collections: Collection[] = []
    
    EMPTY_OBJECT_NAME:string = EMPTY_OBJECT_NAME;

    recycleBin: boolean = false;

    deleteError = 'Cannot delete collection with documents';

    listMessages = [];

    abstractSchemes: AddonDataScheme[] = [];

    private currentSnackBar: MatSnackBarRef<FileStatusPanelComponent> | null = null

    private deletionIndex = 0;
    private deletionStatus: DeletionStatus[] = []


    constructor(
        public collectionsService: CollectionsService,
        public layoutService: PepLayoutService,
        public translate: TranslateService,
        public activateRoute: ActivatedRoute,
        public dialogService: PepDialogService,
        private router: Router,
        private utilitiesService:UtilitiesService,
        private snackBarService: PepSnackBarService,
        private httpService: PepHttpService,
    ) {
        this.layoutService.onResize$.subscribe(size => {
            this.screenSize = size;
        });
    }

    ngOnInit() {
        this.recycleBin = this.activateRoute.snapshot.queryParams.recycle_bin == 'true' || false;
        this.menuItems = this.getMenuItems();
        this.translate.get(['RecycleBin_NoDataFound', 'Collection_List_NoDataFound']).subscribe(translations=> {
            this.listMessages = translations;
            this.dataSource = this.getDataSource();
        })
        this.utilitiesService.getAbstractSchemes().then(schemes => {
            this.abstractSchemes = schemes;
        }).catch(error => {
            console.log(`caould not get abstract schemes. error:${error}`);
        })
    }

    getMenuItems() {
        return [
        {
            key: 'RecycleBin',
            text: this.translate.instant('Recycle Bin'),
            hidden: this.recycleBin
        },
        {
            key: 'BackToList',
            text: this.translate.instant('Back to list'),
            hidden: !this.recycleBin
        }]
    }

    getDataSource() {
        const noDataMessageKey = this.recycleBin ? 'RecycleBin_NoDataFound' : 'Collection_List_NoDataFound'
        return {
            init: async(params:any) => {
                this.collections = await this.collectionsService.getCollections(this.recycleBin, params);
                return Promise.resolve({
                    dataView: {
                        Context: {
                            Name: '',
                            Profile: { InternalID: 0 },
                            ScreenSize: 'Landscape'
                        },
                        Type: 'Grid',
                        Title: 'User Defined Collections',
                        Fields: [
                            {
                                FieldID: 'Name',
                                Type: 'Link',
                                Title: this.translate.instant('Name'),
                                Mandatory: false,
                                ReadOnly: true
                            },
                            {
                                FieldID: 'Description',
                                Type: 'TextBox',
                                Title: this.translate.instant('Description'),
                                Mandatory: false,
                                ReadOnly: true
                            },
                        ],
                        Columns: [
                            {
                                Width: 50
                            },
                            {
                                Width: 50
                            }
                        ],
        
                        FrozenColumnsCount: 0,
                        MinimumColumnWidth: 0
                    },
                    totalCount: this.collections.length,
                    items: this.collections
                });
            },
            inputs: {
                pager: {
                    type: 'scroll'
                },
                selectionType: 'single',
                noDataFoundMsg: this.listMessages[noDataMessageKey]
            },
        } as IPepGenericListDataSource
    }

    actions: IPepGenericListActions = {
        get: async (data: PepSelectionData) => {
            const actions = [];
            if (data && data.rows.length == 1) {
                if(this.recycleBin) {
                    actions.push({
                        title: this.translate.instant('Restore'),
                        handler: async (objs) => {
                            let collection = this.collections.find(item => item.Name === objs.rows[0])
                            if(collection) {
                                try {
                                    collection.Hidden = false;
                                    await this.collectionsService.upsertCollection(collection);
                                    this.dataSource = this.getDataSource();
                                }
                                catch (error) {
                                    const dataMsg = new PepDialogData({
                                        title: this.translate.instant('Collection_RestoreDialogTitle'),
                                        actionsType: 'close',
                                        content: this.translate.instant('Collection_RestoreDialogError')
                                    });
                                    this.dialogService.openDefaultDialog(dataMsg);
                                }
                            }
                        }
                    });
                    actions.push({
                        title: this.translate.instant('Delete'),
                        handler: async (objs) => {
                            const collectionName = objs.rows[0];
                            let deletionStatus = this.createDeleteStatusObject(collectionName);
                            try{
                                this.deletionStatus.push(deletionStatus);
                                this.updateSnackbar();

                                const res = await this.collectionsService.deleteCollection(collectionName); // if hard_delete takes less than 30 seconds, deletedCounter is returned, else- executionUUID of async operation
                                
                                if(res['ExecutionUUID']){
                                    await this.pollAuditLog(res['ExecutionUUID'], deletionStatus);
                                } else{
                                    deletionStatus.status = 'done';
                                    this.updateSnackbar();
                                }
                                this.dataSource = this.getDataSource();
                            }
                            catch(error){
                                deletionStatus.status = 'failed';
                                this.updateSnackbar();
                                const dataMsg = new PepDialogData({
                                    title: this.translate.instant('Collection_DeleteDialogTitle'),
                                    actionsType: 'close',
                                    content: this.translate.instant('Collection_DeleteDialogError')
                                });
                                this.dialogService.openDefaultDialog(dataMsg);
                            }
                        }
                    })
                }
                else {
                    const selectedCollection = this.collections.find(x=>x.Name === data.rows[0]);
                    actions.push({
                        title: this.translate.instant('Edit'),
                        handler: async (objs) => {
                            this.navigateToCollectionForm(objs.rows[0]);
                        }
                    });
                    actions.push({
                        title: this.translate.instant('Delete'),
                        handler: async (objs) => {
                            this.showDeleteDialog(objs.rows[0]);
                        }
                    })
                    if(selectedCollection && selectedCollection.Type != 'contained') {
                        if(this.collectionsService.isCollectionIndexed(selectedCollection)) {
                            actions.push({
                                title: this.translate.instant('Collections_RebuildAction_Title'),
                                handler: async (objs) => {
                                    this.showCleanRebuildMessage(objs.rows[0]);
                                }
                            })
                        }
                        actions.push({
                            title: this.translate.instant('Edit data'),
                            handler: async (objs) => {
                                this.navigateToDocumentsView(objs.rows[0]);
                            },
                        });
                    }
                }
            }
            return actions;
        }
    }

    menuItems:PepMenuItem[] = []

    navigateToCollectionForm(name: string) {
        this.router.navigate([name], {
            relativeTo: this.activateRoute,
            queryParamsHandling: 'preserve'
        })
    }

    openAddCollectionForm() {
        const data = {
            AsbtractSchemes: this.abstractSchemes
        };
        this.utilitiesService.openComponentInDialog(AddCollectionDialogComponent, data, (collection) => {
            if (collection) {
                this.navigateToCollectionForm(collection.Name);
            }
        });
    }

    menuItemClick(event: any) {
        switch (event.source.key) {
            case 'RecycleBin':
            case 'BackToList': {
                this.recycleBin = !this.recycleBin;
                setTimeout(() => {
                    this.router.navigate([], {
                        queryParams: {
                            recycle_bin: this.recycleBin
                        },
                        queryParamsHandling: 'merge',
                        relativeTo: this.activateRoute,
                        replaceUrl: true
                    })
                }, 0); 
                this.dataSource = this.getDataSource(); 
                this.menuItems = this.getMenuItems();
                break;
            }
        }
    }

    showDeleteDialog(name: any) {
        const dataMsg = new PepDialogData({
            title: this.translate.instant('Collection_DeleteDialogTitle'),
            actionsType: 'cancel-delete',
            content: this.translate.instant('Collection_DeleteDialogContent')
        });
        this.dialogService.openDefaultDialog(dataMsg).afterClosed()
            .subscribe(async (isDeletePressed) => {
                if (isDeletePressed) {
                    try {
                        await this.collectionsService.upsertCollection({
                            Name: name,
                            Hidden: true,
                        });
                        this.dataSource = this.getDataSource();
                    }
                    catch (error) {
                        const title = this.translate.instant('Collection_DeleteDialogTitle');
                        let content = this.translate.instant('Collection_DeleteDialogGeneralError', { message: error });
                        if (error.indexOf(this.deleteError) > 0)
                        {
                            content = this.translate.instant('Collection_DeleteDialogError');
                        }
                        this.utilitiesService.showMessageDialog(title, content);
                    }
                }
        });      
    }

    navigateToDocumentsView(collectionName: string) {
        const route: ActivatedRoute = this.getCurrentRoute(this.activateRoute);

        this.router.navigate([`${collectionName}/documents`], {
            relativeTo: this.activateRoute,
            queryParamsHandling: 'merge'
        });
    }

    private getCurrentRoute(route: ActivatedRoute) {
        return {
            ...route,
            ...route.children.reduce((acc, child) =>
                ({ ...this.getCurrentRoute(child), ...acc }), {}) 
        };
    }
    
    onFieldClick(event: IPepFieldClickEvent) {
        const collection = this.collections.find(c => c.Name === event.value);
        if (collection && collection.Type != 'contained') {
            this.navigateToDocumentsView(event.value);
        }
        else {
            const title = this.translate.instant('Collection_ContainedErrorDialog_Title');
            const content = this.translate.instant('Collection_ContainedErrorDialog_Content');
            this.utilitiesService.showMessageDialog(title, content);
        }
    }
    
    showCleanRebuildMessage(collectionName) {
        const title = this.translate.instant('Collection_RebuildDialog_Title');
        const content = this.translate.instant('Collection_RebuildDialog_Content');
        this.utilitiesService.showMessageDialog(title, content, 'cancel-continue', (continuePressed => {
            if (continuePressed) {
                this.collectionsService.handleCleanRebuild(collectionName);
            }
        }));
    }

    private async pollAuditLog(auditLog: string, statusObj: DeletionStatus): Promise<string> {
        console.log(`polling delete process with executionUUID: ${auditLog}`);
        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
        const waitingTime = 3000;
        try {
            let result: AuditLog;
            while (true) {
                result = await this.httpService.getPapiApiCall(`/audit_logs/${auditLog}`).toPromise();
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
                    this.updateSnackbar();
                    break;
                case 'Success':
                    statusObj.status = "done";
                    console.log(`operation succeeded`);
                    this.updateSnackbar();
                    break;
                default:
                    statusObj.status = "failed";
                    console.log(`operation failed with an unknown audit log type: ${result["Status"]}`);
                    this.updateSnackbar();
            }
        }
        catch (ex) {
            console.error(`delete collection exception: ${JSON.stringify(ex)}`);
            statusObj.status = "failed";
            this.updateSnackbar();
            return 'Unknown error occured';
        }
    }

    private createDeleteStatusObject(collectionName): DeletionStatus {
        return {
            key: this.deletionIndex++,
            name: collectionName,
            status: 'deleting'
        }
    }

    updateSnackbar() {
        if (!this.currentSnackBar?.instance) {
            this.currentSnackBar = this.snackBarService.openSnackBarFromComponent(FileStatusPanelComponent, {
                title: "Delete Process",
                content: this.deletionStatus
            })
            this.currentSnackBar.instance.closeClick.subscribe(() => {
                this.currentSnackBar = null;
            });
        }
        else {
            this.currentSnackBar.instance.data.content = this.deletionStatus;
            if (this.deletionStatus.length === 0) {
                this.currentSnackBar.instance.snackBarRef.dismiss();
                this.currentSnackBar = null;
            }
        }
    }
}
