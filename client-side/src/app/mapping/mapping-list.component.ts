import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { IPepGenericListActions, IPepGenericListDataSource, PepGenericListService } from '@pepperi-addons/ngx-composite-lib/generic-list';
import { PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { PepSelectionData } from '@pepperi-addons/ngx-lib/list';
import { BaseFormDataViewField, FormDataView, Type } from '@pepperi-addons/papi-sdk';

import { FormMode, UtilitiesService } from '../services/utilities.service';
import { MappingFormItem, MappingsService } from '../services/mappings.service';
import { CollectionsService } from '../services/collections.service';
import { MappingFormComponent, MappingFormData } from './form/mapping-form.component';
import { MappingFieldTypes, UdcMapping } from '../../../../server-side/entities';

@Component({
  selector: 'app-mapping-list',
  templateUrl: './mapping-list.component.html',
  styleUrls: ['./mapping-list.component.scss']
})
export class MappingListComponent implements OnInit {
    @Input() hostObject: any;
    
    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
    

    dataSource:IPepGenericListDataSource;

    mappings: UdcMapping[];
    atd:Type;

    actions:IPepGenericListActions = {
        get: async (data: PepSelectionData) => {
            const actions = []
            if (data && data.rows.length == 1) {
                actions.push({
                    title: this.translate.instant('Edit'),
                    handler: async (objs) => {
                        this.openForm('Edit', objs.rows[0]);
                    }
                })
                actions.push({
                    title: this.translate.instant('Delete'),
                    handler: async (objs) => {
                        this.showDeleteDialog(objs.rows[0]);
                    }
                })
            }
            return actions;
        }
    }

    constructor (private translate: TranslateService,
        private mappingsService: MappingsService,
        private collectionsService: CollectionsService,
        private utilitiesService: UtilitiesService,
        private dialogService: PepDialogService) { }

    ngOnInit(): void {
        this.utilitiesService.addonUUID = this.hostObject.options.addonId;
        this.mappingsService.getAtd(this.hostObject.objectList[0]).then(value => {
            this.atd = value;
            this.dataSource = this.getDataSource();
        });
    }

    getDataSource(): IPepGenericListDataSource {
        return {
            init: async(params:any) => {
                this.mappings = await this.mappingsService.getMappings(this.atd.InternalID);
                return Promise.resolve({
                    dataView: {
                        Context: {
                            Name: '',
                            Profile: { InternalID: 0 },
                            ScreenSize: 'Landscape'
                        },
                        Type: 'Grid',
                        Title: '',
                        Fields: [
                            {
                                FieldID: 'Title',
                                Type: 'TextBox',
                                Title: this.translate.instant('Field'),
                                Mandatory: false,
                                ReadOnly: true
                            },
                            {
                                FieldID: 'ApiName',
                                Type: 'TextBox',
                                Title: this.translate.instant('Api Name'),
                                Mandatory: false,
                                ReadOnly: true
                            },
                            {
                                FieldID: 'Resource',
                                Type: 'TextBox',
                                Title: this.translate.instant('Resource'),
                                Mandatory: false,
                                ReadOnly: true
                            },
                            {
                                FieldID: 'valueSource',
                                Type: 'TextBox',
                                Title: this.translate.instant('Get value from'),
                                Mandatory: false,
                                ReadOnly: true
                            },
                            {
                                FieldID: 'Temporary',
                                Type: 'Boolean',
                                Title: this.translate.instant('Temporary'),
                                Mandatory: false,
                                ReadOnly: true
                            },
                        ],
                        Columns: [
                            {
                                Width: 20
                            },
                            {
                                Width: 20
                            },
                            {
                                Width: 20
                            },
                            {
                                Width: 20
                            },
                            {
                                Width: 20
                            }
                        ],
          
                        FrozenColumnsCount: 0,
                        MinimumColumnWidth: 0
                    },
                    totalCount: this.mappings.length,
                    items: this.mappings.map(mapping => {
                        mapping['valueSource'] = `${mapping.DataSource.Collection}.${mapping.DataSource.Field}`;
                        mapping['Title'] = mapping.Field.Title;
                        mapping['ApiName'] = mapping.Field.ApiName;
                        mapping['Temporary'] = mapping.Field.Temporary;
                        return mapping;
                    })
                });
            },
            inputs: () => {
                return Promise.resolve({
                    pager: {
                        type: 'pages'
                    },
                    selectionType: 'single',
                    noDataFoundMsg: this.translate.instant('Mappings_List_NoDataFound')
                });
            },
        } as IPepGenericListDataSource
    }

    async openForm(mode: FormMode, selectedKey: string = undefined) {
        const item = this.mappings.find(mapping=> mapping.Key === selectedKey);
        const formItem: MappingFormItem = {
            Key: selectedKey,
            Atd: this.atd,
            Collection: item?.DataSource.Collection || '',
            CollectionField: item?.DataSource.Field || '',
            Filter: item?.Filter || {},
            Resource: item?.Resource || this.atd.Type === 2 ? 'transactions': 'activities',
            Temporary: item?.Field.Temporary || false,
            ApiName: item?.Field.ApiName || '',
            Type: item?.Field.Type || 'TextBox',
            Title: item?.Field.Title || '',
            Description: item?.Field.Description || ''
        }
        const formData: MappingFormData = {
            Item: formItem,
            DataView: undefined,//await this.mappingsService.createDataView(mode, formItem),
            Mode: mode
        }
        const config = this.dialogService.getDialogConfig({ }, 'large');
        config.data = new PepDialogData({
            content: MappingFormComponent
        })
        this.dialogService.openDialog(MappingFormComponent, formData, config).afterClosed().subscribe((value) => {
            if (value) {
                this.dataSource = this.getDataSource();
            }
        });
    }

    showDeleteDialog(selectedKey: string) {
        const dataMsg = new PepDialogData({
            title: this.translate.instant('Mapping_DeleteDialog_Title'),
            actionsType: 'cancel-delete',
            content: this.translate.instant('Mapping_DeleteDialog_Content')
        });
        this.dialogService.openDefaultDialog(dataMsg).afterClosed()
            .subscribe(async (isDeletePressed) => {
                if (isDeletePressed) {
                    try {
                        const item = this.mappings.find(mapping=> mapping.Key === selectedKey);
                        await this.mappingsService.deleteMapping(item);
                        this.dataSource = this.getDataSource();
                    }
                    catch (err) {
                        const errorMsg = new PepDialogData({
                            title: this.translate.instant('Mapping_DeleteDialog_Title'),
                            actionsType: 'close',
                            content: this.translate.instant('Mapping_DeleteDialog_Error')
                        });             
                        this.dialogService.openDefaultDialog(errorMsg);
                    }
                }
        });
    }

    

}
