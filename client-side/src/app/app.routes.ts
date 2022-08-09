import { NgModule } from '@angular/core';
import { Component } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CollectionListComponent, CollectionFormComponent } from './collection';
import { DocumentsListComponent } from './documents';

// Important for single spa
@Component({
    selector: 'app-empty-route',
    template: '<div></div>',
})
export class EmptyRouteComponent {}

const routes: Routes = [
    {
        path: `:settingsSectionName/:addonUUID/:slugName`,
        children: [
            {
                path: '',
                component: CollectionListComponent
                // TODO: solve routing
                // path: '**',
                // loadChildren: () => import('./addon/addon.module').then(m => m.AddonModule)
            },
            {
                path: ':collection_name',
                component: CollectionFormComponent
                // TODO: solve routing
                // path: '**',
                // loadChildren: () => import('./addon/addon.module').then(m => m.AddonModule)
            },
            {
                path: ':collection_name/documents',
                component: DocumentsListComponent
                // TODO: solve routing
                // path: '**',
                // loadChildren: () => import('./addon/addon.module').then(m => m.AddonModule)
            }
        ]
    },
    {
        path: '**',
        component: EmptyRouteComponent
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })],
    exports: [RouterModule]
})
export class AppRoutingModule { }



