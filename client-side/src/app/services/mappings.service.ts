import { AddonData } from '@pepperi-addons/papi-sdk';
import { KeyValuePair } from '@pepperi-addons/ngx-lib';
import { Injectable } from '@angular/core';
import { UtilitiesService } from './utilities.service';
import { Type } from '@pepperi-addons/papi-sdk';

@Injectable({ providedIn: 'root' })
export class MappingsService {
    constructor(
        private utilitiesService: UtilitiesService
    ) {}

    async getMappings(): Promise<UdcMapping[]> {
        return await this.utilitiesService.papiClient.addons.api.uuid(this.utilitiesService.addonUUID).file('api').func('mappings').get();
    }

    async upsertMapping(mappingObj: UdcMapping): Promise<UdcMapping> {
        return await this.utilitiesService.papiClient.addons.api.uuid(this.utilitiesService.addonUUID).file('api').func('mappings').post(undefined, mappingObj);
    }
    
    async removeTSAField(apiName: string, resource: MappingResource, atdID: number) {
        const body = {
            FieldID: apiName,
            Resource: resource,
            AtdID: atdID
        }
        return await this.utilitiesService.papiClient.addons.api.uuid(this.utilitiesService.addonUUID).file('api').func('field').post(undefined, body);
    }

    async getAtd(uuid: string): Promise<Type>{
        return await this.utilitiesService.papiClient.addons.api.uuid(this.utilitiesService.addonUUID).file('api').func('get_atd').get({'uuid': uuid});
    }
}

export type MappingResource = 'transactions' | 'transaction_lines'

export interface MappingDataSource {
    Collection: string;
    Field: string;
}

export interface UdcMapping extends AddonData {
    AtdID: number;
    Field: string;
    ApiName: string;
    Resource?: MappingResource;
    DataSource: MappingDataSource;
    Temporary: boolean;
    Filter: KeyValuePair<string>[];
}