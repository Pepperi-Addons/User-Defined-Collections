import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SchemeFieldType, SchemeFieldTypes } from '@pepperi-addons/papi-sdk';
import { TranslateService } from '@ngx-translate/core';

import { FieldsFormDialogData, SelectOptions, booleanOptions } from '../../../entities';

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
    booleanOptions = booleanOptions;
    isArray: boolean = false;

    constructor(               
        private dialogRef: MatDialogRef<FieldsFormComponent>,
        private translate: TranslateService,
        @Inject(MAT_DIALOG_DATA) public incoming: FieldsFormDialogData) {          
            this.dialogData = incoming;
            this.dialogTitle = this.dialogData.Mode == 'Edit' ? translate.instant('FormField_Title_Edit', {field_name: this.dialogData.FieldName}) : translate.instant('FormField_Title_Add');
            this.fieldTypes = SchemeFieldTypes.filter(type => ['ContainedResource', 'DynamicResource', 'ContainedDynamicResource', 'MultipleStringValues', 'Object', 'Array'].includes(type) === false).map(type => {
                return {
                    key: type,
                    value: type,
                }
            });
            if (this.dialogData.Field.Type === 'Array') {
                this.isArray = true;
                this.dialogData.Field.Type = this.dialogData.Field.Items.Type;
            }
            this.hasOptionalValues = this.dialogData.Field.Type == 'String' || (this.isArray && this.dialogData.Field.Items?.Type === 'String');
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
        
        fieldTypeChanged(type: SchemeFieldType) {
            if(type == 'String' || (this.isArray && this.dialogData.Field.Items?.Type === 'String')) {
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
        }
        
        saveField() {
            if (this.isArray) {
                this.dialogData.Field.Items = {
                    Type: this.dialogData.Field.Type
                };
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

  }  

  