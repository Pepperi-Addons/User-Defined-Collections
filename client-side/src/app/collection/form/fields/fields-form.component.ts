import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SchemeFieldType, SchemeFieldTypes } from '@pepperi-addons/papi-sdk';
import { TranslateService } from '@ngx-translate/core';

import { FieldsFormDialogData, SelectOptions } from '../../../entities';

@Component({
    selector: 'fields-form',
    templateUrl: './fields-form.component.html',
    styleUrls: ['./fields-form.component.scss']
  })
  export class FieldsFormComponent implements OnInit {

    dialogData: FieldsFormDialogData
    dialogTitle: string = ''
    fieldTypes: {key:string, value: string}[] = [];
    fieldSubTypes: {key:string, value: string}[] = [];
    fieldSubType: SchemeFieldType;
    hasOptionalValues: boolean = true;
    resourcesOptions: SelectOptions<string>;
    constructor(               
        private dialogRef: MatDialogRef<FieldsFormComponent>,
        private translate: TranslateService,
        @Inject(MAT_DIALOG_DATA) public incoming: FieldsFormDialogData) {          
            this.dialogData = incoming;
            this.dialogTitle = this.dialogData.Mode == 'Edit' ? translate.instant('FormField_Title_Edit', {field_name: this.dialogData.FieldName}) : translate.instant('FormField_Title_Add');
            this.fieldTypes = SchemeFieldTypes.filter(type => ['ContainedResource', 'DynamicResource', 'ContainedDynamicResource', 'MultipleStringValues', 'Object'].includes(type) === false).map(type => {
                return {
                    key: type,
                    value: type,
                }
            });
            this.fieldSubTypes = SchemeFieldTypes.filter(type => ['ContainedResource', 'DynamicResource', 'ContainedDynamicResource','MultipleStringValues', 'Object', 'Array', 'Bool', 'DateTime'].includes(type) === false).map(type => {
                return {
                    key: type,
                    value: type,
                }
            });
            this.fieldSubType = this.dialogData.Field.Items?.Type;
            this.hasOptionalValues = this.dialogData.Field.Type == 'String' || (this.dialogData.Field.Type === 'Array' && this.dialogData.Field.Items?.Type === 'String');
            this.resourcesOptions = this.dialogData.Resources.map(item => {
                return {
                    key: item.Name,
                    value: item.Name,
                }
            })
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
        
        fieldTypeChanged(type: string) {
            if(type == 'String' || (type === 'Array' && this.dialogData.Field.Items?.Type === 'String')) {
                this.hasOptionalValues = true;
            }
            else {
                this.hasOptionalValues = false;
                this.dialogData.Field.OptionalValues = [];
            }
            if(type == 'Resource' || (type === 'Array' && this.dialogData.Field.Items?.Type === 'Resource')) {
                this.dialogData.Field.IndexedFields = {
                    Key: {
                        Type: 'String'
                    }
                };
            }
        }
        
        saveField() {
            if (this.fieldSubType && this.dialogData.Field.Type === 'Array') {
                this.dialogData.Field.Items = {
                    Type: this.fieldSubType
                };
        }
        this.dialogRef.close({
            fieldName: this.dialogData.FieldName,
            field: this.dialogData.Field
        });
    }

    close() {
        this.dialogRef.close();
    }

  }  

  