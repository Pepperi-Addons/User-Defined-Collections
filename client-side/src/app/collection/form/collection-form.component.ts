import { FieldsFormComponent } from './fields/fields-form.component';
import { AfterViewInit, Component, OnInit, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { GenericListComponent, IPepGenericListActions, IPepGenericListDataSource } from '@pepperi-addons/ngx-composite-lib/generic-list';
import { PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { PepSelectionData } from '@pepperi-addons/ngx-lib/list';
import { AddonDataScheme, Collection, CollectionField, DataViewFieldType, DocumentKeyType, DocumentKeyTypes, GridDataViewField, SchemeFieldType, SchemeFieldTypes } from '@pepperi-addons/papi-sdk';
import { CollectionsService } from '../../services/collections.service';
import { UtilitiesService } from '../../services/utilities.service';
import { MatDialogRef } from '@angular/material/dialog';
import { SortingFormComponent } from './sorting/sorting-form.component';
import { existingErrorMessage, existingInRecycleBinErrorMessage } from 'udc-shared';
import { EMPTY_OBJECT_NAME, FormMode, FieldsFormDialogData, booleanOptions, SyncTypes, SelectOptions, SyncType } from '../../entities';

@Component({
  selector: 'collection-form',
  templateUrl: './collection-form.component.html',
  styleUrls: ['./collection-form.component.scss']
})
export class CollectionFormComponent implements OnInit {
    
    collection: Collection;
    indexed: boolean = false;
    collectionName: string;
    emptyCollection: boolean = true;
    EMPTY_OBJECT_NAME:string = EMPTY_OBJECT_NAME;
    fieldsValid: boolean = false;
    documentKeyValid: boolean = false;
    nameValid: boolean = false;
    resources: AddonDataScheme[] = [];
    booleanOptions = booleanOptions;
    syncData: SyncType = 'Offline';

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
                actions.push({
                    title: this.translate.instant('Change Sort'),
                    handler: async (objs) => {
                        this.openSortingForm(objs.rows[0]);
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

    documentKeyOptions: SelectOptions<string> = [];
    syncOptions: SelectOptions<string> = [];
    collectionLoaded: boolean = false;
    mode: FormMode;
    collectionFields: { key:string, value: string }[] = [];
    fieldKey: string;
    fieldSort: number;
    dialogRef: MatDialogRef<CollectionFormComponent>
    uidList: GenericListComponent

    @ViewChild('UidFieldForm', { read: TemplateRef }) UidFieldsTemplate: TemplateRef<any>;
    @ViewChild('SortingForm', { read: TemplateRef }) SortingForm: TemplateRef<any>;
    @ViewChild('uidList', {read: GenericListComponent}) set uidListSetter(list: GenericListComponent) {
        if (list) {
            this.uidList = list;
            this.uidFieldsDataSource = this.getUIDFieldsDataSource();
        }
    };

    constructor(private activateRoute: ActivatedRoute,
                private router: Router,
                private collectionsService: CollectionsService,
                private translate: TranslateService,
                private dialogService: PepDialogService,
                private utilitiesService: UtilitiesService) { }

    ngOnInit(): void {
        this.collectionName = this.activateRoute.snapshot.params.collection_name;
        this.mode = this.router['form_mode'] ? this.router['form_mode'] : this.collectionName === EMPTY_OBJECT_NAME ? 'Add' : 'Edit';
        this.translate.get(['SyncData_Options_Online', 'SyncData_Options_Offline', 'DocumentKey_Options_AutoGenerate', 'DocumentKey_Options_Composite']).subscribe(translations => {
            this.documentKeyOptions = DocumentKeyTypes.filter(type => type !== 'Key').map(type => {
                return {
                    key: type,
                    value: translations[`DocumentKey_Options_${type}`],
                }
            })
            this.syncOptions = SyncTypes.map(type => {
                return {
                    key: type,
                    value: translations[`SyncData_Options_${type}`],
                }
            })
            this.utilitiesService.getCollectionByName(this.collectionName).then(async (value) => {
                this.collection = value;
                this.fieldsDataSource = this.getFieldsDataSource();
                this.resources = (await this.utilitiesService.getReferenceResources()).filter(collection => collection.Name !== this.collectionName);
                this.collectionLoaded = true;
                if (this.mode === 'Edit') {
                    const documents = await this.utilitiesService.getCollectionDocuments(this.collectionName);
                    this.emptyCollection = documents.length == 0;
                    if (this.uidList) {
                        this.uidList.selectionType = this.emptyCollection ? 'single': 'none';
                        this.uidFieldsDataSource = this.getUIDFieldsDataSource();
                    }
                }
                if (this.collection.SyncData) {
                    this.syncData = this.collection.SyncData.Sync ? 'Offline' : 'Online';
                }
                else {
                    this.syncData = 'Offline';
                    this.collection.SyncData = {
                        Sync: true,
                        SyncFieldLevel: false
                    }
                }
                this.nameValid = this.collection.Name != '';
                this.documentKeyValid = (this.collection.DocumentKey.Type !== 'Composite' || this.collection.DocumentKey.Fields.length > 0);
                this.fieldsValid = this.collection.ListView.Fields.length > 0;
            });
        });
    }

    getFieldsDataSource() {
        return {
            init: async(params:any) => {
                let fields = this.collection.ListView.Fields.map(obj => {
                    const type = this.collection.Fields[obj.FieldID].Type;
                    return {
                        Key: obj.FieldID,
                        Type: type === 'Array' ? `${this.collection.Fields[obj.FieldID].Items.Type} ${type}` : type,
                        Description: this.collection.Fields[obj.FieldID].Description,
                        Mandatory: this.collection.Fields[obj.FieldID].Mandatory,
                    };
                });
                this.fieldsValid = this.collection.ListView.Fields.length > 0;
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
                                Width: 20
                            },
                            {
                                Width: 50
                            },
                            {
                                Width: 30
                            }
                        ],
          
                        FrozenColumnsCount: 0,
                        MinimumColumnWidth: 0
                    },
                    totalCount: fields.length,
                    items: fields
                });
            },
            inputs: {
                pager: {
                    type: 'scroll'
                },
                selectionType: 'single',
                noDataFoundMsg: this.translate.instant('Collection_Fields_NoDataFound')
            },
        } as IPepGenericListDataSource
    }

    getUIDFieldsDataSource() {
        return {
            init: async(params:any) => {
                this.documentKeyValid = this.collection.DocumentKey?.Fields?.length > 0 || false;
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
            inputs: {
                pager: {
                    type: 'scroll'
                },
                selectionType: this.emptyCollection ? 'single': 'none',
                noDataFoundMsg: this.translate.instant('UidFields_NoDataFound')
            
            },
        } as IPepGenericListDataSource
    }   

    openFieldForm(name: string) {
        const collectionField: CollectionField = {
            Description: this.collection.Fields[name]?.Description || '',
            Mandatory: this.collection.Fields[name]?.Mandatory || false,
            Type: this.collection.Fields[name]?.Type || 'String',
            OptionalValues: this.collection.Fields[name]?.OptionalValues || [],
            Items: this.collection.Fields[name]?.Items || {
                Type:"String",
                Mandatory: false,
                Description: ''
            },
            Fields: this.collection.Fields[name]?.Fields || {},
            Resource: this.collection.Fields[name]?.Resource || '',
            AddonUUID: this.collection.Fields[name]?.AddonUUID || '',
        }
        let dialogConfig = this.dialogService.getDialogConfig({}, 'large');
        const dialogData: FieldsFormDialogData = {
            EmptyCollection: this.emptyCollection,
            Mode: name == EMPTY_OBJECT_NAME ? 'Add' : 'Edit',
            FieldName: name == EMPTY_OBJECT_NAME ? '' : name,
            InUidFields: this.collection.DocumentKey.Fields?.includes(name) || false,
            Field: collectionField,
            Resources: this.resources,
            AvailableTypes: SchemeFieldTypes.filter(type => ['ContainedResource', 'DynamicResource', 'ContainedDynamicResource', 'MultipleStringValues'].includes(type) === false),
        }
        dialogConfig.data = new PepDialogData({
            content: FieldsFormComponent,
        })
        this.dialogService.openDialog(FieldsFormComponent, dialogData, dialogConfig).afterClosed().subscribe(value => {
            if (value) {
                const fieldName = value.fieldName;
                this.collection.Fields[fieldName] = value.field;
                const dvField = this.getDataViewField(fieldName, value.field);
                let index = this.collection.ListView.Fields.findIndex(field => field.FieldID === fieldName);
                const nameChanged = (name != EMPTY_OBJECT_NAME && name != fieldName);
                // if the field doesn't exist on the default data view, add it to the end of the array
                if (index < 0) {
                    if (nameChanged) {
                        index = this.collection.ListView.Fields.findIndex(field => field.FieldID === name);
                        this.collection.ListView.Fields.splice(index, 1, dvField);
                        delete this.collection.Fields[name];
                    }
                    else {
                        this.collection.ListView.Fields.push(dvField);
                        this.collection.ListView.Columns.push({Width:10});
                    }
                }
                else {
                    this.collection.ListView.Fields.splice(index, 1, dvField);
                }

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
            if(this.mode === 'Add') {
                try {
                    await this.collectionsService.createCollection(this.collection);
                    this.showSuccessMessage();
                }
                catch (err) {
                    let contentKey = '';
                    if (err.message.indexOf(existingInRecycleBinErrorMessage) >= 0) {
                        contentKey = 'Collection_ExistingRecycleBinError_Content'
                    }
                    else if(err.message.indexOf(existingErrorMessage) >= 0){
                        contentKey = 'Collection_ExistingError_Content'
                    }
                    else {
                        throw err;
                    }
                    const dataMsg = new PepDialogData({
                        title: this.translate.instant('Collection_UpdateFailed_Title'),
                        actionsType: 'close',
                        content: this.translate.instant(contentKey, {collectionName: this.collection.Name})
                    });
                    this.dialogService.openDefaultDialog(dataMsg);
                }
            }
            else {
                // we cannot change the collection name, so we need first to delete the "old" one
                if (this.collectionName != EMPTY_OBJECT_NAME && this.collection.Name != this.collectionName) { 
                    await this.collectionsService.upsertCollection({
                        Name: this.collectionName,
                        Hidden: true
                    });
                }
                await this.collectionsService.upsertCollection(this.collection);
                this.showSuccessMessage();
            }
        }
        catch (error) {
            const errors = this.utilitiesService.getErrors(error.message);
            const dataMsg = new PepDialogData({
                title: this.translate.instant('Collection_UpdateFailed_Title'),
                actionsType: 'close',
                content: this.translate.instant('Collection_UpdateFailed_Content', {error: errors.map(error=> `<li>${error}</li>`)})
            });
            this.dialogService.openDefaultDialog(dataMsg);
        }
    }
    
    showSuccessMessage() {
        const dataMsg = new PepDialogData({
            title: this.translate.instant('Collection_UpdateSuccess_Title'),
            actionsType: 'close',
            content: this.translate.instant('Collection_UpdateSuccess_Content')
        });
        this.dialogService.openDefaultDialog(dataMsg).afterClosed().subscribe(() => {
            this.goBack();
        });
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
                const index = this.collection.ListView.Fields.findIndex(field => field.FieldID === fieldName);
                this.collection.ListView.Fields.splice(index, 1);
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

        this.dialogRef = this.dialogService.openDialog(this.UidFieldsTemplate, undefined);
    }

    saveField() {
        if (this.fieldKey) {
            this.collection.DocumentKey.Fields.push(this.fieldKey);
            this.uidFieldsDataSource = this.getUIDFieldsDataSource();
            this.fieldKey = '';
        }
        this.dialogRef?.close();
    }

    getDataViewField(fieldName: string, field: CollectionField): GridDataViewField {
        return {
            FieldID: fieldName,
            Mandatory: field.Mandatory,
            ReadOnly: true,
            Title: fieldName,
            Type: this.getDataViewFieldType(field.Type, field.OptionalValues.length > 0)
        }
    }

    getDataViewFieldType(fieldType: SchemeFieldType, hasOptionalValues: boolean): DataViewFieldType{
        let type: DataViewFieldType;
        switch (fieldType) {
            case 'String': {
                type = 'TextBox'
                break;
            }
            case 'Integer': {
                type = 'NumberInteger'
                break;
            }
            case 'Double': {
                type = 'NumberReal'
                break;
            }
            case 'Bool': {
                type = 'Boolean'
                break;
            }
            case 'DateTime': {
                type = 'DateAndTime'
                break;
            }
            case 'Array': {
                if (hasOptionalValues) {
                    type = 'MultiTickBox';
                }
                else {
                    type = 'TextArea'
                }
                break;
            }
            default: {
                type = 'TextBox'
                break;
            }
        }
        if (hasOptionalValues && fieldType !== 'Array') {
            type = 'ComboBox'
        }
        return type;
    }

    openSortingForm(fieldName) {
        const config = this.dialogService.getDialogConfig({});
        this.dialogService.openDialog(SortingFormComponent, fieldName, config).afterClosed().subscribe((fieldSort) => {
            if (fieldSort) {
                const index = this.collection.ListView.Fields.findIndex(field => field.FieldID === fieldName);
                if (index > -1) {
                    const dvField = this.collection.ListView.Fields.splice(index, 1)[0];
                    this.collection.ListView.Fields.splice(fieldSort, 0, dvField);
                    this.fieldsDataSource = this.getFieldsDataSource();
                }
            }
        });
    }

    documentKeyTypeChanged(value: DocumentKeyType) {
        this.documentKeyValid = value !== 'Composite' || (this.collection.DocumentKey.Fields?.length > 0 || false)
        if (value != 'Composite') {
            this.collection.DocumentKey.Fields = [];
            this.collection.DocumentKey.Delimiter = '@';
        }
        else {
            this.collection.DocumentKey.Fields = this.collection.DocumentKey?.Fields || [];
            this.collection.DocumentKey.Delimiter = this.collection.DocumentKey?.Delimiter || '@';
        }
    }

    syncFieldChanged(value: SyncType) {
        if(!this.emptyCollection) {
            const data: PepDialogData = {
                title: "",
                content:this.translate.instant('CollectionForm_SyncData_Message'),
                actionsType: 'cancel-ok',
                showClose: true,
                showFooter: true,
                showHeader: false,
                actionButtons: []
            };
            const config = this.dialogService.getDialogConfig({}, 'regular');
            this.dialogService.openDefaultDialog(data, config).afterClosed().subscribe((isOKPressed) => {
                if(isOKPressed) {
                    if(value != 'Online') {
                        this.collection.SyncData = {
                            Sync: true,
                            SyncFieldLevel: false,
                        }
                    }
                    else {
                        if(this.collection.SyncData) {
                            this.collection.SyncData.Sync = false;
                        }
                        else {
                            this.collection.SyncData = {
                                Sync: false
                            }
                        }
                    }
                }
                else {
                    if (this.collection.SyncData) {
                        this.syncData = this.collection.SyncData.Sync ? 'Offline' : 'Online';
                    }
                    else {
                        this.syncData = 'Online';
                    }
                }
            });
        }
        else {
            if(value != 'Online') {
                this.collection.SyncData = {
                    Sync: true,
                    SyncFieldLevel: false,
                }
            }
            else {
                if(this.collection.SyncData) {
                    this.collection.SyncData.Sync = false;
                }
                else {
                    this.collection.SyncData = {
                        Sync: false
                    }
                }
            }
        }
    }
    
    nameChanged(value: string) {
        this.nameValid = value != '';
    }
}
