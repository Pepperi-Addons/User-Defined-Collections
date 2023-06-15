
export type limitationData = {
    title: string,
    hardLimit: number
};

export const DataLimitationMapping: Map<string, limitationData> = new Map ([
    ['metadata' , {title: 'Metadata number of items', hardLimit: 100}],
    ['documents' , {title: 'Number of Documents', hardLimit: Math.pow(10, 7)}], //10 million
    ['documentsNotIndexed' , {title: 'Number of Not indexed documents', hardLimit: Math.pow(10, 4)}], // 10000
    ['containedArrayItems' , {title: 'Number of Contained arrays items', hardLimit: 150}],
    ['fields' , {title: 'Number of fields', hardLimit: 50}],
    ['fieldsOfContained' , {title: 'Number of contained array fields', hardLimit: 15}]
]);

export const SoftLimitsDeaultValues: Map<string, number> = new Map ([
    ['metadata' , 50],
    ['documents' , Math.pow(10, 6)], // 1 million
    ['documentsNotIndexed' , 5000],
    ['containedArrayItems' , 100],
    ['fields' , 30],
    ['fieldsOfContained' , 10]
])

export type limitationField = {
    metadata: string,
    documents: string,
    documentsNotIndexed: string,
    containedArrayItems: string,
    fields: string,
    fieldsOfContained: string
}

