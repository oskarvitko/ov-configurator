import { JSONPath } from 'jsonpath-plus'
import Calculator from './calculator'
import type {
    ConfiguratorOptions,
    ConfiguratorSection,
    DataSource,
    InitConfiguratorOptions,
    SectionInput,
} from './types'

function getConfiguratorOptions(
    element: HTMLElement,
): ConfiguratorOptions | null {
    let node = element.querySelector<HTMLElement>('[data-configurator-options]')

    const nodeSelector = node?.getAttribute('data-configurator-options')

    if (nodeSelector) {
        node = document.querySelector(nodeSelector)
    }

    if (!node) return null

    try {
        let code = node.textContent?.trim() ?? ''
        if (!code.startsWith('{')) code = '{' + code + '}'
        return new Function(`return (${code})`)() as ConfiguratorOptions
    } catch (error) {
        console.warn(error)
        return null
    }
}

export function getOptions(
    dataSource: DataSource,
    element: HTMLElement,
    {
        calcIdAttribute = 'data-calc-id',
        calcPlaceSelector,
    }: InitConfiguratorOptions,
): {
    data: unknown
    uniqId: string
    id: string
    placeNode: HTMLElement
} | null {
    const id = element.getAttribute(calcIdAttribute)
    if (!id) return null

    const placeSelector =
        typeof calcPlaceSelector === 'function'
            ? calcPlaceSelector(id)
            : calcPlaceSelector

    const placeNode =
        element.querySelector<HTMLElement>(placeSelector) ?? element

    if (typeof dataSource === 'undefined') return null
    if (!dataSource[id]) return null

    const data = dataSource[id]
    const uniqId = id + '-' + Math.random().toString(36).slice(2, 7)

    return { data, uniqId, id, placeNode }
}

export function queryByPath(
    data: unknown,
    path: string,
    values: Record<string, string> = {},
): unknown {
    const storedValues: Record<string, unknown> = { ...values }

    function processOperation(operationRaw: string, value: unknown): unknown {
        const operation = operationRaw.replace(
            /\$get:([a-zA-Z0-9_.-]+)/g,
            (_, key: string) => String(storedValues[key]),
        )

        if (operation.startsWith('$save:')) {
            const keyName = operation.replace('$save:', '')
            storedValues[keyName] = value
            return value
        }

        switch (operation) {
            case '$root':
                return data
            case '$first':
                return (value as unknown[])[0]
            case '$last': {
                const arr = value as unknown[]
                return arr[arr.length - 1]
            }
            default:
                return JSONPath({ path: operation, json: value as object })
        }
    }

    const conditions = path.split('||').map((part) => part.trim())
    let result: unknown = null

    do {
        result = data
        const condition = conditions.shift()!
        const operations = condition.split('>').map((op) => op.trim())

        while (operations.length) {
            const operation = operations.shift()!
            result = processOperation(operation, result)

            if (
                result === undefined ||
                result === null ||
                (Array.isArray(result) && !result.length)
            ) {
                result = null
                break
            }
        }

        if (result !== null) break
    } while (conditions.length)

    return result
}

export function initConfigurator(
    dataSource: DataSource,
    element: HTMLElement,
    initOptions: InitConfiguratorOptions,
): void {
    const options = getOptions(dataSource, element, initOptions)

    if (!options) return

    const { id, uniqId, data, placeNode } = options

    const configuratorOptions = getConfiguratorOptions(element)
    if (!configuratorOptions) return

    const { oldPricePercent, getPrice, sections, fields } = configuratorOptions

    element.setAttribute('data-calc-id', uniqId)

    const calculator = new Calculator({
        id: uniqId,
        parentSelector: `[data-calc-id="${uniqId}"]`,
        data,
        editableFields: [],
        sectionsOptions: [],
        initialValues: initOptions.initialValues,
    })

    calculator.addField({
        selector: 'price',
        calculateFunction: (values, item) => {
            return getPrice(values, item, id)
        },
    })

    calculator.addField({
        selector: 'old-price',
        calculateFunction() {
            const price = calculator.getValue('price') as number
            return price / ((100 - oldPricePercent) / 100)
        },
    })

    function getPostfix(section: ConfiguratorSection, label: string) {
        if (section.postfix === undefined) return ''

        return typeof section.postfix === 'function'
            ? section.postfix(label)
            : section.postfix
    }

    const paramsField = {
        calculateFunction(values: Record<string, string>) {
            return sections
                .map(
                    (section: ConfiguratorSection) =>
                        values[section.key] +
                        getPostfix(section, values[section.key]),
                )
                .join(' ')
        },
    }

    calculator.addField({ selector: 'params', ...paramsField })
    calculator.addField({
        selector: 'params-attr',
        attribute: true,
        ...paramsField,
    })

    const paramsViewField = {
        calculateFunction(values: Record<string, string>) {
            return sections
                .map(
                    (section: ConfiguratorSection) =>
                        `${section.title}: ${values[section.key]}${getPostfix(section, values[section.key])}`,
                )
                .join('\n')
        },
    }

    calculator.addField({ selector: 'params-view', ...paramsViewField })
    calculator.addField({
        selector: 'params-view-attr',
        attribute: true,
        ...paramsViewField,
    })

    const attributableFields = ['price', 'old-price']

    sections.forEach((section: ConfiguratorSection) => {
        calculator.addField({
            selector: section.key,
            calculateFunction: (values) => values[section.key],
        })

        attributableFields.push(section.key)

        calculator.addField({
            selector: `${section.key}-view`,
            calculateFunction: (values) => {
                const selected = values[section.key]
                const sectionData = queryByPath(data, section.path, values)

                return typeof section.selectorDisplay === 'function'
                    ? section.selectorDisplay(selected, sectionData)
                    : selected
            },
        })

        function getLabel(value: string, section: ConfiguratorSection): string {
            const labelMapping = section.labelMapping ?? {}
            const label = labelMapping[value] ?? value
            return label + getPostfix(section, label)
        }

        calculator.addSection({
            title: section.title,
            type: section.key,
            dependsOn: section.dependsOn,
            inputs: Array.isArray(section.inputs)
                ? section.inputs
                : (values) => {
                      const sectionData = queryByPath(
                          data,
                          section.path,
                          values,
                      )

                      if (!sectionData) return []

                      return (sectionData as string[]).map((value) => {
                          const input: SectionInput = {
                              label: getLabel(value, section),
                              value,
                          }

                          if (typeof section.isDisabled === 'function') {
                              input.disabled = section.isDisabled(input)
                          }

                          return input
                      })
                  },
        })
    })

    if (Array.isArray(fields)) {
        fields.forEach((field) => {
            calculator.addField({
                selector: field.selector,
                attribute: Boolean(field.attribute),
                calculateFunction(values, item) {
                    return field.get(values, item, id, calculator)
                },
            })
        })
    }

    attributableFields.forEach((selector) => {
        calculator.addField({
            selector,
            attribute: true,
            calculateFunction: () => calculator.getValue(selector),
        })
    })

    calculator.render(placeNode)
}

/** Alias for {@link initConfigurator} */
export const Configurator = initConfigurator
