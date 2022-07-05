import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { IPepGenericListActions, IPepGenericListDataSource } from '@pepperi-addons/ngx-composite-lib/generic-list';
import { PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { PepSelectionData } from '@pepperi-addons/ngx-lib/list';
import { Type } from '@pepperi-addons/papi-sdk';

import { UtilitiesService } from '../services/utilities.service';
import { MappingFormItem, MappingsService } from '../services/mappings.service';
import { CollectionsService } from '../services/collections.service';
import { MappingFormComponent, MappingFormData } from './form/mapping-form.component';
import { MappingResource, UdcMapping } from 'udc-shared';
import { FormMode } from '../entities';

@Component({
  selector: 'app-mapping-list',
  templateUrl: './mapping-list.component.html',
  styleUrls: ['./mapping-list.component.scss']
})
export class MappingListComponent implements OnInit {
    @Input() hostObject: any;
    
    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
    

    activitiesDataSource:IPepGenericListDataSource;
    transactionsDataSource:IPepGenericListDataSource;
    linesDataSource:IPepGenericListDataSource;

    mappings: UdcMapping[];
    atd:Type;

    activitiesActions:IPepGenericListActions = this.getActions('activities');
    transactionsActions:IPepGenericListActions = this.getActions('transactions');
    linesActions:IPepGenericListActions = this.getActions('transaction_lines');

    constructor (private translate: TranslateService,
        private mappingsService: MappingsService,
        private utilitiesService: UtilitiesService,
        private dialogService: PepDialogService) { }

    ngOnInit(): void {
        this.utilitiesService.addonUUID = this.hostObject.options.addonId;
        this.mappingsService.getAtd(this.hostObject.objectList[0]).then(value => {
            this.atd = value;
            this.activitiesDataSource = this.getDataSource('activities');
            this.transactionsDataSource = this.getDataSource('transactions');
            this.linesDataSource = this.getDataSource('transaction_lines');
        });
    }

    getDataSource(resource: MappingResource): IPepGenericListDataSource {
        return {
            init: async(params:any) => {
                this.mappings = await this.mappingsService.getMappings(this.atd.InternalID);
                const items = this.mappings.filter(item=> item.Resource === resource);
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
                    totalCount: items.length,
                    items: items.map(mapping => {
                        mapping['valueSource'] = `${mapping.DataSource.Collection}.${mapping.DataSource.Field}`;
                        mapping['Title'] = mapping.Field.Title;
                        mapping['ApiName'] = mapping.Field.ApiName;
                        mapping['Temporary'] = mapping.Field.Temporary;
                        return mapping;
                    })
                });
            },
            inputs: {
                pager: {
                    type: 'pages'
                },
                selectionType: 'single',
                noDataFoundMsg: this.translate.instant('Mappings_List_NoDataFound')
            },
        } as IPepGenericListDataSource
    }

    getActions(resource:MappingResource): IPepGenericListActions {
        return {
            get: async (data: PepSelectionData) => {
                const actions = []
                if (data && data.rows.length == 1) {
                    actions.push({
                        title: this.translate.instant('Edit'),
                        handler: async (objs) => {
                            this.openForm('Edit', objs.rows[0], resource);
                        }
                    })
                    actions.push({
                        title: this.translate.instant('Delete'),
                        handler: async (objs) => {
                            this.showDeleteDialog(objs.rows[0], resource);
                        }
                    })
                }
                return actions;
            }
        }
    }
    async openForm(mode: FormMode, selectedKey: string = undefined, resource: MappingResource) {
        const item = this.mappings.find(mapping=> mapping.Key === selectedKey);
        const formItem: MappingFormItem = {
            Key: selectedKey,
            Atd: this.atd,
            Collection: item?.DataSource.Collection || '',
            CollectionField: item?.DataSource.Field || '',
            CollectionDelimiter: item?.DataSource.Delimiter || '',
            DocumentKeyMapping: item?.DocumentKeyMapping || [],
            Resource: item?.Resource || resource,
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
                this.setGenericListDataSource(resource);
            }
        });
    }
    
    showDeleteDialog(selectedKey: string, resource: MappingResource) {
        const item = this.mappings.find(mapping=> mapping.Key === selectedKey);
        const dataMsg = new PepDialogData({
            title: this.translate.instant('Mapping_DeleteDialog_Title'),
            actionsType: 'cancel-delete',
            content: this.translate.instant('Mapping_DeleteDialog_Content', {ApiName: item?.Field.ApiName})
        });
        this.dialogService.openDefaultDialog(dataMsg).afterClosed()
            .subscribe(async (isDeletePressed) => {
                if (isDeletePressed) {
                    try {
                        await this.mappingsService.deleteMapping(item);
                        this.setGenericListDataSource(resource);
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

    setGenericListDataSource(resource: MappingResource) {
        switch (resource) {
            case 'activities': {
                this.activitiesDataSource = this.getDataSource('activities');
                break;
            }
            case 'transactions': {
                this.transactionsDataSource = this.getDataSource('transactions');
                break;
            }
            case 'transaction_lines': {
                this.linesDataSource = this.getDataSource('transaction_lines');
                break;
            }
        }
    }

}
