import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CollectionField, SchemeFieldType, SchemeFieldTypes } from '@pepperi-addons/papi-sdk';
import { TranslateService } from '@ngx-translate/core';

import { FieldsFormDialogData, SelectOptions, booleanOptions, EMPTY_OBJECT_NAME } from '../../../entities';
import { PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { IPepGenericListActions, IPepGenericListDataSource } from '@pepperi-addons/ngx-composite-lib/generic-list';
import { PepSelectionData } from '@pepperi-addons/ngx-lib/list';

@Component({
    selector: 'fields-form',
    templateUrl: './fields-form.component.html',
    styleUrls: ['./fields-form.component.scss']
})
export class FieldsFormComponent implements OnInit {

    dialogData: FieldsFormDialogData
    dialogTitle: string = ''
    fieldTypes: SelectOptions<string> = [];
    hasOptionalValues: boolean = true;
    resourcesOptions: SelectOptions<string>;
    booleanOptions = booleanOptions;
    isArray: boolean = false;
    objectFieldsValid: boolean = false;
    objectFieldsDataSource: IPepGenericListDataSource;
    EMPTY_OBJECT_NAME:string = EMPTY_OBJECT_NAME;
    supportArray: boolean = true;
    objectFields: {
        [ket:string]: CollectionField;
    }

    objectFieldsActions: IPepGenericListActions = {
        get: async (data: PepSelectionData) => {
            const actions = [];
            if (data && data.rows.length == 1) {
                actions.push({
                    title: this.translate.instant('Edit'),
                    handler: async (objs) => {
                        this.openObjectFieldsForm(objs.rows[0]);
                    }
                });
                actions.push({
                    title: this.translate.instant('Delete'),
                    handler: async (objs) => {
                        this.showDeleteDialog(objs.rows[0]);
                    }
                });
            }
            return actions;
        }
    }

    constructor(
        private dialogRef: MatDialogRef<FieldsFormComponent>,
        private translate: TranslateService,
        private dialogService: PepDialogService,
        @Inject(MAT_DIALOG_DATA) public incoming: FieldsFormDialogData) {
        this.dialogData = incoming;
        this.dialogTitle = this.dialogData.Mode == 'Edit' ? translate.instant('FormField_Title_Edit', { field_name: this.dialogData.FieldName }) : translate.instant('FormField_Title_Add');
        this.fieldTypes = this.dialogData.AvailableTypes.filter(type => type !== 'Array').map(type => {
            return {
                key: type,
                value: type,
            }
        });
        if (this.dialogData.Field.Type === 'Array') {
            this.isArray = true;
            this.dialogData.Field.Type = this.dialogData.Field.Items.Type;
        }
        if (this.dialogData.Field.Type === 'Object') {
            if (this.isArray) {
                this.objectFields = JSON.parse(JSON.stringify(this.dialogData.Field.Items.Fields));
            }
            else {
                this.objectFields = JSON.parse(JSON.stringify(this.dialogData.Field.Fields));
            }
            this.objectFieldsDataSource = this.getFieldsDataSource();
        }
        this.hasOptionalValues = this.dialogData.Field.Type == 'String' || (this.isArray && this.dialogData.Field.Items?.Type === 'String');
        this.resourcesOptions = this.dialogData.Resources.map(item => {
            return {
                key: item.Name,
                value: item.Name,
            }
        })
        this.objectFieldsValid = this.dialogData.Field.Type !== 'Object' || (this.dialogData.Field.Type === 'Object' && Object.keys(this.objectFields).length > 0);
        this.supportArray = this.dialogData.AvailableTypes.includes('Array');
    }

    ngOnInit() {
    }

    saveOptionalValues(value: string) {
        this.dialogData.Field.OptionalValues = value.split("\n");
    }

    resourceChanged($event) {
        const resource = this.dialogData.Resources.find(item => item.Name === $event);
        this.dialogData.Field.Resource = $event;
        this.dialogData.Field.AddonUUID = resource ? resource['AddonUUID'] : undefined;
    }

    fieldTypeChanged(type: SchemeFieldType) {
        if (type == 'String' || (this.isArray && this.dialogData.Field.Items?.Type === 'String')) {
            this.hasOptionalValues = true;
        }
        else {
            this.hasOptionalValues = false;
            this.dialogData.Field.OptionalValues = [];
        }
        if (type == 'Resource') {
            this.dialogData.Field.IndexedFields = {
                Key: {
                    Type: 'String'
                }
            };
        }
        if (type == 'Resource' || type == 'DateTime') {
            this.isArray = false;
        }

        if (type == 'Object') {
            this.objectFieldsDataSource = this.getFieldsDataSource();
        }
        else {
            this.objectFieldsValid = true;
        }
    }

    saveField() {
        if (this.dialogData.Field.Type != 'Object') {
            this.dialogData.Field.Fields = undefined; // erase object scheme to avoid saving stale data
        }
        else { 
            if(this.isArray) {
                this.dialogData.Field.Items.Fields = JSON.parse(JSON.stringify(this.objectFields));
            }
            else {
                this.dialogData.Field.Fields = JSON.parse(JSON.stringify(this.objectFields));
            }
        }
        if (this.isArray) {
            this.dialogData.Field.Items.Type = this.dialogData.Field.Type;
            this.dialogData.Field.Type = 'Array';
        }
        this.dialogRef.close({
            fieldName: this.dialogData.FieldName,
            field: this.dialogData.Field
        });
    }

    close() {
        this.dialogRef.close();
    }


    getFieldsDataSource() {
        return {
            init: async(params:any) => {
                
                let fields = Object.keys(this.objectFields).map(obj => {
                    const type = this.objectFields[obj].Type;
                    return {
                        Key: obj,
                        Type: type === 'Array' ? `${this.objectFields[obj].Items.Type} ${type}` : type,
                        Description: this.objectFields[obj].Description,
                        Mandatory: this.objectFields[obj].Mandatory,
                    };
                });
                this.objectFieldsValid = fields.length > 0;
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
                noDataFoundMsg: this.translate.instant('Object_Fields_NoDataFound')
            },
        } as IPepGenericListDataSource
    }

    openObjectFieldsForm(name: string) {
        const collectionField: CollectionField = {
            Description: this.objectFields[name]?.Description || '',
            Mandatory: this.objectFields[name]?.Mandatory || false,
            Type: this.objectFields[name]?.Type || 'String',
            OptionalValues: this.objectFields[name]?.OptionalValues || [],
            Items: this.objectFields[name]?.Items || {
                Type:'String',
                Mandatory: false,
                Description: ''
            }
        }
        let dialogConfig = this.dialogService.getDialogConfig({}, 'large');
        const dialogData: FieldsFormDialogData = {
            EmptyCollection: this.dialogData.EmptyCollection,
            Mode: name == EMPTY_OBJECT_NAME ? 'Add' : 'Edit',
            FieldName: name == EMPTY_OBJECT_NAME ? '' : name,
            InUidFields: false,
            Field: collectionField,
            Resources: this.dialogData.Resources,
            AvailableTypes: SchemeFieldTypes.filter(type => ['ContainedResource', 'DynamicResource', 'ContainedDynamicResource', 'MultipleStringValues', 'Object', 'Array'].includes(type) === false)
        }
        dialogConfig.data = new PepDialogData({
            content: FieldsFormComponent,
        })
        this.dialogService.openDialog(FieldsFormComponent, dialogData, dialogConfig).afterClosed().subscribe(value => {
            if (value) {
                const fieldName = value.fieldName;
                this.objectFields[fieldName] = value.field;
                const nameChanged = (name != EMPTY_OBJECT_NAME && name != fieldName);
                // if the field name has changed, delete the old field from the object
                if (nameChanged) {
                    delete this.objectFields[name];
                }

                this.objectFieldsDataSource = this.getFieldsDataSource();
            }
        })
    }

    showDeleteDialog(fieldName: string) {
        const data = new PepDialogData({
            title: this.translate.instant('DeleteField_DialogTitle'),
            content: this.translate.instant('DeleteField_DialogContent', {field_name: fieldName}),
            actionsType:'cancel-delete',
        });

        this.dialogService.openDefaultDialog(data).afterClosed().subscribe(isDeletePressed => {
            if(isDeletePressed) {
                delete this.objectFields[fieldName];
                this.objectFieldsDataSource = this.getFieldsDataSource();
            }
        });
    }

}

