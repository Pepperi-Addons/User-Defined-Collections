import { DataViewFieldType, AddonData } from '@pepperi-addons/papi-sdk/';

export const MappingFieldTypes: DataViewFieldType[] = [ 
    'TextBox',
    'TextArea',
    'Date',
    'DateAndTime',
    'NumberInteger',
    'NumberReal',
    'Currency',
    'Boolean',
    'ComboBox',
    'RichTextHTML',
];

export type MappingFieldType = typeof MappingFieldTypes[number]

export type MappingResource = 'transactions' | 'transaction_lines' | 'activities'

export interface MappingField {
    Title: string;
    ApiName: string;
    Description: string;
    Type: MappingFieldType;
    Temporary: boolean;
}

export interface MappingDataSource {
    Collection: string;
    Field: string;
}
export interface UdcMapping extends AddonData {
    AtdID: number;
    Field: MappingField;
    DataSource: MappingDataSource;
    Resource: MappingResource;
    Filter?: {
        [Key: string]: string
    }
}