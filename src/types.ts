export interface DataSource extends Record<
    string,
    DataSource | number | string | boolean
> {}

export type CalculateFunction<TData = unknown> = (
    values: Record<string, string>,
    data: TData,
) => unknown

export interface SectionInput {
    label: string
    value: string
}

export interface FieldOptions<TData = unknown> {
    selector: string
    animated?: boolean
    duration?: number
    dots?: number
    dataKey?: string
    calculateFunction?: CalculateFunction<TData>
    attribute?: boolean
    animation?: string[]
    animatedNode?: 'parent' | 'self' | 'closest'
    animatedNodeSelector?: string
}

export interface SectionOptions {
    title?: string
    type: string
    inputs: SectionInput[] | ((data: unknown) => SectionInput[])
    className?: string
    checked?: boolean
    inputType?: string
}

export interface CalculatorOptions<TData = unknown> {
    id: string
    editableFields?: FieldOptions<TData>[]
    data?: TData | null
    parentSelector?: string
    prefix?: string
    stylePrefix?: string
    dataAttributePrefix?: string
    sectionsOptions?: SectionOptions[]
}

/** Minimal interface exposed to external code that receives a calculator instance */
export interface ICalculatorInstance {
    getValue(key: string): unknown
    getValues(): Record<string, string>
    refresh(): void
}

export interface ConfiguratorSection {
    key: string
    title: string
    path: string
    postfix?: string
    inputs?: SectionInput[]
    selectorDisplay?: (selected: string, sectionData: unknown) => string
    labelMapping?: Record<string, string>
}

export interface ConfiguratorField {
    selector: string
    attribute?: boolean
    get: (
        values: Record<string, string>,
        item: unknown,
        id: string,
        calculator: ICalculatorInstance,
    ) => unknown
}

export interface ConfiguratorOptions {
    oldPricePercent: number
    getPrice: (
        values: Record<string, string>,
        item: unknown,
        id: string,
    ) => number
    sections: ConfiguratorSection[]
    fields?: ConfiguratorField[]
}
