import {  } from './../server-side/build/shared/metadata.d';
import { UdcMapping } from './../server-side/entities';
import { UdcMappingsScheme } from './../server-side/metadata';
import '@pepperi-addons/cpi-node'
import config from '../addon.config.json';
import { Transaction } from '@pepperi-addons/cpi-node';
import { DataObject, TransactionLine } from '@pepperi-addons/cpi-node/build/cpi-side/app/entities';

export async function load(configuration: any) {
    console.log('udc cpi side works!');
    // Put your cpi side code here

    pepperi.events.intercept('PreLoadTransactionScope', {}, async (data, next, main) => {
        const atdID = data.DataObject?.typeDefinition?.internalID;
        const transaction = data.DataObject as Transaction;
        const mappings = (await pepperi.api.adal.getList({
            table: UdcMappingsScheme.Name,
            addon: config.AddonUUID
        })).objects.filter(mapping => {
            return mapping.AtdID === atdID;
        })
        mappings.forEach(item => {
            const mapping: UdcMapping = item as UdcMapping;
            if (mapping.Resource === 'transactions') {
                transaction.getFieldValue(mapping.Field.ApiName).then(fieldValue => {
                    if(!fieldValue || mapping.Field.Temporary) {
                        updateFieldValue(transaction, mapping)
                    }
                })
            }
            else if(mapping.Resource === 'transaction_lines') {
                transaction.lines.forEach(line => {
                    line.getFieldValue(mapping.Field.ApiName).then(fieldValue => {
                        if(!fieldValue || mapping.Field.Temporary) {
                            updateFieldValue(transaction, mapping)
                        }
                    })
                })
            }
        });

        await next(main);
    })
}

export async function updateFieldValue(dataObject: DataObject, mapping: UdcMapping) {
    try {
        const itemKey = await getItemKey(dataObject, mapping.DocumentKeyMapping, mapping.DataSource.Delimiter)
        if(itemKey) {
            const item = (await pepperi.api.adal.get({
                table: UdcMappingsScheme.Name,
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
        console.log(`${item.Value} on object ${dataObject.uuid} value is ${fieldValue}`)
        if (fieldValue) {
            fieldValues.push(fieldValue)
        }
    }))
    return fieldValues.join(keyDelimiter);
}