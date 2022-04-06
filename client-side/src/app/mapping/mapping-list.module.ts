import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRouteSnapshot, RouterModule, Routes } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';

import { PepNgxLibModule, PepAddonService, PepFileService } from '@pepperi-addons/ngx-lib';
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
import { PepSeparatorModule } from '@pepperi-addons/ngx-lib/separator';

import { PepGenericListModule } from '@pepperi-addons/ngx-composite-lib/generic-list';
import { PepGenericFormModule } from '@pepperi-addons/ngx-composite-lib/generic-form';

import { MappingListComponent } from './mapping-list.component';
import { MappingFormComponent } from './form/mapping-form.component';
import { CollectionsService } from '../services/collections.service';
import { DocumentsService } from '../services/documents.service';
import { UtilitiesService } from '../services/utilities.service'
import { MappingsService } from '../services/mappings.service';

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
        PepSeparatorModule,
        // TranslateModule.forChild({
        //     loader: {
        //         provide: TranslateLoader,
        //         useFactory: PepAddonService.createMultiTranslateLoader,
        //         deps: [PepAddonService]
        //     }, isolate: false
        // }),
        // TranslateModule.forChild({
        //     loader: {
        //         provide: TranslateLoader,
        //         useFactory: (http: HttpClient, fileService: PepFileService, addonService: PepAddonService) => 
        //             PepAddonService.createDefaultMultiTranslateLoader(http, fileService, addonService, "122c0e9d-c240-4865-b446-f37ece866c22"),
        //         deps: [HttpClient, PepFileService, PepAddonService],
        //     }, isolate: false
        // }),
        TranslateModule.forChild({
            loader: {
                provide: TranslateLoader,
                useFactory: (addonService: PepAddonService) =>
                    PepAddonService.createMultiTranslateLoader(addonService, ['ngx-lib', 'ngx-composite-lib'], "122c0e9d-c240-4865-b446-f37ece866c22"),
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
