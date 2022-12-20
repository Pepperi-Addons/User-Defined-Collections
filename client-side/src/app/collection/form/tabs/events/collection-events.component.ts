import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { config } from 'src/app/addon.config';

import { UserEvent } from 'udc-shared';

@Component({
  selector: 'collection-events',
  templateUrl: './collection-events.component.html',
  styleUrls: ['./collection-events.component.scss']
})
export class CollectionEventsComponent implements OnInit {

  @Input() collectionName: string = '';
  @Input() collectionEvents: UserEvent[];

  eventsBlockDev: boolean = false;
  eventsBlockPath: string = '';
  loaded: boolean = false;
  hostObject: any = {};

  constructor(private activateRoute: ActivatedRoute,
    private router: Router,
    ) {
        this.eventsBlockDev = this.activateRoute.snapshot.queryParams.events_dev === "true" || false;
        if(this.eventsBlockDev) {
            this.eventsBlockPath = 'http://localhost:4600/file_cbbc42ca-0f20-4ac8-b4c6-8f87ba7c16ad.js';
        }
        this.loaded = true;
      }

  ngOnInit(): void {
    this.hostObject = {
      AddonUUID: config.AddonUUID,
      Name: this.collectionName,
      PossibleEvents: this.collectionEvents
    }
  }

}
