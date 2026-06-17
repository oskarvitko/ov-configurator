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
    disabled?: boolean
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
    prefix?: string
}

export interface SectionOptions {
    title?: string
    type: string
    inputs:
        | SectionInput[]
        | ((values: Record<string, string>) => SectionInput[])
    className?: string
    checked?: boolean
    inputType?: string
    dependsOn?: string[]
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
    initialValues?: Record<string, string>
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
    transformInputs?: (inputs: any) => SectionInput[]
    postfix?: string | ((label: string) => string)
    inputs?: SectionInput[]
    selectorDisplay?: (selected: string, sectionData: unknown) => string
    labelMapping?: Record<string, string>
    isDisabled?: (input: SectionInput) => boolean
    dependsOn?: string[]
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
        calculator: ICalculatorInstance,
    ) => number
    sections: ConfiguratorSection[]
    fields?: ConfiguratorField[]
}

export interface InitConfiguratorOptions {
    initialValues?: Record<string, string>
    calcIdAttribute?: string
    calcPlaceSelector: ((id: string) => string) | string
}
