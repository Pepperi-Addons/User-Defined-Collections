import { CollectionField, AddonDataScheme } from '@pepperi-addons/papi-sdk'

export type FieldsFormDialogData = {
    Field: CollectionField;
    FieldName: string;
    Mode: FormMode;
    EmptyCollection: boolean;
    InUidFields: boolean;
    Resources: AddonDataScheme[];
}

export type FormMode = 'Add' | 'Edit';
export const EMPTY_OBJECT_NAME = 'NewCollection';

export interface SelectOption {
    key: string;
    value: string;
}

export type SelectOptions = Array<SelectOption>