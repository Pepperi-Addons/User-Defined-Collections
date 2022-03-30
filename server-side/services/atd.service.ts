import { Client } from "@pepperi-addons/debug-server/dist";
import { ApiFieldObject } from "@pepperi-addons/papi-sdk";
import { UtilitiesService } from "./utilities.service";

export class AtdService {

    utilities: UtilitiesService = new UtilitiesService(this.client)

    constructor(private client: Client) {

    }

    async getAtd(uuid: string) {
        return  await this.utilities.papiClient.types.find({
            where: `UUID='${uuid}'`
        }).then((types) => {
            return types[0]
        });
    }

    async getField(atdId: number, resource: string, fieldId: string): Promise<ApiFieldObject | undefined> {
        const fields = await this.utilities.papiClient.metaData.type(resource).types.subtype(atdId.toString()).fields.get();
        return fields ? fields.find(field => field.FieldID === fieldId) : undefined;
    }

    async upsertField(atdId: number, resource: string, field: ApiFieldObject) {
        return await this.utilities.papiClient.metaData.type(resource).types.subtype(atdId.toString()).fields.upsert(field);
    }

    async removeField(atdId:number, fieldId: string, resource: string) {
        return await this.utilities.papiClient.metaData.type(resource).types.subtype(atdId.toString()).fields.delete(fieldId);
    }

}