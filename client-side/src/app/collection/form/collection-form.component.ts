import { FieldsFormComponent, FieldsFormDialogData } from './fields/fields-form.component';
import { Component, OnInit, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { IPepGenericListActions, IPepGenericListDataSource } from '@pepperi-addons/ngx-composite-lib/generic-list';
import { PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { PepSelectionData } from '@pepperi-addons/ngx-lib/list';
import { Collection, CollectionField, DocumentKeyTypes } from '@pepperi-addons/papi-sdk/dist/entities';
import { CollectionsService, EMPTY_OBJECT_NAME, FormMode } from '../collection-list.service';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'collection-form',
  templateUrl: './collection-form.component.html',
  styleUrls: ['./collection-form.component.scss']
})
export class CollectionFormComponent implements OnInit {
    
    collection: Collection;
    collectionName: string;
    emptyCollection: boolean = true;
    EMPTY_OBJECT_NAME:string = EMPTY_OBJECT_NAME;

    fieldsDataSource: IPepGenericListDataSource;

    fieldsActions: IPepGenericListActions = {
        get: async (data: PepSelectionData) => {
            const actions = [];
            if (data && data.rows.length == 1) {
                actions.push({
                    title: this.translate.instant('Edit'),
                    handler: async (objs) => {
                        this.openFieldForm(objs.rows[0]);
                    }
                });
                actions.push({
                    title: this.translate.instant('Delete'),
                    handler: async (objs) => {
                        this.showDeleteDialog(objs.rows[0]);
                    }
                })
            }
            return actions;
        }
    }

    uidFieldsDataSource: IPepGenericListDataSource;

    uidFieldsActions: IPepGenericListActions = {
        get: async (data: PepSelectionData) => {
            const actions = [];
            if (data && data.rows.length == 1) {
                actions.push({
                    title: this.translate.instant('Delete'),
                    handler: async (objs) => {
                        this.deleteFieldFromUid(objs.rows[0]);
                    }
                })
            }
            return actions;
        }
    }

    documentKeyOptions = []
    collectionLoaded: boolean = false;
    mode: FormMode;
    collectionFields: { key:string, value: string }[] = [];
    fieldKey: string;
    dialogRef: MatDialogRef<CollectionFormComponent>

    @ViewChild('UidFieldForm', { read: TemplateRef }) UidFieldsTemplate: TemplateRef<any>;

    collectionNameChanged: boolean;

    constructor(private activateRoute: ActivatedRoute,
                private router: Router,
                private collectionsService: CollectionsService,
                private translate: TranslateService,
                private dialogService: PepDialogService) { }

    ngOnInit(): void {
        this.collectionsService.addonUUID = this.activateRoute.snapshot.params.addon_uuid;
        this.collectionName = this.activateRoute.snapshot.params.collection_name;
        this.mode = this.router['form_mode'] ? this.router['form_mode'] : this.collectionName === EMPTY_OBJECT_NAME ? 'Add' : 'Edit';
        const filteredKeyTypes = DocumentKeyTypes.filter(type=> type!== 'Key');
        this.documentKeyOptions = filteredKeyTypes.map(type => {
            return {
                key: type,
                value: this.translate.instant(`DocumentKey_Options_${type}`),
            }
        })
        this.collectionsService.getCollectionByName(this.collectionName).then(async (value) => {
            this.collection = value;
            this.fieldsDataSource = this.getFieldsDataSource();
            this.uidFieldsDataSource = this.getUIDFieldsDataSource();
            this.collectionLoaded = true;
            this.emptyCollection = this.mode === 'Edit' ? (await this.collectionsService.getCollectionDocuments(this.collectionName)).length == 0 : true
        });
    }

    getFieldsDataSource() {
        return {
            init: async(params:any) => {
                let fields = Object.keys(this.collection.Fields).map(obj => {
                    const type = this.collection.Fields[obj].Type;
                    return {
                        Key: obj,
                        Type: type === 'Array' ? `${this.collection.Fields[obj].Items.Type} ${type}` : type,
                        Description: this.collection.Fields[obj].Description,
                        Mandatory: this.collection.Fields[obj].Mandatory,
                    };
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
                        Fields: [
                            {
                                FieldID: 'Key',
                                Type: 'TextBox',
                                Title: this.translate.instant('Key'),
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
                            {
                                FieldID: 'Type',
                                Type: 'TextBox',
                                Title: this.translate.instant('Type'),
                                Mandatory: false,
                                ReadOnly: true
                            },
                        ],
                        Columns: [
                            {
                                Width: 33
                            },
                            {
                                Width: 33
                            },
                            {
                                Width: 33
                            }
                        ],
          
                        FrozenColumnsCount: 0,
                        MinimumColumnWidth: 0
                    },
                    totalCount: fields.length,
                    items: fields
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

    getUIDFieldsDataSource() {
        return {
            init: async(params:any) => {
                let uidFields = this.collection.DocumentKey.Fields.map(obj => {
                    return {
                        Key: obj,
                        Description: this.collection.Fields[obj].Description,
                    };
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
                        Fields: [
                            {
                                FieldID: 'Key',
                                Type: 'TextBox',
                                Title: this.translate.instant('Key'),
                                Mandatory: false,
                                ReadOnly: true
                            },
                            {
                                FieldID: 'Description',
                                Type: 'TextBox',
                                Title: this.translate.instant('Description'),
                                Mandatory: false,
                                ReadOnly: true
                            }
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
                    totalCount: uidFields.length,
                    items: uidFields
                });
            },
            inputs: () => {
                return Promise.resolve({
                    pager: {
                        type: 'scroll'
                    },
                    selectionType: this.emptyCollection ? 'single': 'none'
                });
            },
        } as IPepGenericListDataSource
    }   

    openFieldForm(name: string) {
        const emptyField: CollectionField = {
            Description: '',
            Mandatory: false,
            Type: 'String',
            OptionalValues: [],
            Items: {
                Type:"String"
            }
        }
        let dialogConfig = this.dialogService.getDialogConfig({}, 'inline')
        const dialogData: FieldsFormDialogData = {
            EmptyCollection: this.emptyCollection,
            Mode: name == EMPTY_OBJECT_NAME ? 'Add' : 'Edit',
            FieldName: name == EMPTY_OBJECT_NAME ? '' : name,
            InUidFields: this.collection.DocumentKey.Fields.includes(name),
            Field: this.collection.Fields[name] || emptyField,
        }
        dialogConfig.data = new PepDialogData({
            content: FieldsFormComponent,
        })
        this.dialogService.openDialog(FieldsFormComponent, dialogData, dialogConfig).afterClosed().subscribe(value => {
            if (value) {
                if(name != EMPTY_OBJECT_NAME && name != value.fieldName) {
                    delete this.collection.Fields[name];
                }
                this.collection.Fields[value.fieldName] = value.field;
                this.fieldsDataSource = this.getFieldsDataSource();
            }
        })
    }

    goBack() {
        this.router.navigate(['..'], {
            relativeTo: this.activateRoute,
            queryParamsHandling: 'preserve'
        })
    }

    async saveClicked() {
        try {
            // we cannot change the collection name, so we need first to delete the "old" one
            if (this.collectionNameChanged) { 
                await this.collectionsService.upsertCollection({
                    Name: this.collectionName,
                    Hidden: true
                });
            }
            await this.collectionsService.upsertCollection(this.collection);
            const dataMsg = new PepDialogData({
                title: this.translate.instant('Collection_UpdateSuccess_Title'),
                actionsType: 'close',
                content: this.translate.instant('Collection_UpdateSuccess_Content')
            });
            this.dialogService.openDefaultDialog(dataMsg).afterClosed().subscribe(() => {
                this.goBack();
            });
        }
        catch (error) {
            const dataMsg = new PepDialogData({
                title: this.translate.instant('Collection_UpdateFailed_Title'),
                actionsType: 'close',
                content: this.translate.instant('Collection_UpdateFailed_Content')
            });
            this.dialogService.openDefaultDialog(dataMsg);
        }
    }
    
    showDeleteDialog(fieldName: string) {
        const data = new PepDialogData({
            title: this.translate.instant('DeleteField_DialogTitle'),
            content: this.translate.instant('DeleteField_DialogContent', {field_name: fieldName}),
            actionsType:'cancel-delete',
        });

        this.dialogService.openDefaultDialog(data).afterClosed().subscribe(isDeletePressed => {
            if(isDeletePressed) {
                delete this.collection.Fields[fieldName];
                this.fieldsDataSource = this.getFieldsDataSource();
            }
        });
    }
    
    deleteFieldFromUid(fieldName: string) {
        const index = this.collection.DocumentKey.Fields.indexOf(fieldName);
        if (index > -1) {
            this.collection.DocumentKey.Fields.splice(index, 1);
            this.uidFieldsDataSource = this.getUIDFieldsDataSource();
        }
    }

    openUidFieldsForm() {
        this.collectionFields = Object.keys(this.collection.Fields).filter(field => { 
            if (this.collection.DocumentKey.Fields.includes(field) || 
                this.collection.Fields[field].Mandatory == false) {
                return false;
            }
            else {
                return true;
            }
        }).map(field => {
            return {
                key: field,
                value: field
            }
        })
        const data = new PepDialogData({
            title: '',
            content: this.UidFieldsTemplate,
            actionsType: 'cancel-continue'
        })
        this.dialogRef = this.dialogService.openDialog(this.UidFieldsTemplate, data);
    }

    saveField() {
        if (this.fieldKey) {
            this.collection.DocumentKey.Fields.push(this.fieldKey);
            this.uidFieldsDataSource = this.getUIDFieldsDataSource();
            this.fieldKey = '';
        }
        this.dialogRef?.close();
    }

    changeCollectionName(name) {
        if (name != this.collectionName && this.mode == 'Edit') {
            this.collectionNameChanged = true;
        }
    }
}
