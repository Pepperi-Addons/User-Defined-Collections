import { v4 as uuid } from 'uuid';
import { CollectionsService } from './collections.service';
import { DocumentsService } from './documents.service';

export class UtilitiesService {

    async getItemKey(service: CollectionsService, body: any, collectionName: string): Promise<string> {
        let key = '';

        if ('Key' in body) {
            key = body.Key;
        }
        else {
            const scheme: any = await service.getCollection(collectionName);
            if (scheme.CompositeKeyType === 'Generate') {
                key = uuid();
            }
            else if (scheme.CompositeKeyType === 'Fields') {
                let fieldsValues: string[] = [];
                scheme.CompositeKeyFields.forEach((field) => {
                    fieldsValues.push(body[field]);
                })
                key = fieldsValues.join('_');
            }
        }

        return key
    }
}

