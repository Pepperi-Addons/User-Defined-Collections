import { PepMenuItem } from '@pepperi-addons/ngx-lib/menu';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { ActivatedRoute, ActivatedRouteSnapshot, Router } from "@angular/router";
import { TranslateService } from '@ngx-translate/core';

import { PepLayoutService, PepScreenSizeType } from '@pepperi-addons/ngx-lib';
import { PepSelectionData } from "@pepperi-addons/ngx-lib/list";
import { PepDialogData, PepDialogService } from "@pepperi-addons/ngx-lib/dialog";
import { IPepGenericListActions, IPepGenericListDataSource, IPepGenericListPager, PepGenericListService } from "@pepperi-addons/ngx-composite-lib/generic-list";

import { AddonData, Collection, GridDataViewColumn } from "@pepperi-addons/papi-sdk";

import { DocumentsService } from "../services/documents.service";
import { FormMode } from "../services/utilities.service";
import { UtilitiesService } from "../services/utilities.service";

@Component({
    selector: 'documents-list',
    templateUrl: './documents-list.component.html',
    styleUrls: ['./documents-list.component.scss']
})

export class DocumentsListComponent implements OnInit {
    
    @Input() hostObject: any;
    
    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
    
    collectionName: string;
    recycleBin: boolean = false;
    collectionData: Collection;
    
    screenSize: PepScreenSizeType;
    
    dataSource: IPepGenericListDataSource;
    
    pager: IPepGenericListPager = {
        type: 'scroll',
    };

    menuItems: PepMenuItem[] = [];
    
    actions: IPepGenericListActions = {
        get: async (data: PepSelectionData) => {
            const actions = [];
            if (data && data.rows.length == 1) {
                if(this.recycleBin) {
                    actions.push({
                        title: this.translate.instant('Restore'),
                        handler: async (objs) => {
                            // await this.collectionsService.restoreCollection(objs.rows[0]);
                            await this.documentsService.upsertDocument({
                                Name: objs.rows[0],
                                Hidden: false,
                            });
    
                            this.dataSource = this.getDataSource();
                        }
                    })
                }
                else {
                    actions.push({
                        title: this.translate.instant('Edit'),
                        handler: async (objs) => {
                            this.navigateToDocumentsForm('Edit', objs.rows[0]);
                        }
                    });
                    actions.push({
                        title: this.translate.instant('Delete'),
                        handler: async (objs) => {
                            this.showDeleteDialog(objs.rows[0]);
                        }
                    })
                }
            }
            return actions;
        }
    }
    
    constructor(
        private activateRoute: ActivatedRoute,
        private translate: TranslateService,
        private documentsService: DocumentsService,
        private utilitiesService: UtilitiesService,
        private router: Router,
        private dialogService: PepDialogService,
        private layoutService: PepLayoutService,
        private genericListService: PepGenericListService
    ) {
        this.layoutService.onResize$.subscribe(size => {
            this.screenSize = size;
        });
    }

    ngOnInit() {
        this.documentsService.addonUUID = this.activateRoute.snapshot.params.addon_uuid;
        this.collectionName = this.activateRoute.snapshot.params.collection_name;
        this.utilitiesService.getCollectionByName(this.collectionName).then(value => {
            this.collectionData = value;
            this.dataSource = this.getDataSource();
            this.menuItems = this.getMenuItems();
        });
    }

    getDataSource() {
        return {
            init: async (params:any) => {
                let documents: AddonData[] = await this.utilitiesService.getCollectionDocuments(this.collectionName, {
                    ...params,
                    include_deleted: this.recycleBin,
                    where: `Hidden=${this.recycleBin}`
                });
                return Promise.resolve({
                    dataView: {
                        Context: {
                            Name: '',
                            Profile: { InternalID: 0 },
                            ScreenSize: 'Landscape'
                        },
                        Type: 'Grid',
                        Title: '',
                        Fields: this.collectionData.ListView.Fields,
                        Columns: this.collectionData.ListView.Fields.map(() => {
                            return {
                                Width: 100 / this.collectionData.ListView.Fields.length,
                            }
                        }),
          
                        FrozenColumnsCount: 0,
                        MinimumColumnWidth: 0
                    },
                    totalCount: documents.length,
                    items: documents
                });
            },
            inputs: () => {
                return Promise.resolve({
                    pager: {
                        type: 'scroll'
                    },
                    selectionType: 'single'
                });
            },
        } as IPepGenericListDataSource
    }


    getMenuItems() {
        return [{
            key:'Import',
            text: this.translate.instant('Import'),
            hidden: this.recycleBin
        },
        {
            key:'Export',
            text: this.translate.instant('Export'),
            hidden: this.recycleBin
        },
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

    menuItemClicked($event) {
         console.log(`clicked on ${$event} menu item`);
    }
    
    navigateToDocumentsForm(formMode: FormMode, documentKey: string) {
        console.log(`opening editor for ${documentKey} in ${formMode} mode`)
    }

    showDeleteDialog(documentKey: string) {
        console.log('opening delete message')
    }
}