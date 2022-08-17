import { DoBootstrap, Injector, NgModule, Type } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule, TranslateLoader, TranslateStore, TranslateService } from '@ngx-translate/core';

import { PepAddonService } from '@pepperi-addons/ngx-lib';

import { AppRoutingModule } from './app.routes';
import { AppComponent } from './app.component';

import { CollectionListComponent, CollectionListModule } from './collection';
import { DocumentsListModule } from './documents';
import { MappingsModule } from './mapping';
import { config } from './addon.config';
import { createCustomElement } from '@angular/elements';
import { SettingsComponent } from './settings/settings.component';

@NgModule({
    declarations: [
        AppComponent,
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        HttpClientModule,
        CollectionListModule,
        DocumentsListModule,
        MappingsModule,
        AppRoutingModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: (addonService: PepAddonService) => 
                    PepAddonService.createMultiTranslateLoader(config.AddonUUID, addonService, ['ngx-lib', 'ngx-composite-lib']),
                deps: [PepAddonService]
            }
        })
    ],
    providers: [
        TranslateStore,
        // When loading this module from route we need to add this here (because only this module is loading).
    ],
    bootstrap: [
        //AppComponent
    ]
})

export class AppModule implements DoBootstrap {
    constructor(
        private injector: Injector,
        translate: TranslateService,
        private pepAddonService: PepAddonService
    ) {
        this.pepAddonService.setDefaultTranslateLang(translate);
    }
    
    ngDoBootstrap() {
        this.pepAddonService.defineCustomElement(`collections-element-${config.AddonUUID}`, SettingsComponent, this.injector);
    }
}