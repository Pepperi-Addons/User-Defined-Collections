import { PepMenuItem } from '@pepperi-addons/ngx-lib/menu';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild, ViewContainerRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { TranslateService } from '@ngx-translate/core';

import { ObjectsDataRowCell, PepLayoutService, PepScreenSizeType } from '@pepperi-addons/ngx-lib';
import { PepSelectionData } from "@pepperi-addons/ngx-lib/list";
import { PepDialogData, PepDialogService } from "@pepperi-addons/ngx-lib/dialog";
import { GenericListComponent, IPepGenericListActions, IPepGenericListDataSource, IPepGenericListParams } from "@pepperi-addons/ngx-composite-lib/generic-list";
import { DIMXHostObject, PepDIMXHelperService } from '@pepperi-addons/ngx-composite-lib'

import { AddonData, Collection, FormDataView, SchemeField, SearchData } from "@pepperi-addons/papi-sdk";

import { DocumentsService } from "../services/documents.service";
import { UtilitiesService } from "../services/utilities.service";
import { DocumentsFormComponent, DocumentsFormData } from './form/documents-form.component';
import { EMPTY_OBJECT_NAME, FormMode, GL_PAGE_SIZE } from '../entities';
import { config } from '../addon.config';

@Component({
    selector: 'documents-list',
    templateUrl: './documents-list.component.html',
    styleUrls: ['./documents-list.component.scss']
})

export class DocumentsListComponent implements OnInit {
    
    @Input() hostObject: any;
    
    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();

    @ViewChild('documentsList') documentsList: GenericListComponent | undefined;
    
    collectionName: string;
    recycleBin: boolean = false;
    collectionData: Collection;
    documents: SearchData<AddonData> = {Objects: [], Count: 0};
    
    screenSize: PepScreenSizeType;
    
    dataSource: IPepGenericListDataSource;

    menuItems: PepMenuItem[] = [];
    
    EMPTY_OBJECT_NAME:string = EMPTY_OBJECT_NAME;
    
    actions: IPepGenericListActions = {
        get: async (data: PepSelectionData) => {
            const actions = [];
            if (data && data.rows.length == 1) {
                if(this.recycleBin) {
                    actions.push({
                        title: this.translate.instant('Restore'),
                        handler: async (objs) => {
                            let document = this.documents.Objects.find(doc => doc.Key === objs.rows[0]);
                            if(document) {
                                try {
                                    document.Hidden = false;
                                    await this.documentsService.upsertDocument(this.collectionName, document);
                                    this.dataSource = this.getDataSource();
                                }
                                catch (error) {
                                    const dataMsg = new PepDialogData({
                                        title: this.translate.instant('Documents_RestoreDialogTitle'),
                                        actionsType: 'close',
                                        content: this.translate.instant('Documents_RestoreDialogError')
                                    });
                                    this.dialogService.openDefaultDialog(dataMsg);
                                }
                            }
                        }
                    });
                    actions.push({
                        title: this.translate.instant('Delete'),
                        handler: async (objs) => {
                            try{
                                await this.documentsService.deleteDocument(this.collectionName, objs.rows[0]);
                            }
                            catch(error){
                                const dataMsg = new PepDialogData({
                                    title: this.translate.instant('Documents_DeleteDialogTitle'),
                                    actionsType: 'close',
                                    content: this.translate.instant('Documents_DeleteDialogError')
                                });
                                this.dialogService.openDefaultDialog(dataMsg);
                            }
                        }
                    });  
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
        public utilitiesService: UtilitiesService,
        private router: Router,
        private dialogService: PepDialogService,
        private layoutService: PepLayoutService,
        private viewContainer: ViewContainerRef,
        private dimxService: PepDIMXHelperService,
    ) {
        this.layoutService.onResize$.subscribe(size => {
            this.screenSize = size;
        });
    }

    ngOnInit() {
        this.collectionName = this.activateRoute.snapshot.params.collection_name;
        this.utilitiesService.getCollectionByName(this.collectionName).then(value => {
            this.collectionData = value;
            this.dataSource = this.getDataSource();
            this.menuItems = this.getMenuItems();
        });
        const dimxHostObject: DIMXHostObject = {
            DIMXAddonUUID: config.AddonUUID,
            DIMXResource: this.collectionName,
        }
        this.dimxService.register(this.viewContainer, dimxHostObject, (dimxEvent) => {
            this.dataSource = this.getDataSource();
        })
    }

    getDataSource() {
        const noDataMessageKey = this.recycleBin ? 'RecycleBin_NoDataFound' : 'Documents_NoDataFound'
        const searchFields: string[] = Object.keys(this.collectionData.Fields).filter(field => this.collectionData.Fields[field].Type === 'String' && this.collectionData.Fields[field].Indexed);
        const listViewFields: string[] = this.getViewFields();
        return {
            init: async (params: IPepGenericListParams) => {
                try {
                    this.documents = await this.utilitiesService.getCollectionDocuments(this.collectionName, params, searchFields, this.recycleBin, listViewFields);
                }
                catch (err) {
                    this.documents.Objects = [];
                    this.showMessageInDialog('Documents_LoadingErrorDialog_Title', 'Documents_LoadingErrorDialog_Message');
                }
                return Promise.resolve({
                    dataView: {
                        Context: {
                            Name: '',
                            Profile: { InternalID: 0 },
                            ScreenSize: 'Landscape'
                        },
                        Type: 'Grid',
                        Title: '',
                        Fields: [
                            ...this.collectionData.ListView.Fields.filter(field => {
                                return this.collectionData.Fields[field.FieldID].Type !== 'Array' && this.collectionData.Fields[field.FieldID].Type !== 'ContainedResource';
                            }),
                            {
                                FieldID: 'CreationDateTime',
                                Title: this.translate.instant('Creation Date'),
                                ReadOnly: true,
                                Type: 'DateAndTime'
                            },
                            {
                                FieldID: 'ModificationDateTime',
                                Title: this.translate.instant('Modification Date'),
                                ReadOnly: true,
                                Type: 'DateAndTime'
                            },
                        ],
                        Columns: [ 
                            ...this.collectionData.ListView.Columns,
                            {
                                Width:10
                            },
                            {
                                Width:10
                            }
                        ],
                        FrozenColumnsCount: 0,
                        MinimumColumnWidth: 0
                    },
                    // on unindexed collections, the count return -1. until the GL will support, we are sending the number of itms
                    totalCount: this.documents.Count && this.documents.Count > 0 ? this.documents.Count : this.documents.Objects.length,
                    items: this.documents.Objects
                });
            },
            update: async (params: IPepGenericListParams) => {
                return (await this.utilitiesService.getCollectionDocuments(this.collectionName, params, searchFields, this.recycleBin, listViewFields)).Objects;
            },
            inputs: {
                pager: {
                    type: 'pages',
                    size: GL_PAGE_SIZE
                },
                selectionType: 'single',
                noDataFoundMsg: this.translate.instant(noDataMessageKey)
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

    menuItemClicked(event: any) {
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
            case 'Import': {
              this.dimxService.import({
                OverwriteObject: false,
                Delimiter: ",",
                OwnerID: config.AddonUUID
              });
              this.dataSource = this.getDataSource();
              break
            }
            case 'Export': {
              this.dimxService.export({
                DIMXExportFormat: "csv",
                DIMXExportIncludeDeleted: false,
                DIMXExportFileName: this.collectionName,
                DIMXExportFields: this.collectionData.ListView.Fields.map(field => field.FieldID).concat(['Key']).join(),
                DIMXExportDelimiter: ","
            });
              break;
            }
          }
    }
    
    onDIMXProcessDone(event){
        this.dataSource = this.getDataSource();
    }

    navigateToDocumentsForm(formMode: FormMode, documentKey: string) {
        const listItem = this.documents.Objects.find(x => x.Key === documentKey);
        let item = listItem || {};
        if (formMode == 'Edit') {
            // item['Key'] = documentKey;
            Object.keys(listItem).forEach((fieldID) => {
                let fieldType = this.collectionData.Fields[fieldID]?.Type;
                const optionalValues = this.collectionData.Fields[fieldID]?.OptionalValues;
                // if the field is of type Array or Object, convert to string for editing
                if (fieldType === 'ContainedResource' || (fieldType === 'Array' && (!optionalValues || optionalValues.length === 0))) {
                    item[fieldID] = JSON.stringify(listItem[fieldID]);
                }
                // if the field is array and has optional values, convert to string seperated by comma
                if (optionalValues?.length > 0 && fieldType === 'Array') {
                    item[fieldID] = listItem[fieldID].join(';');
                }
            });
        }
        else {
            Object.keys(this.collectionData.Fields).forEach(field => {
                item[field] = '';
            })
        }
        const formData: DocumentsFormData = {
            Item: item,
            Mode: formMode,
            DataView: this.getFormDataView(formMode),
            CollectionName: this.collectionName
        }
        const config = this.dialogService.getDialogConfig({

        }, 'large');
        config.data = new PepDialogData({
            content: DocumentsFormComponent
        })
        this.dialogService.openDialog(DocumentsFormComponent, formData, config).afterClosed().subscribe((value) => {
            if (value) {
                this.dataSource = this.getDataSource();
            }
        });
    }

    showDeleteDialog(name: any) {
        const dataMsg = new PepDialogData({
            title: this.translate.instant('Documents_DeleteDialogTitle'),
            actionsType: 'cancel-delete',
            content: this.translate.instant('Documents_DeleteDialogContent')
        });
        this.dialogService.openDefaultDialog(dataMsg).afterClosed()
            .subscribe(async (isDeletePressed) => {
                if (isDeletePressed) {
                    try {
                        await this.documentsService.upsertDocument(this.collectionName, {
                            Key: name,
                            Hidden: true,
                        });
                        this.dataSource = this.getDataSource();
                    }
                    catch (error) {
                            const dataMsg = new PepDialogData({
                                title: this.translate.instant('Documents_DeleteDialogTitle'),
                                actionsType: 'close',
                                content: this.translate.instant('Documents_DeleteDialogError')
                            });
                            this.dialogService.openDefaultDialog(dataMsg);
                    }
                }
        });      
    }

    BackToCollections() {
        this.router.navigate(['../..'], {
            relativeTo: this.activateRoute,
            queryParamsHandling: 'preserve',
        })
    }

    getFormDataView(formMode: string): FormDataView {
        let dataView: FormDataView = {
            Type:"Form",
            Fields: [],
            Context: {
                Name: "",
                Profile: { },
                ScreenSize: 'Tablet'
            }
        };

        this.collectionData.ListView.Fields.forEach(field => {
            const formField = {
                FieldID: field.FieldID,
                Mandatory: field.Mandatory,
                Type: field.Type,
                Title: field.Title,
                ReadOnly: formMode == 'Edit' && this.collectionData.DocumentKey?.Fields?.includes(field.FieldID),
            }
            const optionalValues = this.collectionData.Fields[field.FieldID].OptionalValues?.map(item => {
                return {
                    Key: item,
                    Value: item
                }
            }) || []
            optionalValues.length > 0 ? formField["OptionalValues"] = optionalValues : null;
            dataView.Fields.push(formField);
        })

        return dataView;
    }

    showMessageInDialog(titleTranslationKey: string, messageTranslationKey: string) {
        const dataMsg = new PepDialogData({
            title: this.translate.instant(titleTranslationKey),
            actionsType: 'close',
            content: this.translate.instant(messageTranslationKey)
        });
        this.dialogService.openDefaultDialog(dataMsg);
    }

    private getViewFields() {
        return ['Key', 'CreationDateTime', 'ModificationDateTime', 'Hidden', ...this.collectionData.ListView?.Fields?.map(field => field.FieldID)];
    }
}