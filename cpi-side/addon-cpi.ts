import '@pepperi-addons/cpi-node'
import config from '../addon.config.json';
import { DocumentsService, UdcMapping } from 'udc-shared';
import { DataObject, Transaction } from '@pepperi-addons/cpi-node';
import { resourcesRouter } from './cpi-resources';
import { ApiService } from './services/api-service';
import { ResourcesService } from './services/resources-service';

export const router = Router();

router.use('/', resourcesRouter);

export async function load(configuration: any) {
    const mappings = (await pepperi.api.adal.getList({
        table: 'UdcMappings',
        addon: config.AddonUUID
    })).objects as UdcMapping[];

    pepperi.events.intercept('PreLoadTransactionScope', {}, async (data, next, main) => {
        const atdID = data.DataObject?.typeDefinition?.internalID;        
        const transaction = data.DataObject as Transaction;
        const atdMappings = mappings.filter(mapping => {
            return mapping.AtdID === atdID;
        })
        await Promise.all(atdMappings.map(async (item) => {
            await handleMapping(transaction, item)
        }));
        await next(main);
    })
}

export async function handleMapping(transaction: Transaction, mappingItem: UdcMapping) {
    if (mappingItem.Resource === 'transactions') {
        await updateObjectFields(transaction, mappingItem);            
    }
    else if(mappingItem.Resource === 'transaction_lines') {
        const lines = (await transaction.transactionScope?.getLines());
        console.log('transaction Scope lines:', lines);
        if (lines) {
            await Promise.all(lines.map(async (line) => {
                await updateObjectFields(line, mappingItem);
            }))
        }
    }
}

export async function updateObjectFields(obj: DataObject, mapping: UdcMapping) {
    const fieldValue = await obj.getFieldValue(mapping.Field.ApiName);
    if(!fieldValue  || fieldValue == '' || mapping.Field.Temporary) {
       await updateFieldValue(obj, mapping)
    }
}

export async function updateFieldValue(dataObject: DataObject, mapping: UdcMapping) {
    try {
        const itemKey = await getItemKey(dataObject, mapping.DocumentKeyMapping, mapping.DataSource.Delimiter)
        if(itemKey) {
            const item = (await pepperi.api.adal.get({
                table: mapping.DataSource.Collection,
                addon: config.AddonUUID,
                key: itemKey
            })).object
            if (item) {
                const value = item[mapping.DataSource.Field];
                console.log('field value is:', value);
                dataObject.setFieldValue(mapping.Field.ApiName, value);
            }
            else {
                console.log('could not get item with key:', itemKey)
            }
        }
        else {
            console.log('could not get item key. DocumentKeyMapping:', mapping.DocumentKeyMapping)
        }
    }
    catch (error) {
        console.log(`Could not update field ${mapping.DataSource.Field} on ${dataObject.uuid}. got error ${error}`)
    }
}

export async function getItemKey(dataObject: DataObject, keyMapping: any, keyDelimiter: string) {
    let fieldValues: string[] = []
    await Promise.all(keyMapping.map(async (item) => {
        const fieldValue = await dataObject.getFieldValue(item.Value);
        if (fieldValue) {
            fieldValues.push(fieldValue)
        }
    }))
    return fieldValues.join(keyDelimiter);
}
