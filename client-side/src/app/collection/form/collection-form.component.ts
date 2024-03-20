import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabChangeEvent } from "@angular/material/tabs";

import { AddonData, Collection, SearchData } from '@pepperi-addons/papi-sdk';

import { UserEvent, DataForCollectionForm } from 'udc-shared'

import { UtilitiesService } from '../../services/utilities.service';
import { CollectionsService } from '../../services/collections.service';
import { PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'collection-form',
    templateUrl: './collection-form.component.html',
    styleUrls: ['./collection-form.component.scss']
})
export class CollectionFormComponent implements OnInit {

    collection: Collection;
    collectionName: string;
    currentTabIndex: number = 0;
    collectionLoaded: boolean = false;
    collectionEvents: UserEvent[] = [];
    hasTabs: boolean = true;
    documentKeyValid: boolean = false;
    dataForCollectionForm: DataForCollectionForm;
    fieldIndexChange: boolean = false;

    constructor(private activateRoute: ActivatedRoute,
        private router: Router,
        private collectionsService: CollectionsService,
        private translate: TranslateService,
        private dialogService: PepDialogService,
        private utilitiesService: UtilitiesService) { }

    ngOnInit(): void {
        this.collectionName = this.activateRoute.snapshot.params.collection_name;

        this.utilitiesService.getDataForCollectionForm(this.collectionName).then(async (value) => {
            this.dataForCollectionForm = value;
            this.collection = value.Collection;
            this.collectionEvents = value.Events;
            
            this.hasTabs = value.Events.length > 0;
            this.collectionLoaded = true;
        });
    }

    goBack() {
            this.router.navigate(['..'], {
                relativeTo: this.activateRoute,
                queryParamsHandling: 'preserve'
            })
        }

    fieldIndexChanged(event) {
        this.fieldIndexChange = event;
    }

    async saveClicked() {
        try {
            // we cannot change the collection name, so we need first to delete the "old" one
            if (this.collection.Name != this.collectionName) {
                await this.collectionsService.upsertCollection({
                    Name: this.collectionName,
                    Hidden: true
                });
            }
            await this.collectionsService.upsertCollection(this.collection);
            this.showSuccessMessage();
        }
        catch (error) {
            this.collectionsService.showUpsertFailureMessage(error, this.collection.Name);
        }
    }

    saveCollection(collection) {
        this.collection = collection;
        this.saveClicked();
    }

    showSuccessMessage() {
        const dataMsg = new PepDialogData({
            title: this.translate.instant('Collection_UpdateSuccess_Title'),
            actionsType: 'close',
            content: this.translate.instant(this.fieldIndexChange ? 'Collection_UpdateSuccess_IndexChange_Content' : 'Collection_UpdateSuccess_Content')
        });
        this.dialogService.openDefaultDialog(dataMsg).afterClosed().subscribe(() => {
            this.goBack();
        });
    }

    onTabChanged(tabChangeEvent: MatTabChangeEvent): void {
        this.currentTabIndex = tabChangeEvent.index;
    }

    documentKeyValidationChanged(event) {
        this.documentKeyValid = event;
    }
}
