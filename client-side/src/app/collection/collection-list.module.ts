import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRouteSnapshot, RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';

import { MatTabsModule } from '@angular/material/tabs';

import { PepNgxLibModule, PepAddonService } from '@pepperi-addons/ngx-lib';
import { PepTopBarModule } from '@pepperi-addons/ngx-lib/top-bar';
import { PepSizeDetectorModule } from '@pepperi-addons/ngx-lib/size-detector';
import { PepPageLayoutModule } from '@pepperi-addons/ngx-lib/page-layout';
import { PepIconRegistry, pepIconSystemClose } from '@pepperi-addons/ngx-lib/icon';
import { PepButtonModule } from '@pepperi-addons/ngx-lib/button';
import { PepMenuModule } from '@pepperi-addons/ngx-lib/menu';
import { PepTextboxModule } from '@pepperi-addons/ngx-lib/textbox';
import { PepSelectModule } from '@pepperi-addons/ngx-lib/select';
import { PepTextareaModule } from '@pepperi-addons/ngx-lib/textarea';
import { PepDialogModule } from '@pepperi-addons/ngx-lib/dialog';
import { PepSnackBarModule } from '@pepperi-addons/ngx-lib/snack-bar';
import { PepRemoteLoaderModule } from '@pepperi-addons/ngx-lib/remote-loader'

import { PepGenericListModule } from '@pepperi-addons/ngx-composite-lib/generic-list';

import { CollectionsService } from '../services/collections.service';
import { CollectionListComponent } from './index';
import { SortingFormComponent } from './form/sorting/sorting-form.component';
import { FieldsFormComponent } from './form/fields/fields-form.component';
import { AddCollectionDialogComponent } from './form/add-collection-dialog/add-collection-dialog.component';
import { AdditionalFieldsFormComponent } from './form/fields/additional-fields-form/additional-fields-form.component';
import { CollectionEventsComponent } from './form/tabs/events/collection-events.component';
import { CollectionFormComponent } from './form/collection-form.component';
import { UtilitiesService } from './../services/utilities.service'
import { PepCheckboxModule } from '@pepperi-addons/ngx-lib/checkbox';
import { GeneralTabComponent } from './form/tabs/general/general-tab.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SnackbarService } from '../services/snackbar.service';


const pepIcons = [
    pepIconSystemClose,
];

export const routes: Routes = [
    {
        path: '',
        component: CollectionListComponent
    }
];

@NgModule({
    declarations: [
        CollectionListComponent,
        CollectionFormComponent,
        FieldsFormComponent,
        SortingFormComponent,
        AdditionalFieldsFormComponent,
        AddCollectionDialogComponent,
        CollectionEventsComponent,
        GeneralTabComponent
    ],
    imports: [
        CommonModule,
        HttpClientModule,
        PepNgxLibModule,
        PepSizeDetectorModule,
        PepTextboxModule,
        PepTopBarModule,
        PepPageLayoutModule,
        PepGenericListModule,
        PepButtonModule,
        PepMenuModule,
        PepSelectModule,
        PepTextareaModule,
        PepDialogModule,
        PepCheckboxModule,
        PepSnackBarModule,
        PepRemoteLoaderModule,
        MatTabsModule,
        TranslateModule.forChild(),
        RouterModule.forChild(routes)
    ],
    exports:[CollectionListComponent],
    providers: [
        TranslateStore,
        // When loading this module from route we need to add this here (because only this module is loading).
        CollectionsService,
        UtilitiesService,
        SnackbarService
    ]
})
export class CollectionListModule {
    constructor(
        translate: TranslateService,
        private pepIconRegistry: PepIconRegistry,
        private pepAddonService: PepAddonService
    ) {
        this.pepAddonService.setDefaultTranslateLang(translate);
        this.pepIconRegistry.registerIcons(pepIcons);
    }
}
