import { Client } from "@pepperi-addons/debug-server/dist";
import { ApiFieldObject, DataViewFieldTypes } from "@pepperi-addons/papi-sdk";
import { MappingFieldType, UdcMapping } from "../entities";
import { UtilitiesService } from "./utilities.service";

export class FieldsService {
    
    utilities: UtilitiesService = new UtilitiesService(this.client)
    
    constructor(private client: Client) {
        
    }
    
    async getField(atdId: number, resource: string, fieldId: string): Promise<ApiFieldObject | undefined> {
        const fields = await this.utilities.papiClient.metaData.type(resource).types.subtype(atdId.toString()).fields.get();
        return fields ? fields.find(field => field.FieldID === fieldId) : undefined;
    }
    
    async getFields(atdId: number, resource: string): Promise<ApiFieldObject[]> {
        if (resource === 'items' || resource === 'accounts') {
            return await this.utilities.papiClient.metaData.type(resource).fields.get();
        }
        else {
            return await this.utilities.papiClient.metaData.type(resource).types.subtype(atdId.toString()).fields.get();
        }
    }
    
    async upsert(obj: UdcMapping) {
        if(obj.Hidden) {
            this.delete(obj.AtdID, obj.Field.ApiName, obj.Resource!)
        }
        else {
            const jsReturnValue = this.getJSReturnValue(obj.Field.Type);
            const field = {
                FieldID: obj.Field.ApiName,
                Label: obj.Field.Title,
                Description: obj.Field.Description,
                UIType: {
                    ID: DataViewFieldTypes[obj.Field.Type],
                    Name: obj.Field.Type
                },
                CalculatedRuleEngine: {
                    JSFormula: `// this field value is coming from UDC\nreturn ${jsReturnValue};`,
                    ParticipatingFields: [],
                    CalculatedOn: {
                        ID: 2,
                        Name: "OnChange"
                    },
                    Temporary: obj.Field.Temporary
                },
            }
            return await this.utilities.papiClient.metaData.type(obj.Resource!).types.subtype(obj.AtdID.toString()).fields.upsert(field);
        }
    }
    
    async delete(atdId:number, fieldId: string, resource: string) {
        return await this.utilities.papiClient.metaData.type(resource).types.subtype(atdId.toString()).fields.delete(fieldId);
    }
    
    getJSReturnValue(type: MappingFieldType ) {
        let retVal;
        switch (type) {
            case 'TextBox':
            case 'TextArea':
            case 'ComboBox':
            case 'RichTextHTML': {
                retVal = '';
                break;
            }
            case 'Date':
            case 'DateAndTime':
            case 'NumberInteger':
            case 'NumberReal':
            case 'Currency': {
                retVal = 0;
                break;
            }
            case 'Boolean': {
                retVal = false;
                break;
            }
            default: {
                retVal = '';
                break;
            }
        }
        return retVal;
    }
}