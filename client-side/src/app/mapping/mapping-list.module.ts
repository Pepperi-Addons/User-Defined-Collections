import { MappingsService } from '../services/mappings.service';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRouteSnapshot, RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { PepNgxLibModule, PepAddonService } from '@pepperi-addons/ngx-lib';
import { PepTopBarModule } from '@pepperi-addons/ngx-lib/top-bar';
import { PepSizeDetectorModule } from '@pepperi-addons/ngx-lib/size-detector';
import { PepPageLayoutModule } from '@pepperi-addons/ngx-lib/page-layout';
import { PepIconRegistry, pepIconSystemClose } from '@pepperi-addons/ngx-lib/icon';

import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';

import { PepGenericListModule } from '@pepperi-addons/ngx-composite-lib/generic-list';
import { PepButtonModule } from '@pepperi-addons/ngx-lib/button';
import { PepMenuModule } from '@pepperi-addons/ngx-lib/menu';
import { PepTextboxModule } from '@pepperi-addons/ngx-lib/textbox';
import { PepSelectModule } from '@pepperi-addons/ngx-lib/select';
import { PepTextareaModule } from '@pepperi-addons/ngx-lib/textarea';
import { PepDialogModule } from '@pepperi-addons/ngx-lib/dialog';

import { CollectionsService } from '../services/collections.service';
import { DocumentsService } from '../services/documents.service';
import { UtilitiesService } from '../services/utilities.service'

import { MappingListComponent } from './mapping-list.component';
import { MappingFormComponent } from './form/mapping-form.component';
import { PepGenericFormModule } from '@pepperi-addons/ngx-composite-lib/generic-form';

const pepIcons = [
    pepIconSystemClose,
];

export const routes: Routes = [
    {
        path: '',
        component: MappingListComponent
    }
];

@NgModule({
    declarations: [
        MappingListComponent,
        MappingFormComponent
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
        PepGenericFormModule,
        TranslateModule.forChild({
            loader: {
                provide: TranslateLoader,
                useFactory: PepAddonService.createMultiTranslateLoader,
                deps: [PepAddonService]
            }, isolate: false
        }),
        RouterModule.forChild(routes)
    ],
    exports:[MappingListComponent],
    providers: [
        TranslateStore,
        // When loading this module from route we need to add this here (because only this module is loading).
        CollectionsService,
        DocumentsService,
        UtilitiesService,
        MappingsService,
        TranslateService,
    ]
})
export class MappingsModule {
    constructor(
        translate: TranslateService,
        private pepIconRegistry: PepIconRegistry,
        private pepAddonService: PepAddonService
    ) {
        this.pepAddonService.setDefaultTranslateLang(translate);
        this.pepIconRegistry.registerIcons(pepIcons);
    }
}
