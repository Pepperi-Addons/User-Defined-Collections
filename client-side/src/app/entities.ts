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

export class DeletionStatus {
    key: number;
    name: string;
    status = 'deleting' || 'done' || 'failed';
}

export class TruncateStatus {
    key: number;
    name: string;
    status = 'truncating' || 'done' || 'failed';
}

export const API_FILE_NAME = 'api';
export const ADDONS_BASE_URL = '/addons/api';
export const COLLECTIONS_FUNCTION_NAME = 'schemes';
export const DATA_FOR_COLLECTION_FORM_FUNCTION_NAME = 'get_data_for_collection_form';
export const DOCUMENTS_FUNCTION_NAME = 'documents';
export const SEARCH_DOCUMENTS_FUNCTION_NAME = 'search';
export const CREATE_FUNCTION_NAME = 'create';
export const DELETE_FUNCTION_NAME = 'hard_delete'  
export const MAPPINGS_FUNCTION_NAME = 'mappings';
export const FIELDS_FUNCTION_NAME = 'fields';
export const ATD_FUNCTION_NAME = 'get_atd';
export const REBUILD_FUNCTION_NAME = 'clean_rebuild';
export const EVENTS_FUNCTION_NAME = 'collection_events';
export const TRUNCATE_FUNCTION_NAME = 'truncate';
export const GL_PAGE_SIZE = 20;
export const API_PAGE_SIZE = 100;
