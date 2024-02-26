import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AddonDataScheme, CollectionField, SchemeField, SchemeFieldType, SchemeFieldTypes } from '@pepperi-addons/papi-sdk';
import { TranslateService } from '@ngx-translate/core';

import { FieldsFormDialogData, SelectOptions, booleanOptions, EMPTY_OBJECT_NAME } from '../../../entities';
import { PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { IPepGenericListActions, IPepGenericListDataSource, IPepGenericListInitData } from '@pepperi-addons/ngx-composite-lib/generic-list';
import { PepSelectionData } from '@pepperi-addons/ngx-lib/list';
import { AdditionalFieldsFormComponent } from './additional-fields-form/additional-fields-form.component';
import { UtilitiesService } from 'src/app/services/utilities.service';

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
    isArray: string = 'false';
    isMandatory: string = 'false';
    additionalFieldsDataSource: IPepGenericListDataSource;
    EMPTY_OBJECT_NAME:string = EMPTY_OBJECT_NAME;
    supportArray: boolean = true;
    supportIndexed: boolean = true;
    isIndexed: string = 'false';
    resourceFields: AddonDataScheme['Fields'];
    applySystemFilter: string = 'true';
    additionalFieldsActions: IPepGenericListActions = {
        get: async (data: PepSelectionData) => {
            const actions = [];
            if(data && data.rows.length === 1) {
                actions.push({
                    title: this.translate.instant('Delete'),
                    handler: (objs: any) => {
                        this.showDeleteDialog(objs.rows[0]);
                    }
                })
            }
            return actions;
        }
    }
    
    constructor(
        private dialogRef: MatDialogRef<FieldsFormComponent>,
        private translate: TranslateService,
        private dialogService: PepDialogService,
        private utilitiesService: UtilitiesService,
        @Inject(MAT_DIALOG_DATA) public incoming: FieldsFormDialogData) {
            this.dialogData = incoming;
            this.dialogTitle = this.dialogData.Mode == 'Edit' ? translate.instant('FormField_Title_Edit', { field_name: this.dialogData.FieldName }) : translate.instant('FormField_Title_Add');
            this.fieldTypes = this.dialogData.AvailableTypes.filter(type => type !== 'Array').map(type => {
                return {
                    // if type is Resource, we want to display "Reference"
                    key: type,
                    value: type === 'Resource' ? 'Reference' : type
                }
            });
            if (this.dialogData.Field.Type === 'Array') {
                this.isArray = 'true';
                this.dialogData.Field.Type = this.dialogData.Field.Items.Type;
            }
            this.hasOptionalValues = this.dialogData.Field.Type == 'String' || (this.isArray === 'true' && this.dialogData.Field.Items?.Type === 'String');
            this.initResources(this.dialogData.Field.Type);
            this.supportArray = this.dialogData.AvailableTypes.includes('Array');
            this.isIndexed = this.dialogData.Field.Indexed ? 'true' : 'false';
            this.updateSupportIndex(this.dialogData.Field.Type);
            this.isMandatory = this.dialogData.Field.Mandatory ? 'true': 'false';
            this.applySystemFilter = this.dialogData.Field.ApplySystemFilter ? 'true' : 'false'
            this.additionalFieldsDataSource = this.getAdditionalFieldsDataSource();
        }
        
        ngOnInit() {
        }
        
        saveOptionalValues(value: string) {
            this.dialogData.Field.OptionalValues = value.split("\n");
        }
        
        async resourceChanged($event) {
            const resource = this.dialogData.Field.Type === 'Resource' ? this.dialogData.Resources.find(item => item.Name === $event) : this.dialogData.ContainedResources.find(item => item.Name === $event);
            this.dialogData.Field.Resource = $event;
            this.initResourceFields();
            this.dialogData.Field.IndexedFields = {};
            this.dialogData.Field.AddonUUID = resource ? resource['AddonUUID'] : undefined;
        }
        
        fieldTypeChanged(type: SchemeFieldType) {
            if (type == 'String' || (this.isArray === 'true' && this.dialogData.Field.Items?.Type === 'String')) {
                this.hasOptionalValues = true;
            }
            else {
                this.hasOptionalValues = false;
                this.dialogData.Field.OptionalValues = [];
            }
            if (type == 'Resource' || type == 'DateTime') {
                this.isArray = 'false';
            }
            
            this.updateSupportIndex(type);
            this.initResources(type);
        }
        
        saveField() {
            this.dialogData.Field.Indexed = this.isIndexed === 'true';
            this.dialogData.Field.Mandatory = this.isMandatory === 'true';
            this.dialogData.Field.ApplySystemFilter = this.applySystemFilter === 'true' && this.dialogData.Field.Type === 'Resource';
            if (this.isArray === 'true') {
                if(this.dialogData.Field.Type === 'Resource' || this.dialogData.Field.Type === 'ContainedResource') { // on resource array, the resource & addonUUID data should be on the Items.
                    this.dialogData.Field.Items.Resource = this.dialogData.Field.Resource;
                    this.dialogData.Field.Items.AddonUUID = this.dialogData.Field.AddonUUID;
                }
                this.dialogData.Field.Items.Type = this.dialogData.Field.Type;
                this.dialogData.Field.Type = 'Array';
                this.dialogData.Field.Fields = undefined; // if this is an array of objects, the fields should be on the items.
            }
            this.dialogRef.close({
                fieldName: this.dialogData.FieldName,
                field: this.dialogData.Field
            });
        }
        
        close() {
            this.dialogRef.close();
        }
        
        updateSupportIndex(type: SchemeFieldType) {
            this.supportIndexed = ['String', 'Bool', 'Integer', 'Double', 'DateTime', 'Resource'].includes(type) == true;
        }
        
        initResources(type: SchemeFieldType) {
            if(type === 'ContainedResource') {
                this.resourcesOptions = this.dialogData.ContainedResources.map(item => {
                    return {
                        key: item.Name,
                        value: item.Name,
                    }
                })
            }
            else if (type === 'Resource') {
                this.resourcesOptions = this.dialogData.Resources.map(item => {
                    return {
                        key: item.Name,
                        value: item.Name,
                    }
                })
                this.initResourceFields();
            }
        }

        showDeleteDialog(fieldName: string) {
            const data = new PepDialogData({
                title: this.translate.instant('DeleteAdditionalField_DialogTitle'),
                content: this.translate.instant('DeleteAdditionalField_DialogContent', {field_name: fieldName}),
                actionsType:'cancel-delete',
            });
    
            this.dialogService.openDefaultDialog(data).afterClosed().subscribe(isDeletePressed => {
                if(isDeletePressed) {
                    delete this.incoming.Field.IndexedFields[fieldName];
                    this.additionalFieldsDataSource = this.getAdditionalFieldsDataSource();
                }
            });
        }

        getAdditionalFieldsDataSource(): IPepGenericListDataSource {
            const fields = Object.keys(this.incoming.Field.IndexedFields).map(field => {
                return {
                    Key: field
                }
            });

            return {
                init: async (params): Promise<IPepGenericListInitData> => {
                    return {
                        dataView: {
                            Context: {
                                Name: '',
                                Profile: { InternalID: 0 },
                                ScreenSize: 'Landscape'
                            },
                            Type: 'Grid',
                            Title: '',
                            Fields: [{
                                FieldID: 'Key',
                                Type: 'TextBox',
                                Title: this.translate.instant('Field'),
                                Mandatory: false,
                                ReadOnly: true
                            }],
                            Columns: [{
                                Width: 10,
                            }]
                        },
                        items: fields,
                        totalCount: fields.length
                    }
                },
                inputs: {
                    pager: {
                        type: 'scroll',
                    },
                },
            };
        }

        async openFieldForm() {
            const config = this.dialogService.getDialogConfig({});
            const fieldsToShow = Object.keys(this.resourceFields || {}).filter(fieldName => this.isNotIndexedField(fieldName)).sort((a,b)=> {return a.localeCompare(b)});
            const fieldNames: SelectOptions<string> = fieldsToShow.map(field => {
                return {
                    key: field,
                    value: field
                }   
            });
            this.dialogService.openDialog(AdditionalFieldsFormComponent, { ResourceFields: fieldNames }, config).afterClosed().subscribe((fieldName) => {
                if (fieldName) {
                    this.incoming.Field.IndexedFields[fieldName] = {
                        Type: this.resourceFields[fieldName].Type,
                        Indexed: true,
                    }
                    this.additionalFieldsDataSource = this.getAdditionalFieldsDataSource();
                }
            });
        }

        isNotIndexedField(fieldName) {
            return this.incoming.Field.IndexedFields[fieldName] === undefined;
        }

        initResourceFields() {
            const resource = this.dialogData.Resources.find(resource => resource.Name === this.dialogData.Field.Resource);
            this.resourceFields = resource ?  this.getAllowedFields(resource.Fields) : {};
        }

        getAllowedFields(fields: {[key: string]: SchemeField}) {
            const ret = {};
            Object.keys(fields || {}).forEach(field => {
                if (['String', 'Bool', 'Integer', 'Double', 'DateTime'].includes(fields[field].Type)) {
                    ret[field] = fields[field];
                }
            })

            return ret;
        }
    }
    
    