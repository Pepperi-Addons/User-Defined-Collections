import config from '../addon.config.json';
import { AddonDataScheme, Relation } from "@pepperi-addons/papi-sdk";
const relationName = 'CollectionList';
export const IMPORT_FUNCTION_NAME = 'import_data_source';
export const EXPORT_FUNCTION_NAME = 'export_data_source';

export const DimxRelations: Relation[] = [{
    AddonUUID: config.AddonUUID,
    Name: '{collection_name}',
    RelationName: 'DataImportResource',
    Type: 'AddonAPI',
    Description: 'relation for importing documents to collection',
    AddonRelativeURL: '/api/import_data_source?collection_name={collection_name}'
},
{
    AddonUUID: config.AddonUUID,
    Name: '{collection_name}',
    RelationName: 'DataExportResource',
    Type: 'AddonAPI',
    Description: 'relation for exporting documents from collection',
    AddonRelativeURL: '/api/export_data_source?collection_name={collection_name}'
}]

export const UsageMonitorRelations: Relation[] = [{
    AddonUUID: config.AddonUUID,
    Name: 'Collections',
    RelationName: 'UsageMonitor',
    Type: 'AddonAPI',
    AddonRelativeURL: '/api/collections_number',
    Description: 'relation for "Setup" tab in usage monitor to display number of collections',
},
{
    AddonUUID: config.AddonUUID,
    Name: 'TotalDocuments',
    RelationName: 'UsageMonitor',
    Type: 'AddonAPI',
    AddonRelativeURL: '/api/total_documents',
    Description: 'relation for "Data" tab in usage monitor to display total number of documents in all the collections',
},
{
    AddonUUID: config.AddonUUID,
    Name: 'DocumentsPerCollection',
    RelationName: 'UsageMonitor',
    Type: 'AddonAPI',
    AddonRelativeURL: '/api/documents_per_collection',
    Description: 'relation for "Collection" tab in usage monitor to display number of documents per collection',
}]

export const AtdRelations: Relation[] = [{
    RelationName: "ATDImport",
    AddonUUID: config.AddonUUID,
    Name:"UDCRelations",
    Description:"Relation from UDC addon to ATD Import addon",
    Type:"AddonAPI",
    AddonRelativeURL:"/api/import_udc_mappings"
},
{
    RelationName: "ATDExport",
    AddonUUID: config.AddonUUID,
    Name:"UDCRelations",
    Description:"Relation from UDC addon to ATD Export addon",
    Type:"AddonAPI",
    AddonRelativeURL:"/api/export_udc_mappings"
},
{   //meta data for realtion of type NgComponent
    RelationName: "TransactionTypeListTabs",
    AddonUUID: config.AddonUUID,
    Name:"UDCRelations",
    Description:"Collections",
    SubType: "NG11",
    ModuleName: "MappingsModule",
    ComponentName: "MappingListComponent",
    Type:"NgComponent",
    AddonRelativeURL:"mappings"
},
{   //meta data for realtion of type NgComponent
    RelationName: "ActivityTypeListTabs",
    AddonUUID: config.AddonUUID,
    Name:"UDCRelations",
    Description:"Collections",
    SubType: "NG11",
    ModuleName: "MappingsModule",
    ComponentName: "MappingListComponent",
    Type:"NgComponent",
    AddonRelativeURL:"mappings"
}]

export const SettingsRelation: Relation[] = [{
    RelationName: "SettingsBlock",
    GroupName: 'Configuration',
    SlugName: 'udc',
    Name: relationName,
    Description: 'User Defined Collections',
    Type: "NgComponent",
    SubType: "NG14",
    AddonUUID: config.AddonUUID,
    AddonRelativeURL: 'collections',
    ComponentName: `${relationName}Component`,
    ModuleName: `${relationName}Module`,
    ElementsModule: 'WebComponents',
    ElementName: `collections-element-${config.AddonUUID}`
}]

export const DataQueryRelation: Relation[] = [{
    AddonUUID: config.AddonUUID,
    Name: '{collection_name}',
    RelationName: 'DataQueries',
    Type: 'AddonAPI',
    AddonRelativeURL: '',
    SchemaRelativeURL: '/api/collection_fields?collection_name={collection_name}',
    Description: 'relation for Data queries addon',
}]

export const UdcMappingsScheme: AddonDataScheme = {
    Name: 'UdcMappings',
    Type: 'meta_data',
}