import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule, TranslateLoader, TranslateStore } from '@ngx-translate/core';

import { PepAddonService } from '@pepperi-addons/ngx-lib';

import { AppRoutingModule } from './app.routes';
import { AppComponent } from './app.component';

import { CollectionListModule } from './collection';
import { DocumentsListModule } from './documents';
import { MappingsModule } from './mapping';

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
                useFactory: PepAddonService.createMultiTranslateLoader,
                deps: [PepAddonService]
            }
        })
    ],
    providers: [
        TranslateStore,
        // When loading this module from route we need to add this here (because only this module is loading).
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}