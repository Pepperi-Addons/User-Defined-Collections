import jwt from 'jwt-decode';
import { AddonData, Collection, PapiClient } from '@pepperi-addons/papi-sdk';
import { Injectable } from '@angular/core';

import { PepHttpService, PepSessionService } from '@pepperi-addons/ngx-lib';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
    upsertDocument(arg0: { Name: any; Hidden: boolean; }) {
        throw new Error("Method not implemented.");
    }
    getDocuments(collectionName: string, recycleBin: boolean, params: any) {
        throw new Error("Method not implemented.");
    }
    getCollectionData(collectionName: string): Collection {
        throw new Error("Method not implemented.");
    }
    
    accessToken = '';
    parsedToken: any
    papiBaseURL = ''
    addonUUID;

    get papiClient(): PapiClient {
        return new PapiClient({
            baseURL: this.papiBaseURL,
            token: this.session.getIdpToken(),
            addonUUID: this.addonUUID,
            suppressLogging:true
        })
    }

    constructor(
        public session:  PepSessionService,
        private pepHttp: PepHttpService
    ) {
        const accessToken = this.session.getIdpToken();
        this.parsedToken = jwt(accessToken);
        this.papiBaseURL = this.parsedToken["pepperi.baseurl"];
    }
        
}
