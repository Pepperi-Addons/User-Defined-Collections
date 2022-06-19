import { DocumentsService } from './../../services/documents.service';
import { UtilitiesService } from './../../services/utilities.service';
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { IPepGenericFormValueChange } from '@pepperi-addons/ngx-composite-lib/generic-form';
import { AddonData, FormDataView } from '@pepperi-addons/papi-sdk';
import { FormMode } from 'src/app/services/utilities.service';
import { PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { existingInRecycleBinErrorMessage, existingErrorMessage } from 'udc-shared';

@Component({
  selector: 'documents-form',
  templateUrl: './documents-form.component.html',
  styleUrls: ['./documents-form.component.scss']
})
export class DocumentsFormComponent implements OnInit {

    documentJSON:string = '{}';
    item: AddonData = {};
    error: string;
    isValid: boolean;
    
    constructor(               
        private dialogRef: MatDialogRef<DocumentsFormComponent>,
        private translate: TranslateService,
        private utilitiesService: UtilitiesService,
        private dialogService: PepDialogService,
        private documentsService: DocumentsService,
        @Inject(MAT_DIALOG_DATA) public incoming: DocumentsFormData) { }

    ngOnInit(): void {
        this.item = this.incoming.Item;
        this.isValid = this.incoming.Mode === 'Edit';
    }

    async saveDocument() {
        try {
            this.convertMultiChoiceValues();
            this.convertNumbers();
            this.convertTextArea();
            this.convertBoolean();
            if(this.incoming.Mode === 'Add') {
                try {
                    await this.documentsService.createCollection(this.incoming.CollectionName, this.item);
                    this.dialogRef.close(true);
                }
                catch (err) {
                    let contentKey = '';
                    if (err.message.indexOf(existingInRecycleBinErrorMessage) >= 0) {
                        contentKey = 'Documents_ExistingRecycleBinError_Content'
                    }
                    else if(err.message.indexOf(existingErrorMessage) >= 0){
                        contentKey = 'Documents_ExistingError_Content'
                    }
                    else {
                        throw err;
                    }
                    const dataMsg = new PepDialogData({
                        title: this.translate.instant('Documents_UpdateFailed_Title'),
                        actionsType: 'close',
                        content: this.translate.instant(contentKey, {collectionName: this.incoming.CollectionName})
                    });
                    this.dialogService.openDefaultDialog(dataMsg);
                }
            }
            else {
                await this.documentsService.upsertDocument(this.incoming.CollectionName, this.item);
                this.dialogRef.close(true);
            }
        }
        catch(error) {
            const errors = this.utilitiesService.getErrors(error.message);
            const dataMsg = new PepDialogData({
                title: this.translate.instant('Documents_UpdateFailed_Title'),
                actionsType: 'close',
                content: this.translate.instant('Documents_UpdateFailed_Content', {error: errors.map(error=> `<li>${error}</li>`)})
            });
            this.dialogService.openDefaultDialog(dataMsg);
        }
    }

    close() {
        this.dialogRef.close();
    }

    convertMultiChoiceValues() {

        this.incoming.DataView.Fields?.filter(field => field.Type === 'MultiTickBox').forEach(field => {
            if (this.item[field.FieldID] != "") {
                this.item[field.FieldID] = this.item[field.FieldID].split(";");
            }
            else {
                this.item[field.FieldID] = [];
            }
        })
    }
    
    convertTextArea() {
        this.incoming.DataView.Fields?.filter(field => field.Type === 'TextArea').forEach(field => {
            try {
                this.item[field.FieldID] = JSON.parse(this.item[field.FieldID])
            }
            catch {
            }
        })
    }
    
    convertNumbers() {
        this.incoming.DataView.Fields?.filter(field => field.Type === 'NumberInteger' || field.Type === 'NumberReal').forEach(field => {
            this.item[field.FieldID] = Number(this.item[field.FieldID]);
        })
    }

    convertBoolean() {
        this.incoming.DataView.Fields?.filter(field => field.Type === 'Boolean').forEach(field => {
            if(this.item[field.FieldID].toLowerCase() === "true") {
                this.item[field.FieldID] = true;
            }
            else {
                this.item[field.FieldID] = false;
            }
        })
    }
}

export type DocumentsFormData = {
    Mode: FormMode,
    Item: any,
    DataView: FormDataView,
    CollectionName: string
}
