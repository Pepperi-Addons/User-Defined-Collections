import { NgModule } from '@angular/core';
import { Component } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CollectionListComponent } from './collection-list/index';

// Important for single spa
@Component({
    selector: 'app-empty-route',
    template: '<div></div>',
})
export class EmptyRouteComponent {}

const routes: Routes = [
    {
        path: `settings/:addon_uuid`,
        children: [
            {
                path: ':editor',
                component: CollectionListComponent
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



