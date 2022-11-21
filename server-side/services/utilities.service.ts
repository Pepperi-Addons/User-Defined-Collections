import { v4 as uuid } from 'uuid';
import { Collection, PapiClient } from '@pepperi-addons/papi-sdk';
import { UdcMappingsScheme } from '../metadata';
import { Client } from '@pepperi-addons/debug-server';

export class UtilitiesService {
    
    papiClient: PapiClient

    constructor(private client: Client) {
        this.papiClient = new PapiClient({
            baseURL: client.BaseURL,
            token: client.OAuthAccessToken,
            addonUUID: client.AddonUUID,
            addonSecretKey: client.AddonSecretKey,
            actionUUID: client.ActionUUID
        });
    }

    async createRelations(relations) {
        await Promise.all(relations.map(async (singleRelation) => {
            await this.papiClient.addons.data.relations.upsert(singleRelation);
        }));
    }
        
    async getAtd(uuid: string) {
        return  await this.papiClient.types.find({
            where: `UUID='${uuid}'`
        }).then((types) => {
            return types[0]
        });
    }
}

