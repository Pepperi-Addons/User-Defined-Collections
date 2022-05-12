import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IPepGenericListDataSource, IPepGenericListActions } from '@pepperi-addons/ngx-composite-lib/generic-list';
import { PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { PepSelectionData } from '@pepperi-addons/ngx-lib/list';
import { CollectionField, DataViewFieldType, GridDataView, GridDataViewField, SchemeFieldType, SchemeFieldTypes } from '@pepperi-addons/papi-sdk';
import { EMPTY_OBJECT_NAME } from '../services/utilities.service';
import { FieldsFormComponent, FieldsFormDialogData } from './fields/fields-form.component';
import { SortingFormComponent } from './sorting/sorting-form.component';

@Component({
  selector: 'app-fields-block',
  templateUrl: './fields-block.component.html',
  styleUrls: ['./fields-block.component.css']
})
export class FieldsBlockComponent implements OnInit {

    @Input() hostObject: any;
    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();

    fields: any;
    listView: GridDataView;
    title: string; 
    subTitle: string;
    types: SchemeFieldType[];
    referenceTypes: any;

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

    constructor(private translate: TranslateService,
                private dialogService: PepDialogService) { }

    ngOnInit(): void {
        this.fields = this.hostObject.fields || {};
        this.listView = this.hostObject.listView || {};
        this.title = this.hostObject.title || '';
        this.subTitle = this.hostObject.subTitle || '';
        this.types = this.hostObject.types || SchemeFieldTypes;
        this.referenceTypes = this.hostObject.referenceTypes || [];
    }

    getFieldsDataSource() {
        return {
            init: async(params:any) => {
                let fields = this.listView.Fields.map(obj => {
                    const type = this.fields[obj.FieldID].Type;
                    return {
                        Key: obj.FieldID,
                        Type: type === 'Array' ? `${this.fields[obj.FieldID].Items.Type} ${type}` : type,
                        Description: this.fields[obj.FieldID].Description,
                        Mandatory: this.fields[obj.FieldID].Mandatory,
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
            inputs: () => {
                return Promise.resolve({
                    pager: {
                        type: 'scroll'
                    },
                    selectionType: 'single',
                    noDataFoundMsg: this.translate.instant('Collection_Fields_NoDataFound')
                });
            },
        } as IPepGenericListDataSource
    }

    openFieldForm(name: string) {
        const collectionField: CollectionField = {
            Description: this.fields[name]?.Description || '',
            Mandatory: this.fields[name]?.Mandatory || false,
            Type: this.fields[name]?.Type || 'String',
            OptionalValues: this.fields[name]?.OptionalValues || [],
            Items: this.fields[name]?.Items || {
                Type:"String"
            }
        }
        let dialogConfig = this.dialogService.getDialogConfig({}, 'inline')
        const dialogData: FieldsFormDialogData = {
            EmptyCollection: false,//this.emptyCollection,
            Mode: name == EMPTY_OBJECT_NAME ? 'Add' : 'Edit',
            FieldName: name == EMPTY_OBJECT_NAME ? '' : name,
            //InUidFields: this.collection.DocumentKey.Fields?.includes(name) || false,
            InUidFields: false,
            Field: collectionField,
            AllowedTypes: this.types
        }
        dialogConfig.data = new PepDialogData({
            content: FieldsFormComponent,
        })
        this.dialogService.openDialog(FieldsFormComponent, dialogData, dialogConfig).afterClosed().subscribe(value => {
            if (value) {
                const fieldName = value.fieldName;
                this.fields[fieldName] = value.field;
                const dvField = this.getDataViewField(fieldName, value.field);
                let index = this.listView.Fields.findIndex(field => field.FieldID === fieldName);
                const nameChanged = (name != EMPTY_OBJECT_NAME && name != fieldName);
                // if the field doesn't exist on the default data view, add it to the end of the array
                if (index < 0) {
                    if (nameChanged) {
                        index = this.listView.Fields.findIndex(field => field.FieldID === name);
                        this.listView.Fields.splice(index, 1, dvField);
                        delete this.fields[name];
                    }
                    else {
                        this.listView.Fields.push(dvField);
                        this.listView.Columns.push({Width:10});
                    }
                }
                else {
                    this.listView.Fields.splice(index, 1, dvField);
                }
                this.hostEvents.emit({
                    Opration: dialogData.Mode === 'Add' ? 'Insert' : 'Update',
                    FieldName: fieldName,
                    Field: value.field
                });
                this.fieldsDataSource = this.getFieldsDataSource();
            }
        })
    }

    openSortingForm(fieldName) {
        const config = this.dialogService.getDialogConfig({});
        this.dialogService.openDialog(SortingFormComponent, fieldName, config).afterClosed().subscribe((fieldSort) => {
            if (fieldSort) {
                const index = this.listView.Fields.findIndex(field => field.FieldID === fieldName);
                if (index > -1) {
                    const dvField = this.listView.Fields.splice(index, 1)[0];
                    this.listView.Fields.splice(fieldSort, 0, dvField);
                    this.fieldsDataSource = this.getFieldsDataSource();
                }
            }
        });
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

    showDeleteDialog(fieldName: string) {
        const data = new PepDialogData({
            title: this.translate.instant('DeleteField_DialogTitle'),
            content: this.translate.instant('DeleteField_DialogContent', {field_name: fieldName}),
            actionsType:'cancel-delete',
        });

        this.dialogService.openDefaultDialog(data).afterClosed().subscribe(isDeletePressed => {
            if(isDeletePressed) {
                delete this.fields[fieldName];
                const index = this.listView.Fields.findIndex(field => field.FieldID === fieldName);
                this.listView.Fields.splice(index, 1);
                const fieldChangedEvent = {
                    Opration: 'Delete',
                    FieldName: fieldName
                }
                this.hostEvents.emit(fieldChangedEvent);
                this.fieldsDataSource = this.getFieldsDataSource();
            }
        });
    }
    
}
