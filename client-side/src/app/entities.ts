import { FileStatus, FileStatusType } from '@pepperi-addons/ngx-composite-lib/file-status-panel';
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

export const booleanOptions: SelectOptions<string> = [{
    key: "true",
    value: "True"
}, 
{
    key: "false",
    value: "False"
}]

export const SyncTypes = ['Online', 'Offline', 'OnlyScheme'] as const;

export type SyncType = typeof SyncTypes[number];

 export type RebuildStatusType = FileStatusType | 'indexing'

export class RebuildStatus {
    key: number;
    name: string;
    status: RebuildStatusType = 'indexing';
    statusMessage?: string | undefined;
}