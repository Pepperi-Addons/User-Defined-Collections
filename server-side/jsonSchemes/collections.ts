import { DocumentKeyTypes, SchemeFieldTypes, DataViewFieldTypes, HorizontalAlignments, VerticalAlignments } from "@pepperi-addons/papi-sdk"
import { Schema } from 'jsonschema';

export const regexPattern: string = "^([A-Z]){1}([\Sa-zA-Z0-9-_])*$"

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
            minItems: 0,
        },
    },
    required: ['Type'],
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
                minItems: 1,
            },
        },
        required: ['Delimiter', 'Fields'],
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
            items: {
                type: "object",
                properties: {
                    FieldID: {
                        type: "string"
                    },
                    Type: {
                        enum: Object.keys(DataViewFieldTypes),
                    },
                    Title: {
                        type: "string",
                    },
                    Mandatory: {
                        type: "boolean",
                    },
                    ReadOnly: {
                        type: "boolean",
                    },
                    Layout: {
                        type: "object",
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
                                required: ['X', 'Y']
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
                                required: ['Width', 'Height']
                            },
                        }
                    },
                    Style: {
                        type: "object",
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
                                required: ['Horizontal', 'Vertical'],
                            },
                        },
                        required: ['Alignment']
                    }
                },
                required: ['FieldID', 'Type', 'Title', 'Mandatory', 'ReadOnly']
            },
            minItems: 1
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
                required: ['Width']
            },
            minItems: 1
        }
    },
    required: ['Fields', 'Columns']
}

export const fieldsSchema: Schema = {
    $id: "/Fields",
    type: "object",
    patternProperties: {
        "^([a-z]){1}([\Sa-zA-Z0-9_-])*$": {
            type: "object",
            properties: {
                Description: {
                    type: "string"
                },
                Type: {
                    enum: SchemeFieldTypes.filter(type => ['DynamicResource', 'ContainedDynamicResource', 'ContainedResource','MultipleStringValues'].includes(type) === false),
                    required: true,
                },
                IndexedFields: {
                    type: "object",
                    $ref: "/Fields",
                },
                Resource: {
                    type: "string"
                },
                AddonUUID: {
                    type: "string"
                },
                Mandatory: {
                    type: "boolean",
                    required: true,
                },
                OptionalValues: {
                    type: "array",
                    items: {
                        type: "string",
                        uniqueItems: true
                    }
                },
                Items: {
                    type: "object",
                    properties: {
                        Type: {
                            enum: SchemeFieldTypes.filter(type => ['MultipleStringValues', 'Array', 'Bool', 'DateTime'].includes(type) === false),
                        }
                    },
                },
                Fields: {
                    type: "object",
                    $ref: "/Fields",
                }
            },
            required: ['Type', 'Mandatory'],
            allOf: [{
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
                                    enum: SchemeFieldTypes.filter(type => ['MultipleStringValues', 'Array', 'Bool', 'DateTime'].includes(type) === false),
                                    required: true,
                                }
                            },
                            required: ['Type'],
                        }
                    },
                    required: ['Items'],
                }
            },
            {
                if: {
                    anyOf: [{
                        properties: {
                            Type: {
                                const: 'Array',
                            },
                            Items: {
                                properties: {
                                    Type: {
                                        const: 'Integer'
                                    }
                                }
                            }
                        }
                    }, {
                        properties: {
                            Type: {
                                const: 'Array',
                            },
                            Items: {
                                properties: {
                                    Type: {
                                        const: 'Double'
                                    }
                                }
                            }
                        }
                    }, {
                        properties: {
                            Type: {
                                const: 'Array',
                            },
                            Items: {
                                properties: {
                                    Type: {
                                        const: 'Object'
                                    }
                                }
                            }
                        }
                    },
                    {
                        properties: {
                            Type: {
                                const: 'Bool',
                            },
                        }
                    },
                    {
                        properties: {
                            Type: {
                                const: 'Integer',
                            },
                        }
                    },
                    {
                        properties: {
                            Type: {
                                const: 'Double',
                            },
                        }
                    },
                    {
                        properties: {
                            Type: {
                                const: 'Object',
                            },
                        }
                    },
                    {
                        properties: {
                            Type: {
                                const: 'Resource',
                            },
                        }
                    },
                    {
                        properties: {
                            Type: {
                                const: 'DateTime',
                            },
                        }
                    }]
                },
                then: {
                    properties: {
                        OptionalValues:{
                            type: "array",
                            items: {
                                type: "string",
                                maxLength: 0,
                            } 
                        }
                    }
                }
            }],
            additionalProperties: false
        }
    },
    minProperties: 1,
    additionalProperties:false
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
    required: ['Name', 'DocumentKey', 'Fields', 'ListView']
}