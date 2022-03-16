import { FormMode } from '../../../services/utilities.service';
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CollectionField, SchemeFieldType, SchemeFieldTypes } from '@pepperi-addons/papi-sdk'
import { TranslateService } from '@ngx-translate/core';

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
    constructor(               
        private dialogRef: MatDialogRef<FieldsFormComponent>,
        private translate: TranslateService,
        @Inject(MAT_DIALOG_DATA) public incoming: FieldsFormDialogData) {          
            this.dialogData = incoming;
            this.dialogTitle = this.dialogData.Mode == 'Edit' ? translate.instant('FormField_Title_Edit', {field_name: this.dialogData.FieldName}) : translate.instant('FormField_Title_Add');
            this.fieldTypes = SchemeFieldTypes.filter(type => type !== 'MultipleStringValues').map(type => {
                return {
                    key: type,
                    value: type,
                }
            });
            this.fieldSubTypes = SchemeFieldTypes.filter(type => type !== 'MultipleStringValues' && type !== 'Array').map(type => {
                return {
                    key: type,
                    value: type,
                }
            });
            this.fieldSubType = this.dialogData.Field.Items?.Type;
    }

    ngOnInit() {
    }

    saveOptionalValues(value: string) {
        this.dialogData.Field.OptionalValues = value.split("\n");
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

  export type FieldsFormDialogData = {
    Field: CollectionField;
    FieldName: string;
    Mode: FormMode;
    EmptyCollection: boolean;
    InUidFields: boolean;
}