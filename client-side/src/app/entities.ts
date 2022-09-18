import { CollectionField, AddonDataScheme, SchemeFieldType } from '@pepperi-addons/papi-sdk'

export type FieldsFormDialogData = {
    Field: CollectionField;
    FieldName: string;
    Mode: FormMode;
    EmptyCollection: boolean;
    InUidFields: boolean;
    Resources: AddonDataScheme[];
    ContainedResources: AddonDataScheme[];
    AvailableTypes: SchemeFieldType[];
    AllowTypeChange: boolean;
}

export type FormMode = 'Add' | 'Edit';
export const EMPTY_OBJECT_NAME = 'NewCollection';

export interface SelectOption<T> {
    key: T;
    value: string;
}

export type SelectOptions<T> = Array<SelectOption<T>>

export const booleanOptions: SelectOptions<boolean> = [{
    key: true,
    value: "True"
}, 
{
    key: false,
    value: "False"
}]

export const SyncTypes = ['Online', 'Offline', 'OnlyScheme'] as const;

export type SyncType = typeof SyncTypes[number];