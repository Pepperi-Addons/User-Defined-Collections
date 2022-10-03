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
    isArray: string = 'false';
    isMandatory: string = 'false';
    objectFieldsDataSource: IPepGenericListDataSource;
    EMPTY_OBJECT_NAME:string = EMPTY_OBJECT_NAME;
    supportArray: boolean = true;
    supportIndexed: boolean = true;
    objectFields: {
        [key:string]: CollectionField;
    }
    isIndexed: string = 'false';

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
            this.isArray = 'true';
            this.dialogData.Field.Type = this.dialogData.Field.Items.Type;
        }
        this.hasOptionalValues = this.dialogData.Field.Type == 'String' || (this.isArray === 'true' && this.dialogData.Field.Items?.Type === 'String');
        this.initResources(this.dialogData.Field.Type);
        this.supportArray = this.dialogData.AvailableTypes.includes('Array');
        this.isIndexed = this.dialogData.Field.Indexed ? 'true' : 'false';
        this.updateSupportIndex(this.dialogData.Field.Type);
        this.isMandatory = this.dialogData.Field.Mandatory ? 'true': 'false';
    }

    ngOnInit() {
    }

    saveOptionalValues(value: string) {
        this.dialogData.Field.OptionalValues = value.split("\n");
    }

    resourceChanged($event) {
        const resource = this.dialogData.Field.Type === 'Resource' ? this.dialogData.Resources.find(item => item.Name === $event) : this.dialogData.ContainedResources.find(item => item.Name === $event);
        this.dialogData.Field.Resource = $event;
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
        this.supportIndexed = ['String', 'Bool', 'Integer', 'Double', 'DateTime'].includes(type) == true;
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
        }
    }
}

