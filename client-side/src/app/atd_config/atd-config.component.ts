import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { IPepGenericListActions, IPepGenericListDataSource, PepGenericListService } from '@pepperi-addons/ngx-composite-lib/generic-list';
import { PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { PepSelectionData } from '@pepperi-addons/ngx-lib/list';
import { Type } from '@pepperi-addons/papi-sdk';

import { FormMode, UtilitiesService } from '../services/utilities.service';
import { MappingsService, UdcMapping } from '../services/mappings.service';

@Component({
  selector: 'app-atd-config',
  templateUrl: './atd-config.component.html',
  styleUrls: ['./atd-config.component.scss']
})
export class AtdConfigComponent implements OnInit {
    @Input() hostObject: any;
    
    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
    

    dataSource:IPepGenericListDataSource = this.getDataSource()

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

    constructor(private router: Router,
        private activateRoute: ActivatedRoute,
        private genericListService: PepGenericListService,
        public translate: TranslateService,
        private mappingsService: MappingsService,
        private utilitiesService: UtilitiesService,
        private dialogService: PepDialogService) { }

    ngOnInit(): void {
        console.log(this.hostObject);
        this.utilitiesService.addonUUID = this.hostObject.options.addonId;
        this.mappingsService.getAtd(this.hostObject.objectList[0]).then(value => {
            this.atd = value;
        });
    }

    getDataSource(): IPepGenericListDataSource {
        return {
            init: async(params:any) => {
                this.mappings = await this.mappingsService.getMappings();
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
                                FieldID: 'Field',
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
                                FieldID: 'DataSource1',
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
                        mapping['DataSource1'] = `${mapping.DataSource.Collection}.${mapping.DataSource.Field}`
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

    openForm(mode: FormMode, selectedKey: string = undefined) {
        console.log(`opening form in ${mode} mode, on field ${selectedKey}`);
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
                        const mappingObj = this.mappings.find(mapping => mapping.Key === selectedKey);
                        if (mappingObj) {
                            mappingObj.Hidden = true;
                            await this.mappingsService.removeTSAField(mappingObj.ApiName, mappingObj.Resource, mappingObj.AtdID)
                            await this.mappingsService.upsertMapping(mappingObj);
                            this.dataSource = this.getDataSource();
                        }
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
