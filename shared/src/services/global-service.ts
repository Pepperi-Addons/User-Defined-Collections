import { AddonData, Collection } from '@pepperi-addons/papi-sdk';
import { v4 as uuid } from 'uuid';

export class GlobalService {
    
    constructor() {}
    
    getItemKey(collectionScheme: Collection, documentObj: AddonData): string {
        let key = '';
        
        if ('Key' in documentObj && documentObj.Key != '') {
            key = documentObj.Key!;
        }
        else if(collectionScheme.DocumentKey?.Type == 'Key'){
            throw new Error('Key is mandatory when DocumentKey.Type == "Key"');
        }
        else if (collectionScheme.DocumentKey?.Type === 'AutoGenerate') {
            key = uuid();
        }
        else {
            let fieldsValues: string[] = [];
            const delimiter = collectionScheme.DocumentKey?.Delimiter || '_';
            collectionScheme.DocumentKey?.Fields?.forEach((field) => {
                fieldsValues.push(documentObj[field]);
            })
            key = fieldsValues.join(delimiter);
        }
        
        return key
    }

    isCollectionIndexed(collectionScheme: Collection) {
        const fieldNames = Object.keys(collectionScheme.Fields || {});
        let indexed = false;

        for (const fieldName of fieldNames) {
            indexed = collectionScheme.Fields![fieldName].Indexed || false;
            if (indexed) {
                break;
            }
        }

        return indexed;
    }
}

export default GlobalService;