import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Collection } from '@pepperi-addons/papi-sdk';
import { SelectOptions } from 'src/app/entities';
import { CollectionsService } from 'src/app/services/collections.service';
import { UtilitiesService } from 'src/app/services/utilities.service';
import { existingErrorMessage, existingInRecycleBinErrorMessage, collectionNameRegex } from 'udc-shared';

@Component({
  selector: 'addon-add-collection-dialog',
  templateUrl: './add-collection-dialog.component.html',
  styleUrls: ['./add-collection-dialog.component.scss']
})
export class AddCollectionDialogComponent implements OnInit {
    name: string = '';
    description: string = '';
    extention: string = '';
    isValid: boolean = false;
    extentionOptions: SelectOptions<string> = []
    collectionNameRegex = collectionNameRegex;

    constructor(private service: CollectionsService,
                private dialogRef: MatDialogRef<AddCollectionDialogComponent>,
                private translate: TranslateService,
                private utilities: UtilitiesService,
                @Inject(MAT_DIALOG_DATA) public incoming: any ) { 
                    this.extentionOptions = incoming.AsbtractSchemes.map(collection => {
                        return {
                            key: collection.Name,
                            value: collection.Name
                        }
                    })
                }

    ngOnInit(): void {
    }

    close() {
        this.dialogRef.close();
    }

    nameChanged($event) {
        this.isValid = $event != '';
    }

    saveCollection() {
        const addonUUID = this.incoming.AsbtractSchemes.find(collection => collection.Name === this.extention).AddonUUID;
        const collection: Collection = {
            Name: this.name,
            Description: this.description,
            Extends: {
                AddonUUID: addonUUID,
                Name: this.extention
            }
        }
        this.service.createCollection(collection).then((collection) => {
            this.dialogRef.close(collection)
        }).catch(err => {
            let content = '';
            let title = this.translate.instant('Collection_UpdateFailed_Title');
            if (err.message.indexOf(existingInRecycleBinErrorMessage) >= 0) {
                content = this.translate.instant('Collection_ExistingRecycleBinError_Content', {collectionName: collection.Name});
                this.utilities.showMessageDialog(title, content);
              }
              else if(err.message.indexOf(existingErrorMessage) >= 0){
                content = this.translate.instant('Collection_ExistingError_Content', {collectionName: collection.Name});
                this.utilities.showMessageDialog(title, content);
            }
            else {
                this.service.showUpsertFailureMessage(err);
            }
        });
    }

}
