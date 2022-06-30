import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';

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

import { PepGenericListModule } from '@pepperi-addons/ngx-composite-lib/generic-list';
import { PepGenericFormModule } from '@pepperi-addons/ngx-composite-lib/generic-form';

import { DocumentsListComponent } from './documents-list.component';
import { DocumentsService } from '../services/documents.service';
import { DocumentsFormComponent } from './form/documents-form.component';
import { PepNgxCompositeLibModule } from '@pepperi-addons/ngx-composite-lib';

const pepIcons = [
    pepIconSystemClose,
];

export const routes: Routes = [
    {
        path: '',
        component: DocumentsListComponent
    }
];

@NgModule({
    declarations: [
        DocumentsListComponent,
        DocumentsFormComponent,
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
        PepNgxCompositeLibModule,
        TranslateModule.forChild({
            loader: {
                provide: TranslateLoader,
                useFactory: PepAddonService.createMultiTranslateLoader,
                deps: [PepAddonService]
            }, isolate: false
        }),
        RouterModule.forChild(routes)
    ],
    exports:[DocumentsListComponent],
    providers: [
        TranslateStore,
        // When loading this module from route we need to add this here (because only this module is loading).
        DocumentsService
    ]
})
export class DocumentsListModule {
    constructor(
        translate: TranslateService,
        private pepIconRegistry: PepIconRegistry,
        private pepAddonService: PepAddonService
    ) {
        this.pepAddonService.setDefaultTranslateLang(translate);
        this.pepIconRegistry.registerIcons(pepIcons);
    }
}
