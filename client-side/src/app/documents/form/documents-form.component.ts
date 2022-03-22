import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { IPepGenericFormValueChange } from '@pepperi-addons/ngx-composite-lib/generic-form';
import { AddonData, FormDataView } from '@pepperi-addons/papi-sdk';
import { FormMode } from 'src/app/services/utilities.service';

@Component({
  selector: 'documents-form',
  templateUrl: './documents-form.component.html',
  styleUrls: ['./documents-form.component.scss']
})
export class DocumentsFormComponent implements OnInit {

    documentJSON:string = '{}';
    item: AddonData = {};
    error: string;
    
    constructor(               
        private dialogRef: MatDialogRef<DocumentsFormComponent>,
        private translate: TranslateService,
        @Inject(MAT_DIALOG_DATA) public incoming: DocumentsFormData) { }

    ngOnInit(): void {
        this.item = this.incoming.Item;
        console.log(this.incoming);
    }

    saveDocument() {
        try {
            this.convertMultiChoiceValues();
            this.convertNumbers();
            this.convertTextArea();
            this.dialogRef.close(this.item);
        }
        catch(err) {
            this.error = err.message;
        }
    }

    close() {
        this.dialogRef.close();
    }

    onValueChanged(event: IPepGenericFormValueChange) {
        console.log(event);
    }

    convertMultiChoiceValues() {

        this.incoming.DataView.Fields?.filter(field => field.Type === 'MultiTickBox').forEach(field => {
            this.item[field.FieldID] = this.item[field.FieldID].split(";");
        })
    }
    
    convertTextArea() {
        this.incoming.DataView.Fields?.filter(field => field.Type === 'TextArea').forEach(field => {
            try {
                this.item[field.FieldID] = JSON.parse(this.item[field.FieldID])
            }
            catch {
                throw new Error(`${field.FieldID} value is invalid`);
            }
        })
    }
    
    convertNumbers() {
        this.incoming.DataView.Fields?.filter(field => field.Type === 'NumberInteger' || field.Type === 'NumberReal').forEach(field => {
            this.item[field.FieldID] = Number(this.item[field.FieldID]);
        })
    }
}

export type DocumentsFormData = {
    Mode: FormMode,
    Item: any,
    DataView: FormDataView
}
