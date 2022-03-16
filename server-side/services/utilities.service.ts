import { v4 as uuid } from 'uuid';
import { CollectionsService } from './collections.service';
import { Collection } from '@pepperi-addons/papi-sdk';

export class UtilitiesService {

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
}

