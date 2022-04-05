import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

import { FormDataView } from '@pepperi-addons/papi-sdk';
import { PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';

import { MappingFormItem, MappingsService } from 'src/app/services/mappings.service';
import { FormMode, UtilitiesService } from './../../services/utilities.service';
import { UdcMapping } from './../../../../../server-side/entities'
import { IPepGenericFormValueChange, PepGenericFormService } from '@pepperi-addons/ngx-composite-lib/generic-form';

@Component({
  selector: 'app-mapping-form',
  templateUrl: './mapping-form.component.html',
  styleUrls: ['./mapping-form.component.scss']
})
export class MappingFormComponent implements OnInit {

    item: MappingFormItem;

    constructor (private dialogRef: MatDialogRef<MappingFormComponent>,
        private translate: TranslateService,
        private utilitiesService: UtilitiesService,
        private dialogService: PepDialogService,
        private mappingService: MappingsService,
        private genericFormService: PepGenericFormService,
        @Inject(MAT_DIALOG_DATA) public incoming: MappingFormData) { }

    ngOnInit(): void {
        this.item = this.incoming.Item;
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

    onValueChanged(event: IPepGenericFormValueChange) {
        console.log('value changed', event);
        switch (event.apiName) {
            case 'Title': {
                if (this.incoming.Mode === 'Add') {
                  let fieldID = event.value.replace(/\s/g, '');
                  this.item.ApiName = ('TSA' + fieldID).replace(/[^a-zA-Z 0-9]+/g, '');
                  this.genericFormService.updateFieldValue({
                      apiName: 'ApiName',
                      value: this.item.ApiName,
                      uid: event.uid
                  })
                }
                this.item.Title = event.value;
                break;
              }
              case 'ApiName': {
                let fieldID = event.value.replace(/\s/g, '');
                let name = fieldID.replace(/[^a-zA-Z 0-9]+/g, '');
        
                if (name.substring(0,3) != 'TSA'){
                  this.item.ApiName = ('TSA' + name);
                  this.genericFormService.updateFieldValue({
                      apiName: 'ApiName',
                      value: this.item.ApiName,
                      uid: event.uid
                  })
                }
                else {
                  this.item.ApiName = name;
                }
                break;
              }
        }
    }

}

export interface MappingFormData {
    Item: MappingFormItem;
    DataView: FormDataView;
    Mode: FormMode;
}