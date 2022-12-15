import { DocumentsService } from './../../services/documents.service';
import { UtilitiesService } from './../../services/utilities.service';
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { IPepGenericFormValueChange } from '@pepperi-addons/ngx-composite-lib/generic-form';
import { AddonData, FormDataView } from '@pepperi-addons/papi-sdk';
import { PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { existingInRecycleBinErrorMessage, existingErrorMessage } from 'udc-shared';
import { FormMode } from 'src/app/entities';
import { CollectionsService } from 'src/app/services/collections.service';

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
    loaded: boolean = false;
    
    constructor(               
        private dialogRef: MatDialogRef<DocumentsFormComponent>,
        private translate: TranslateService,
        private utilitiesService: UtilitiesService,
        private dialogService: PepDialogService,
        private documentsService: DocumentsService,
        @Inject(MAT_DIALOG_DATA) public incoming: DocumentsFormData) { }

    ngOnInit(): void {
        this.item = this.getItem(this.incoming.Item);
        console.log('after string conversion:', this.item);
    }

    async saveDocument() {
        try {
            await this.fixDataTypes();
            if(this.incoming.Mode === 'Add') {
                try {
                    await this.documentsService.createDocument(this.incoming.CollectionName, this.item);
                    this.dialogRef.close(true);
                }
                catch (err) {
                    let contentKey = '';
                    if (err.indexOf(existingInRecycleBinErrorMessage) >= 0) {
                        contentKey = 'Documents_ExistingRecycleBinError_Content'
                    }
                    else if(err.indexOf(existingErrorMessage) >= 0){
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
            const errors = this.utilitiesService.getErrors(error);
            const dataMsg = new PepDialogData({
                title: this.translate.instant('Documents_UpdateFailed_Title'),
                actionsType: 'close',
                content: errors.length > 1 ? this.translate.instant('Documents_UpdateFailed_Content', {error: errors.map(error=> `<li>${error}</li>`)}) : error
            });
            this.dialogService.openDefaultDialog(dataMsg);
        }
    }

    close() {
        this.dialogRef.close();
    }

    async fixDataTypes() {
        const collection = await this.utilitiesService.getCollectionByName(this.incoming.CollectionName);
        Object.keys(collection.Fields!).forEach(fieldName => {
            switch (collection.Fields[fieldName].Type) {
                case 'Array': {
                    if(collection.Fields[fieldName].OptionalValues && collection.Fields[fieldName].OptionalValues.length > 0) {
                        try {
                            if (this.item[fieldName] != "") {
                                this.item[fieldName] = this.item[fieldName].split(";");
                            }
                            else {
                                this.item[fieldName] = [];
                            }
                        }
                        catch (err) {
                            console.log(`could not convert value ${this.item[fieldName]}. error got: ${JSON.stringify(err)}`);
                        }
                    }
                    else {
                        try {
                            if(!this.item[fieldName] || this.item[fieldName] === '') {
                                this.item[fieldName] = []
                            }
                            else {
                                this.item[fieldName] = JSON.parse(this.item[fieldName]);
                            }
                        }
                        catch {
                        }
                    }
                    break;
                }
                case 'ContainedResource': {
                    try {
                        if(!this.item[fieldName] || this.item[fieldName] === '') {
                            this.item[fieldName] = {}
                        }
                        else {
                            this.item[fieldName] = JSON.parse(this.item[fieldName]);
                        }
                    }
                    catch {
                    }
                    break;
                }
                case 'Double': 
                case 'Integer': {
                    // only if the value is not undefined, then convert it to a number
                    if (this.item[fieldName]) {
                        this.item[fieldName] = Number(this.item[fieldName]);
                    }
                    break;
                }
                case 'Bool': {
                    if(this.item[fieldName] && this.item[fieldName].toString().toLocaleLowerCase() === 'true') {
                        this.item[fieldName] = true;
                    }
                    else {
                        this.item[fieldName] = false;
                    }
                    break;
                }
                case 'DateTime': {
                    const testDate = new Date(this.item[fieldName]);
                    // if the date is not valid, remove it from the object sent to server
                    if(!this.utilitiesService.isValidDate(testDate)) {
                        delete this.item[fieldName];
                    }
                    break;
                }
                default: {
                    //No conversion needed. do nothing
                }
            }
        })
    }

    onFormValidationChanged($event: any) {
        console.log(`form valid: ${$event}`);
        this.isValid = $event;
    }

    getItem(item: AddonData): AddonData {
        let ret: AddonData = {}
        Object.keys(item || {}).forEach(prop => {
            if (typeof(item[prop]) != 'boolean') {
                // if the value is null/undefined, don't copy it
                if(item[prop]) {
                    ret[prop] = item[prop].toString();
                }
            }
            else {
                ret[prop] = item[prop];
            }
        });
        return ret;
    }
}

export type DocumentsFormData = {
    Mode: FormMode,
    Item: any,
    DataView: FormDataView,
    CollectionName: string
}
