import { v4 as uuid } from 'uuid';
import { CollectionsService } from './collections.service';
import { Collection } from '@pepperi-addons/papi-sdk';

export class UtilitiesService {

    async getItemKey(service: CollectionsService, body: any, collectionName: string): Promise<string> {
        let key = '';

        if ('Key' in body) {
            key = body.Key;
        }
        else {
            const scheme: Collection = await service.getCollection(collectionName);
            if (scheme.DocumentKey?.Type === 'AutoGenerate') {
                key = uuid();
            }
            else if (scheme.DocumentKey?.Type === 'Composite') {
                let fieldsValues: string[] = [];
                const delimiter = scheme.DocumentKey.Delimiter || '_';
                scheme.DocumentKey.Fields?.forEach((field) => {
                    fieldsValues.push(body[field]);
                })
                key = fieldsValues.join(delimiter);
            }
        }

        return key
    }
}

