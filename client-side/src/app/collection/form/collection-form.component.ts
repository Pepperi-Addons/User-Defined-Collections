import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabChangeEvent } from "@angular/material/tabs";

import { Collection } from '@pepperi-addons/papi-sdk';

import { UserEvent } from 'udc-shared'

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

    constructor(private activateRoute: ActivatedRoute,
                private router: Router,
                private collectionsService: CollectionsService,
                private translate: TranslateService,
                private dialogService: PepDialogService,
                private utilitiesService: UtilitiesService) { }

    ngOnInit(): void {
        this.collectionName = this.activateRoute.snapshot.params.collection_name;
        
        this.utilitiesService.getCollectionByName(this.collectionName).then(async (value) => {
            this.collectionEvents = await this.collectionsService.getEvents(this.collectionName);
            this.hasTabs = this.collectionEvents.length > 0;
            this.collection = value;
            this.collectionLoaded = true;
        });
    }

    goBack() {
        this.router.navigate(['..'], {
            relativeTo: this.activateRoute,
            queryParamsHandling: 'preserve'
        })
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
            content: this.translate.instant('Collection_UpdateSuccess_Content')
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
