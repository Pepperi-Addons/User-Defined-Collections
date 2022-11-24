import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'addon-additional-fields-form',
  templateUrl: './additional-fields-form.component.html',
  styleUrls: ['./additional-fields-form.component.scss']
})
export class AdditionalFieldsFormComponent implements OnInit {

  fieldName: string;
  isValid = false;

  constructor(
    private dialogRef: MatDialogRef<AdditionalFieldsFormComponent>,
    @Inject(MAT_DIALOG_DATA) public incoming: any
    ) { }

  ngOnInit(): void {
  }

  addField() {
    this.dialogRef.close(this.fieldName);
  }

  close() { 
      this.dialogRef.close();
  }

  fieldChanged(value) {
    this.isValid = value != '';
  }

}
