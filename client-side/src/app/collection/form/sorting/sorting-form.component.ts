import { TranslateService } from '@ngx-translate/core';
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';


@Component({
    selector: 'sorting-form',
    templateUrl: './sorting-form.component.html',
    styleUrls: ['./sorting-form.component.scss']
  })
  export class SortingFormComponent implements OnInit {

    fieldSort: number;

    constructor(               
        private dialogRef: MatDialogRef<SortingFormComponent>,
        private translate: TranslateService,
        @Inject(MAT_DIALOG_DATA) public incoming: SortingFormData) {          
    }

    ngOnInit() {
    }

    saveSorting() {
        this.dialogRef.close(this.fieldSort);
    }

    close() {
        this.dialogRef.close();
    }

  }  

  export type SortingFormData = {
      FieldName: string,
      MaxValue: number,
  }