import { DocumentKeyTypes, SchemeFieldTypes, DataViewFieldTypes, HorizontalAlignments, VerticalAlignments } from "@pepperi-addons/papi-sdk"
import { Schema } from 'jsonschema';

export const regexPattern: string = "^([a-zA-Z0-9-_])+$"

export const documentKeySchema: Schema = {
    $id: "/DocumentKey",
    type: "object",
    properties: {
        Type: {
            enum: DocumentKeyTypes.filter(type => true),
            required: true,
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
                required: true,
            },
            Fields: {
                type: "array",
                items: {
                    type: "string"
                },
                uniqueItems: true,
                minItems: 1,
                required: true,
            },
        },
    },
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
                    required: true,
                },
                Title: {
                    type: "string",
                    required: true,
                },
                Mandatory: {
                    type: "string",
                    required: true,
                },
                ReadOnly: {
                    type: "boolean",
                    required: true,
                },
                Layout: {
                    type:"object",
                    properties: {
                        Origin: {
                            type: "object",
                            properties: {
                                X: {
                                    required: true,
                                    type: "number",
                                },
                                Y: {
                                    required: true,
                                    type: "number",
                                },
                            },
                        },
                        Size: {
                            type: "object",
                            properties: {
                                Width: {
                                    type: "number",
                                    required: true,
                                },
                                Height: {
                                    type: "number",
                                    required: true,
                                },
                            },
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
                                    required: true,
                                },
                                Vertical: {
                                    enum: Object.keys(VerticalAlignments),
                                    required: true,
                                },
                            },
                            required: true,
                        },
                    },
                }
            },
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
                        required: true,
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
                    required: true,
                },
                Mandatory: {
                    type: "boolean",
                    required: true,
                },
                OptionalValues: {
                    type: "array",
                    items: {
                        type: "string"
                    }
                }
            },
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
                                required: true,
                            }
                        },
                        required: true,
                    }
                },
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
            required: true,
        },
        Description: {
            type: "string",
        },
        DocumentKey: {
            type: "object",
            $ref: documentKeySchema.$id,
            required: true,
        },
        ListView: {
            type: "object",
            required: true,
            $ref: dataViewSchema.$id,
        },
        Fields: {
            type: "object",
            required: true,
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
}