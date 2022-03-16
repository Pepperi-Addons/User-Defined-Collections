import { DocumentKeyTypes, SchemeFieldTypes, DataViewFieldTypes, HorizontalAlignments, VerticalAlignments } from "@pepperi-addons/papi-sdk"
import { Schema } from 'jsonschema';

export const regexPattern: string = "^([a-zA-Z0-9-_])+$"

export const documentKeySchema: Schema = {
    $id: "/DocumentKey",
    type: "object",
    properties: {
        Type: {
            enum: DocumentKeyTypes.filter(type => true),
        },
        Delimiter: {
            type: "string",
        },
        Fields: {
            type: "array",
            items: {
                type: "string"
            },
            uniqueItems: true,
            minItems: 1,
            maxItems: 8
        },
    },
    if: {
        properties: {
            Type: {
                const: "Composite"
            },
        },
    },
    then: {
        properties: {
            Delimiter: {
                type: "string",
            },
            Fields: {
                type: "array",
                items: {
                    type: "string"
                },
                uniqueItems: true,
                minItems: 1
            },
        },
        required: ["Delimiter", "Fields"],
    },
    required: ["Type"],
    additionalProperties: false,
}

export const dataViewSchema: Schema = {
    $id: "/DataView",
    type: "object",
    properties: {
        InternalID: {
            type: "number"
        },
        Title: {
            type: "string"
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
        },
        Type: {
            const: "Grid"
        },
        Fields: {
            type: "array",
            properties: {
                Type: {
                    enum: Object.keys(DataViewFieldTypes),
                },
                Title: {
                    type: "string",
                },
                Mandatory: {
                    type: "string",
                },
                ReadOnly: {
                    type: "boolean",
                },
                Layout: {
                    type:"object",
                    properties: {
                        Origin: {
                            type: "object",
                            properties: {
                                X: {
                                    type: "number",
                                },
                                Y: {
                                    type: "number",
                                },
                            },
                            required: ["X", "Y"],
                        },
                        Size: {
                            type: "object",
                            properties: {
                                Width: {
                                    type: "number",
                                },
                                Height: {
                                    type: "number",
                                },
                            },
                            required: ["Width", "Height"],
                        },
                    }
                },
                Style: {
                    type:"object",
                    properties: {
                        Alignment: {
                            type: "object",
                            properties: {
                                Horizontal: {
                                    enum: Object.keys(HorizontalAlignments),
                                },
                                Vertical: {
                                    enum: Object.keys(VerticalAlignments),
                                },
                            },
                            required: ["Horizontal", "Vertical"],
                        },
                    },
                    required: ["Alignment"],
                }
            },
            required: ["Type", "Title", "Mandatory", "ReadOnly"]
        },
        Columns: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    Width: {
                        type: "number",
                        exclusiveMinimum: 0,
                        exclusiveMaximum: 100,
                    },
                },
            }
        }
    }
}

export const fieldsSchema: Schema = {
    $id:"/Fields",
    type: "object",
    patternProperties: {
        "^([a-zA-Z0-9_-])+$": {
            type: "object",                    
            properties: {
                Description: {
                    type: "string"
                },
                Type: {
                    enum: SchemeFieldTypes.filter(type => type !== 'MultipleStringValues'),
                },
                Mandatory: {
                    type: "boolean"
                },
                OptionalValues: {
                    type: "array",
                    items: {
                        type: "string"
                    }
                }
            },
            required: ["Type", "Mandatory"],
            if: {
                properties: {
                    Type: {
                        const: "Array",
                    }
                }
            },
            then: {
                properties: {
                    Items: {
                        type: "object",
                        properties: {
                            Type: {
                                enum: SchemeFieldTypes.filter(type => type !== 'Array' && type !== 'MultipleStringValues'),
                            }
                        },
                        required: ["Type"],
                    }
                },
                required: ["Items"],
            }
        }
    },
    minProperties: 1,
}
export const collectionSchema: Schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "/Collection",
    type: "object",
    properties: {
        Name: {
            type: "string",
            pattern: regexPattern,
        },
        Description: {
            type: "string",
        },
        DocumentKey: {
            type: "object",
            $ref: documentKeySchema.$id
        },
        ListView: {
            type: "object",
            $ref: dataViewSchema.$id,
        },
        Fields: {
            type: "object",
            $ref: fieldsSchema.$id,
        },
        Hidden: {
            type: "boolean",
        },
        CreationDateTime: {
            type: "string",
            format: "date-time",
        },
        ModificationDateTime: {
            type: "string",
            format: "date-time",
        },
    },
    required: ["Name", "Fields", "ListView", "DocumentKey"],
}