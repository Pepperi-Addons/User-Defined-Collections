import { DataViewFieldType, AddonData, ApiFieldObject, AddonDataScheme, Collection } from '@pepperi-addons/papi-sdk/';

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

export type CollectionFields = Collection['Fields'];

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
    Delimiter: string;
}
export interface UdcMapping extends AddonData {
    AtdID: number;
    Field: MappingField;
    DataSource: MappingDataSource;
    Resource: MappingResource;
    DocumentKeyMapping?: {
        Key: string,
        Value: string
    }[]
}

export interface FieldsResult {
    Transactions: ApiFieldObject[],
    Items: ApiFieldObject[],
    Accounts: ApiFieldObject[],
    Activities: ApiFieldObject[],
    TransactionLines: ApiFieldObject[]
}

export interface ReferenceValidationResult {
    Errors: string[];
    Document: AddonData;
}

export interface EventsRelation {
    Events: UserEvent[];
}

export interface UserEvent {
    Title: string;
    EventKey: string;
    EventFilter: {
        [key: string]: any;
    };
    Fields: [{
        ApiName: string;
        Title: string;
    }];
    EventData: AddonDataScheme['Fields'];
}

export interface ReferenceField {
    FieldID: string;
    ResourceName: string;
}

export type ReferenceSchemes = {
    [key: string]: Collection
};

export type UniqueField = {
    [key: string]: {
        Values: Set<string>
    }
}

export type ReferenceObjects = {
    [key: string]: {
        UniqueField: UniqueField,
        Items: AddonData[];   
    }
}

export type DIMXImportInitData = {
    ReferenceSchemes: ReferenceSchemes,
    CollectionScheme: Collection
}

export const existingErrorMessage = 'Object already Exist';
export const existingInRecycleBinErrorMessage = 'Object already Exist in recycle bin';
export const collectionNameRegex = "^([A-Z]){1}([\Sa-zA-Z0-9-_])*$"
export const fieldNameRegex = "^([a-z]){1}([\Sa-zA-Z0-9-_])*$"
