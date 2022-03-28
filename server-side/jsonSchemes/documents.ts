import { Schema } from "jsonschema";

export const DocumentSchema: Schema = {
    $id: "/Document",
    description: "schema definition for collection's documents in the user defined collections add-on",
    type: "object",
    properties: {
        Key: {
            type: "string",
            required: true,
        },
        Hidden: {
            type: "boolean"
        },
        CreationDateTime: {
            type: "string",
            format: "date-time",
        },
        ModificationDateTime: {
            type: "string",
            format: "date-time",
        }
    },
}