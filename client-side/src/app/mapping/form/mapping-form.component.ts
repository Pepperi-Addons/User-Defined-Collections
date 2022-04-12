import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

import { Collection, FormDataView, Type } from '@pepperi-addons/papi-sdk';
import { PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';

import { MappingFormItem, MappingsService } from 'src/app/services/mappings.service';
import { FormMode, UtilitiesService } from './../../services/utilities.service';
import { MappingFieldTypes, UdcMapping } from './../../../../../server-side/entities'
import { IPepGenericFormDataSource, IPepGenericFormValueChange, PepGenericFormService } from '@pepperi-addons/ngx-composite-lib/generic-form';
import { KeyValuePair } from '@pepperi-addons/ngx-lib';
import { CollectionsService } from 'src/app/services/collections.service';

@Component({
  selector: 'app-mapping-form',
  templateUrl: './mapping-form.component.html',
  styleUrls: ['./mapping-form.component.scss']
})
export class MappingFormComponent implements OnInit {

    item: MappingFormItem;
    atdFields;

    temporaryOptions = [{
        key: true,
        value: "True"
    }, 
    {
        key: false,
        value: "False"
    }]

    fieldTypes = MappingFieldTypes.map(type => {
        return {
            key: type,
            value: this.translate.instant(`FieldType_${type}`)
        }
    })

    resourceOptions = [{
        key: 'transactions',
        value: 'Transactions'
    },
    {
        key: 'transaction_lines',
        value: 'Transaction Lines'
    }]

    collections: Collection[] = [];
    collectionsOptions: any = [];
    chosenCollection: Collection = undefined;
    collectionFields: any = [];
    filterOptions: any = {};


    constructor (private dialogRef: MatDialogRef<MappingFormComponent>,
        private translate: TranslateService,
        private utilitiesService: UtilitiesService,
        private dialogService: PepDialogService,
        private mappingService: MappingsService,
        private collectionsService: CollectionsService,
        private genericFormService: PepGenericFormService,
        @Inject(MAT_DIALOG_DATA) public incoming: MappingFormData) { }
        
    ngOnInit(): void {
        this.item = this.incoming.Item;
        this.collectionsService.getMappingsCollections().then((items: Collection[]) => {
            this.collections = items;
            this.collectionsOptions = items.map(item => {
                return {
                    key: item.Name,
                    value: item.Name
                }
            })
            if (this.item.Collection) {
                this.collectionChanged(this.item.Collection, false);
            }
        })
    }

    close() {
        this.dialogRef.close();
    }

    async save() {
        try {
            await this.mappingService.upsertMapping(this.item)
            this.dialogRef.close(true);
        }
        catch (err) {
            const operation = this.incoming.Mode === 'Add' ? this.translate.instant('Create') : this.translate.instant('Update')
            const dataMsg = new PepDialogData({
                title: this.translate.instant('Mapping_SaveFailed_Title', {Operation: operation}),
                actionsType: 'close',
                content: this.translate.instant('Mapping_SaveFailed_Content', {Operation: operation, Field: this.item.ApiName})
            });
            this.dialogService.openDefaultDialog(dataMsg);
        }
    }

    nameChanged(apiName: string, value: any) {
        switch (apiName) {
            case 'Title': {
                if (this.incoming.Mode === 'Add') {
                    let fieldID = value.replace(/\s/g, '');
                    this.item.ApiName = ('TSA' + fieldID).replace(/[^a-zA-Z 0-9]+/g, '');
                }
                this.item.Title = value;
                break;
            }
            case 'ApiName': {
                let fieldID = value.replace(/\s/g, '');
                let name = fieldID.replace(/[^a-zA-Z 0-9]+/g, '');
                
                if (name.substring(0,3) != 'TSA'){
                    this.item.ApiName = ('TSA' + name);
                }
                else {
                    this.item.ApiName = name;
                }
                break;
            }
        }
    }

    typeChanged(value) {
        this.item.CollectionField = '';
        this.updateCollectionFields(this.chosenCollection, value)
    }

    resourceChanged(value) {
        this.item.DocumentKeyMapping = [];
        this.getFilterOptions();
    }
    
    collectionChanged(value, clearFilter = true) {
        this.mappingService.getFields(this.item.Atd.InternalID).then(tsaFields => {
            this.atdFields = tsaFields;
            this.chosenCollection = this.collections.find(collection => collection.Name === value);
            this.item.CollectionDelimiter = this.chosenCollection.DocumentKey?.Delimiter;
            this.updateCollectionFields(this.chosenCollection, this.item.Type);
            clearFilter ? this.item.DocumentKeyMapping = [] : null;
            this.getFilterOptions();
        });
    }

    getFilterOptions() {
        this.chosenCollection.DocumentKey.Fields.forEach(field => {
            const collectionField = this.chosenCollection?.Fields[field];
            if (collectionField) {
                const fieldType = collectionField.Type !== 'Array' ? collectionField.Type : collectionField.Items.Type;
                this.filterOptions[field] = this.mappingService.getFilterOptions(this.atdFields, fieldType, this.item.Resource).map(item => {
                    return {
                        key: item.Key,
                        value: item.Value
                    }
                });
            }
            else {
                this.filterOptions[field] = [];
            }
        })
    }

    updateCollectionFields(collection, fieldType) {
        if (collection) {
            this.collectionFields = this.mappingService.getCollectionFields(collection, fieldType).map(item => {
                return {
                    key: item.Key,
                    value: item.Value
                }
            });
        }
        else {
            this.collectionFields = []
        }

    }

    documentKeyMappingChanged(value, field, index) {
        this.item.DocumentKeyMapping[index] = {
            Key: field,
            Value: value
        }
    }
}

export interface MappingFormData {
    Item: MappingFormItem;
    DataView: FormDataView;
    Mode: FormMode;
}