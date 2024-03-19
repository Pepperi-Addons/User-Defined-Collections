import { Component, OnInit, TemplateRef, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { MatDialogRef } from '@angular/material/dialog';

import {  AddonData,
          AddonDataScheme,
          Collection,
          CollectionField,
          DataViewFieldType,
          DocumentKeyType,
          DocumentKeyTypes,
          GridDataViewField,
          SchemeFieldType,
          SchemeFieldTypes,
          SearchData } from '@pepperi-addons/papi-sdk';

import { PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { PepSelectionData } from '@pepperi-addons/ngx-lib/list';
import { GenericListComponent, IPepGenericListActions, IPepGenericListDataSource } from '@pepperi-addons/ngx-composite-lib/generic-list';

import { CollectionsService } from '../../../../services/collections.service';
import { UtilitiesService } from '../../../../services/utilities.service';
import { booleanOptions, EMPTY_OBJECT_NAME, FieldsFormDialogData, SelectOptions, SyncType, SyncTypes } from '../../../../entities';

import { CollectionFormComponent } from '../../collection-form.component';
import { FieldsFormComponent } from '../../fields/fields-form.component';
import { SortingFormComponent } from '../../sorting/sorting-form.component';
import { DataForCollectionForm } from 'udc-shared';

@Component({
  selector: 'form-general-tab',
  templateUrl: './general-tab.component.html',
  styleUrls: ['./general-tab.component.scss']
})
export class GeneralTabComponent implements OnInit {
  @Output() saveCollection: EventEmitter<Collection> = new EventEmitter<Collection>();
  @Output() documentKeyValidationChange: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Input() insideTab: boolean = true;
  @Input() dataForCollectionForm: DataForCollectionForm;  
  collection: Collection;
  fieldsLimit: number = 30;
  resources: AddonDataScheme[] = [];  
  containedResources: AddonDataScheme[] = []; 
  collectionName: string;
  emptyCollection: boolean = true;
  documentKeyValid: boolean = false;
  booleanOptions = booleanOptions;
  syncData: SyncType = 'Offline';
  EMPTY_OBJECT_NAME = EMPTY_OBJECT_NAME;
  extended: string = ''
  currentTabIndex: number = 0;
  fieldsDataSource: IPepGenericListDataSource;

  fieldsActions: IPepGenericListActions = {
      get: async (data: PepSelectionData) => {
          const actions = [];
          if (data && data.rows.length == 1) {
              const fieldIndexed = this.originFields[data.rows[0]]?.Indexed || false;
              const extendedField = this.originFields[data.rows[0]] ? this.originFields[data.rows[0]].ExtendedField : false;
              if (!extendedField) {
                  actions.push({
                      title: this.translate.instant('Edit'),
                      handler: async (objs) => {
                          this.openFieldForm(objs.rows[0]);
                      }
                  });
                  // if the field is indexed than it cannot be deleted
                  if (!fieldIndexed) {
                      actions.push({
                          title: this.translate.instant('Delete'),
                          handler: async (objs) => {
                              this.showDeleteDialog(objs.rows[0]);
                          }
                      })
                  }
              }
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
  collectionFields: { key:string, value: string }[] = [];
  fieldKey: string;
  fieldSort: number;
  dialogRef: MatDialogRef<CollectionFormComponent>
  uidList: GenericListComponent
  originFields: {
      [key: string]: CollectionField
  } = undefined;

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
    private translate: TranslateService,
    private dialogService: PepDialogService) { }

  ngOnInit(): void {
    this.translate.get(['SyncData_Options_Online', 'SyncData_Options_Offline', 'SyncData_Options_OnlyScheme', 'DocumentKey_Options_AutoGenerate', 'DocumentKey_Options_Composite']).subscribe(translations => {
      this.documentKeyOptions = DocumentKeyTypes.filter(type => type !== 'Key').map(type => {
          return {
              key: type,
              value: translations[`DocumentKey_Options_${type}`],
          }
      })
      this.syncOptions = SyncTypes.filter(type => type != 'OnlyScheme').map(type => {
          return {
              key: type,
              value: translations[`SyncData_Options_${type}`],
          }
      })
        this.fieldsDataSource = this.getFieldsDataSource();
        // get all data from input
        this.emptyCollection = this.dataForCollectionForm.CollectionIsEmpty;
        this.resources = this.dataForCollectionForm.Resources;
        this.collection = this.dataForCollectionForm.Collection;
        this.containedResources = this.dataForCollectionForm.ContainedCollections;
        this.fieldsLimit = this.dataForCollectionForm.FieldsLimit;
        
        this.collectionLoaded = true; // I left this here though I'm not sure if it's necessary now that the collection is being set in the parent component
        if (this.uidList) {
            this.uidList.selectionType = this.emptyCollection ? 'single': 'none';
            this.uidFieldsDataSource = this.getUIDFieldsDataSource();
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
        if (this.collection.Type === 'contained') {
            this.syncData = 'OnlyScheme';
            this.collection.SyncData.Sync = false;
        }
        this.documentKeyValid = (this.collection.DocumentKey.Type !== 'Composite' || this.collection.DocumentKey.Fields.length > 0);
        this.documentKeyValidationChange.emit(this.documentKeyValid);
        // deep copy the object to avoid unwanted data changes
        this.originFields = JSON.parse(JSON.stringify(this.collection.Fields || {}));
        this.extended = this.collection.Extends ? this.collection.Extends.Name : '';
    });
  }
  
  getFieldsDataSource() {
    return {
        init: async(params:any) => {
            let fields = this.collection.ListView.Fields.map(obj => {
                const type = this.collection.Fields[obj.FieldID].Type;
                let fieldType: string;

                switch (type) {
                    case 'Array':
                        fieldType = `${this.collection.Fields[obj.FieldID].Items.Type} ${type}`;
                        break;
                    case 'Resource':
                        fieldType = 'Reference';
                        break;
                    default:
                        fieldType = type;
                        break;
                }

                return {
                    Key: obj.FieldID,
                    Description: this.collection.Fields[obj.FieldID].Description,
                    Type: fieldType,
                    Mandatory: this.collection.Fields[obj.FieldID].Mandatory,
                    Indexed: this.collection.Fields[obj.FieldID].Indexed || false,
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
                        {
                            FieldID: 'Mandatory',
                            Type: 'Boolean',
                            Title: this.translate.instant('Mandatory'),
                            Mandatory: false,
                            ReadOnly: true
                        },
                        {
                            FieldID: 'Indexed',
                            Type: 'Boolean',
                            Title: this.translate.instant('Indexed'),
                            Mandatory: false,
                            ReadOnly: true
                        },
                    ],
                    Columns: [
                        {
                            Width: 20
                        },
                        {
                            Width: 20
                        },
                        {
                            Width: 20
                        },
                        {
                            Width: 20
                        },
                        {
                            Width: 20
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
            this.documentKeyValidationChange.emit(this.documentKeyValid);
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
        Resource: this.collection.Fields[name]?.Resource || '',
        AddonUUID: this.collection.Fields[name]?.AddonUUID || '',
        Indexed: this.collection.Fields[name]?.Indexed || false,
        IndexedFields: this.collection.Fields[name]?.IndexedFields || {},
        ApplySystemFilter: this.collection.Fields[name]?.ApplySystemFilter || false,
    }
    let dialogConfig = this.dialogService.getDialogConfig({}, 'large');
    const dialogData: FieldsFormDialogData = {
        EmptyCollection: this.emptyCollection,
        Mode: name == EMPTY_OBJECT_NAME ? 'Add' : 'Edit',
        FieldName: name == EMPTY_OBJECT_NAME ? '' : name,
        InUidFields: this.collection.DocumentKey.Fields?.includes(name) || false,
        Field: collectionField,
        Resources: this.resources,
        ContainedResources: this.containedResources,
        AvailableTypes: this.getAllowedTypes(),
        AllowTypeChange: !this.originFields[name]?.Indexed
    }
    dialogConfig.data = new PepDialogData({
        content: FieldsFormComponent,
    })
    if (dialogData.Mode == 'Add') {
        if (this.getTotalFieldsCount(this.collection) >= this.fieldsLimit) {
            this.dialogService.openDefaultDialog(new PepDialogData({
                title: this.translate.instant('Error'),
                content: this.translate.instant('CollectionForm_FieldsLimitErrorBeforeAdd', { limit: this.fieldsLimit }),
                actionsType: 'close',
            }));
            return;
        }
    }
    this.dialogService.openDialog(FieldsFormComponent, dialogData, dialogConfig).afterClosed().subscribe(value => {
        if (value) {
            const fieldName = value.fieldName;
            const previousField = this.collection.Fields[fieldName];
            this.collection.Fields[fieldName] = value.field;
            if (this.getTotalFieldsCount(this.collection) > this.fieldsLimit) {
                // if the field is added to the collection, but the total fields count exceeds the limit, revert changes
                if (previousField !== undefined) {
                    this.collection.Fields[fieldName] = previousField;
                }
                else {
                    delete this.collection.Fields[fieldName];
                }
                this.dialogService.openDefaultDialog(new PepDialogData({
                    title: this.translate.instant('Error'),
                    content: this.translate.instant('CollectionForm_FieldsLimitErrorAfterAdd', { limit: this.fieldsLimit }),
                    actionsType: 'close',
                }));
                return;
            }
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

getAllowedTypes(): SchemeFieldType[] {
    let types = SchemeFieldTypes.filter(type => ['Object', 'DynamicResource', 'ContainedDynamicResource', 'MultipleStringValues'].includes(type) === false);
    if (this.collection.Type == 'contained') {
        types = types.filter(type => type != 'ContainedResource');
    }
    return types;
}

async saveClicked() {
    this.saveCollection.emit(this.collection);
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
        Type: this.getDataViewFieldType(field.Type, field.OptionalValues?.length > 0 || false)
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
                type = 'TextBox'
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
    this.documentKeyValidationChange.emit(this.documentKeyValid);
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
                this.changeSyncData(value);
            }
            else {
                if (this.collection.SyncData) {
                    this.syncData = this.collection.Type === 'contained' ? 'OnlyScheme' : this.collection.SyncData.Sync ? 'Offline' : 'Online';
                }
                else {
                    this.syncData = 'Online';
                }
            }
        });
    }
    else {
        this.changeSyncData(value);
    }
    // after settting sync data, if it's not scheme only, change collection's type
    if (this.syncData != 'OnlyScheme') {
        this.collection.Type = 'data';
    }
}

changeSyncData(newSyncData: SyncType) {
    switch (newSyncData) {
        case 'Offline': {
            this.collection.SyncData = {
                Sync: true,
                SyncFieldLevel: false,
            }
            break;
        }
        case 'OnlyScheme': {
            this.collection.Type = 'contained';
        }
        case 'Online': {
            if(this.collection.SyncData) {
                this.collection.SyncData.Sync = false;
            }
            else {
                this.collection.SyncData = {
                    Sync: false
                }
            }
            break;
        }
    }
}
    
getTotalFieldsCount(collection: Collection): number { 
    let totalFieldsCount = 0;

    // Check if there are fields in the current collection
    if (collection && collection.Fields) {
        // Iterate over each field in the collection
        Object.keys(collection.Fields).forEach(fieldID => {
            const field = collection.Fields[fieldID];
            
            // If the field type is 'ContainedResource', find the contained collection and count its fields
            if (field.Type === 'ContainedResource' && field.Resource) {
                // Find the contained collection from the pre-loaded contained collections
                const containedCollection = this.dataForCollectionForm.ContainedCollections.find(c => c.Name === field.Resource);
                
                // Add the fields count of the contained collection to the total, if the contained collection is found
                if (containedCollection && containedCollection.Fields) {
                    totalFieldsCount += Object.keys(containedCollection.Fields).length;
                }
            } else {
                // Regular field, increment the total fields count by 1
                totalFieldsCount++;
            }
        });
    }

    return totalFieldsCount;
}
}
