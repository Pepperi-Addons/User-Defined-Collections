import config from '../addon.config.json';
import { Relation } from "@pepperi-addons/papi-sdk";

export const DimxRelations: Relation[] = [{
//     AddonUUID: config.AddonUUID,
//     Name: 'importCollection',
//     RelationName: 'DataImportResource',
//     Type: 'AddonAPI',
//     Description: 'relation for importing collections',
//     AddonRelativeURL: '/api/import_data_source'
// },
// {
    AddonUUID: config.AddonUUID,
    Name: '{collection_name}',
    RelationName: 'DataImportResource',
    Type: 'AddonAPI',
    Description: 'relation for importing documents to collection',
    AddonRelativeURL: '/api/import_data_source'
},
// {
//     AddonUUID: config.AddonUUID,
//     Name: 'exportCollection',
//     RelationName: 'DataExportResource',
//     Type: 'AddonAPI',
//     Description: 'relation for exporting collections',
//     AddonRelativeURL: '/api/export_data_source'
// },
{
    AddonUUID: config.AddonUUID,
    Name: '{collection_name}',
    RelationName: 'DataExportResource',
    Type: 'AddonAPI',
    Description: 'relation for exporting documents from collection',
    AddonRelativeURL: '/api/export_data_source'
}]