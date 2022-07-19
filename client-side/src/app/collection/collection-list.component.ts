import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { PepLayoutService, PepScreenSizeType } from '@pepperi-addons/ngx-lib';
import { TranslateService } from '@ngx-translate/core';

import { UtilitiesService } from "../services/utilities.service";
import { CollectionsService } from "../services/collections.service";
import { IPepGenericListActions, IPepGenericListDataSource, IPepGenericListPager } from "@pepperi-addons/ngx-composite-lib/generic-list";
import { PepSelectionData } from "@pepperi-addons/ngx-lib/list";
import { PepMenuItem } from "@pepperi-addons/ngx-lib/menu";
import { ActivatedRoute, ActivatedRouteSnapshot, Router } from "@angular/router";
import { PepDialogData, PepDialogService } from "@pepperi-addons/ngx-lib/dialog";
import { Collection } from "@pepperi-addons/papi-sdk";
import { FormMode, EMPTY_OBJECT_NAME } from "../entities";

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

    constructor(
        public collectionsService: CollectionsService,
        public layoutService: PepLayoutService,
        public translate: TranslateService,
        public activateRoute: ActivatedRoute,
        public dialogService: PepDialogService,
        private router: Router,
        private utilitiesService:UtilitiesService

    ) {
        this.layoutService.onResize$.subscribe(size => {
            this.screenSize = size;
        });
    }

    ngOnInit() {
        this.utilitiesService.addonUUID = this.activateRoute.snapshot.params.addon_uuid;
        this.recycleBin = this.activateRoute.snapshot.queryParams.recycle_bin == 'true' || false;
        this.menuItems = this.getMenuItems();
        this.translate.get(['RecycleBin_NoDataFound', 'Collection_List_NoDataFound']).subscribe(translations=> {
            this.listMessages = translations;
            this.dataSource = this.getDataSource();
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
                                Type: 'TextBox',
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
                    })
                }
                else {
                    actions.push({
                        title: this.translate.instant('Edit'),
                        handler: async (objs) => {
                            this.navigateToCollectionForm('Edit', objs.rows[0]);
                        }
                    });
                    actions.push({
                        title: this.translate.instant('Delete'),
                        handler: async (objs) => {
                            this.showDeleteDialog(objs.rows[0]);
                        }
                    })
                    // actions.push({
                    //     title: this.translate.instant('Export'),
                    //     handler: async (objs) => {
                    //         this.exportCollectionScheme(objs.rows[0]);
                    //     }
                    // })
                    actions.push({
                        title: this.translate.instant('Edit data'),
                        handler: async (objs) => {
                            this.navigateToDocumentsView(objs.rows[0]);
                        }
                    })
                }
            }
            return actions;
        }
    }

    menuItems:PepMenuItem[] = []

    navigateToCollectionForm(mode: FormMode, name: string) {
        this.router['form_mode'] = mode;
        this.router.navigate([name], {
            relativeTo: this.activateRoute,
            queryParamsHandling: 'preserve',
            state: {form_mode: 'Edit'}
        })
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
                        if (error.message.indexOf(this.deleteError) > 0)
                        {
                            const dataMsg = new PepDialogData({
                                title: this.translate.instant('Collection_DeleteDialogTitle'),
                                actionsType: 'close',
                                content: this.translate.instant('Collection_DeleteDialogError')
                            });
                            this.dialogService.openDefaultDialog(dataMsg);
                        }
                    }
                }
        });      
    }

    navigateToDocumentsView(collectionName: string) {
        this.router.navigate([`${collectionName}/documents`], {
            relativeTo: this.activateRoute
        });
    }

}
