
import { AddonData, ApiFieldObject, DataViewFieldType, DataViewFieldTypes } from '@pepperi-addons/papi-sdk';
import { KeyValuePair } from '@pepperi-addons/ngx-lib';
import { Injectable } from '@angular/core';
import { UtilitiesService } from './utilities.service';
import { Type } from '@pepperi-addons/papi-sdk';
import { MappingFieldType, MappingResource, UdcMapping } from '../../../../server-side/entities';

@Injectable({ providedIn: 'root' })
export class MappingsService {
    constructor(
        private utilitiesService: UtilitiesService
    ) {}

    async getMappings(): Promise<UdcMapping[]> {
        return await this.utilitiesService.papiClient.addons.api.uuid(this.utilitiesService.addonUUID).file('api').func('mappings').get();
    }

    async upsertMapping(mappingObj: MappingFormItem): Promise<UdcMapping> {
        const obj = this.convertToApiObject(mappingObj)
        return await this.utilitiesService.papiClient.addons.api.uuid(this.utilitiesService.addonUUID).file('api').func('mappings').post(undefined, obj);
    }

    async deleteMapping(mappingKey: string): Promise<UdcMapping> {
        const obj = {
            Key: mappingKey,
            Hidden: true
        }
        return await this.utilitiesService.papiClient.addons.api.uuid(this.utilitiesService.addonUUID).file('api').func('mappings').post(undefined, obj);
    }
    
    async getAtd(uuid: string): Promise<Type>{
        return await this.utilitiesService.papiClient.addons.api.uuid(this.utilitiesService.addonUUID).file('api').func('get_atd').get({'uuid': uuid});
    }

    convertToApiObject(objToConvert: MappingFormItem): UdcMapping {
        return {
            Key: objToConvert.Key,
            AtdID: objToConvert.AtdID,
            DataSource: {
                Collection: objToConvert.Collection,
                Field: objToConvert.CollectionField
            },
            Field: {
                ApiName: objToConvert.ApiName,
                Title: objToConvert.Title,
                Temporary: objToConvert.Temporary,
                Description: objToConvert.Description,
                Type: objToConvert.Type
            },
            Resource: objToConvert.Resource
        }
    }
}

export interface MappingFormItem extends AddonData {
    AtdID: number;
    Title: string;
    ApiName: string;
    Description: string;
    Type: MappingFieldType;
    Temporary: boolean;
    Collection: string;
    CollectionField: string;
    Resource?: MappingResource;
    Filter: KeyValuePair<string>[];
}

