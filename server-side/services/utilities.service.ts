import { v4 as uuid } from 'uuid';
import { Collection, PapiClient } from '@pepperi-addons/papi-sdk';
import { UsageMonitorRelations } from '../metadata';
import { Client } from '@pepperi-addons/debug-server';

export class UtilitiesService {

    papiClient: PapiClient

    constructor(private client: Client) {
        this.papiClient = new PapiClient({
            baseURL: client.BaseURL,
            token: client.OAuthAccessToken,
            addonUUID: client.AddonUUID,
            addonSecretKey: client.AddonSecretKey,
            actionUUID: client.AddonUUID
        });
    }

    getItemKey(scheme: Collection, body: any): string {
        let key = '';

        if ('Key' in body) {
            key = body.Key;
        }
        else if(scheme.DocumentKey?.Type == 'Key'){
            throw new Error('Key is mandatory when DocumentKey.Type == "Key"');
        }
        else if (scheme.DocumentKey?.Type === 'AutoGenerate') {
            key = uuid();
        }
        else {
            let fieldsValues: string[] = [];
            const delimiter = scheme.DocumentKey?.Delimiter || '_';
            scheme.DocumentKey?.Fields?.forEach((field) => {
                fieldsValues.push(body[field]);
            })
            key = fieldsValues.join(delimiter);
        }

        return key
    }

    async createUsageMonitorRelations() {
        await Promise.all(UsageMonitorRelations.map(async (singleRelation) => {
            await this.papiClient.addons.data.relations.upsert(singleRelation);
        }));
    }
}

