import type { CalculatorOptions, FieldOptions, SectionOptions } from './types'
import {
    renderCalculatorForm,
    unmountCalculatorForm,
    resolveSections,
    type ResolvedSection,
    resolveInputs,
} from './calculator-form'

// Polyfills for IE11
;(function () {
    const num = Number as unknown as Record<string, unknown>
    if (!num['isNaN']) {
        num['isNaN'] = function (value: unknown): boolean {
            return typeof value === 'number' && isNaN(value)
        }
    }

    if (!Array.prototype.find) {
        ;(Array.prototype as unknown as Record<string, unknown>)['find'] =
            function <T>(
                this: T[],
                predicate: (value: T, index: number, obj: T[]) => boolean,
                thisArg?: unknown,
            ): T | undefined {
                if (this == null) {
                    throw new TypeError(
                        'Array.prototype.find called on null or undefined',
                    )
                }
                if (typeof predicate !== 'function') {
                    throw new TypeError('predicate must be a function')
                }
                const list = Object(this) as T[]
                const length = list.length >>> 0
                for (let i = 0; i < length; i++) {
                    const value = list[i]
                    if (predicate.call(thisArg, value, i, list)) {
                        return value
                    }
                }
                return undefined
            }
    }
})()
// -----------

const fieldTypes = {
    DATA_ATTRIBUTE: 'data',
    CUSTOM: 'custom',
    DEFAULT: 'default',
} as const

const animatedNodeTypes = {
    PARENT: 'parent',
    SELF: 'self',
    CLOSEST: 'closest',
} as const

type FieldType = (typeof fieldTypes)[keyof typeof fieldTypes]

interface GetNodeOptions {
    prefix: string
    parentNode: HTMLElement
    type?: FieldType
}

class Field<TData = unknown> {
    selector: string
    options: Required<FieldOptions<TData>>
    nodes: HTMLElement[] = []
    animationIds: number[] = []
    prevValue: unknown = undefined

    constructor(options: FieldOptions<TData>) {
        const { selector } = options
        this.selector = selector
        this.options = {
            animated: false,
            duration: 800,
            dots: 0,
            dataKey: selector,
            calculateFunction: () => null,
            attribute: false,
            animation: ['animate__faster', 'animate__pulse'],
            animatedNode: animatedNodeTypes.PARENT,
            animatedNodeSelector: '',
            ...options,
        } as Required<FieldOptions<TData>>
    }

    getNode(options: GetNodeOptions): HTMLElement[] {
        const { prefix, parentNode, type = fieldTypes.DEFAULT } = options

        if (type === fieldTypes.CUSTOM) {
            this.nodes = Array.from(
                parentNode.querySelectorAll<HTMLElement>(this.options.selector),
            )
        } else {
            const attributeName = `data-${prefix}`
            this.nodes = Array.from(
                parentNode.querySelectorAll<HTMLElement>(
                    `[${attributeName}="${this.options.selector}"]`,
                ),
            )

            if (
                parentNode.getAttribute(attributeName) === this.options.selector
            ) {
                this.nodes.push(parentNode)
            }
        }

        return this.nodes
    }

    changeValue(value: unknown): void {
        if (!this.nodes.length) return

        const { prefix, selector } = this.options

        this.animateBlock(value)

        this.nodes.forEach((node, index) => {
            let attributeName = node.dataset.calcAttribute
            let shouldChangeAttribute = this.options.attribute
            let shouldChangeTextContent = !this.options.attribute

            const changeConfig = node.getAttribute(
                `data-${prefix}-${selector}-target`,
            )

            if (changeConfig) {
                const [mode, attribute] = changeConfig.split(':')

                attributeName = attribute
                shouldChangeAttribute = mode === 'full' || mode === 'attr'
                shouldChangeTextContent = mode === 'full'
            }

            if (shouldChangeAttribute) {
                if (attributeName) {
                    node.setAttribute(attributeName, String(value))
                }
            }

            if (shouldChangeTextContent) {
                const numberedValue = Number(value)
                if (Number.isNaN(numberedValue)) {
                    node.innerHTML = String(value)
                    return
                }

                this.animateNumber(numberedValue, node, index)
            }
        })

        this.prevValue = value
    }

    animateBlock(value: unknown): void {
        if (value === this.prevValue) return

        const { animated, animation, animatedNode, animatedNodeSelector } =
            this.options

        if (!animated) return

        this.nodes.forEach((currentNode) => {
            let node: HTMLElement | null = null

            switch (animatedNode) {
                case animatedNodeTypes.SELF:
                    node = currentNode
                    break
                case animatedNodeTypes.PARENT:
                    node = currentNode.parentNode as HTMLElement | null
                    break
                case animatedNodeTypes.CLOSEST:
                    node =
                        currentNode.closest<HTMLElement>(
                            animatedNodeSelector,
                        ) ?? null
                    break
            }

            if (node) {
                const animateClass = ['animate__animated', ...animation]
                const removeClasses = (): void => {
                    node!.classList.remove(...animateClass)
                }

                node.classList.add(...animateClass)
                node.addEventListener('webkitAnimationEnd', removeClasses)
                node.addEventListener('mozAnimationEnd', removeClasses)
                node.addEventListener('MSAnimationEnd', removeClasses)
                node.addEventListener('oanimationend', removeClasses)
                node.addEventListener('animationend', removeClasses)
            }
        })
    }

    animateNumber(to: number, node: HTMLElement, index: number): void {
        const { duration = 800, dots = 0 } = this.options
        window.cancelAnimationFrame(this.animationIds[index] ?? 0)

        let from = Number(node.textContent)
        from = Number.isNaN(from) ? 0 : from

        const difference = to - from
        const positiveDirection = difference > 0

        let start: number | null = null

        const step = (timestamp: number): void => {
            if (start === null) start = timestamp
            const progress = timestamp - start
            const value = getValue(progress)
            node.textContent = value.toFixed(dots)

            if (progress < duration) {
                this.animationIds[index] = window.requestAnimationFrame(step)
            } else {
                node.textContent = to.toFixed(getCompletedDots(to))
                window.cancelAnimationFrame(this.animationIds[index])
            }
        }

        function getValue(progress: number): number {
            const value = from + (progress * difference) / duration
            if (positiveDirection) {
                if (value > to) return to
            } else {
                if (value < to) return to
            }
            return value
        }

        function getCompletedDots(num: number): number {
            const strNumber = String(num)
            if (strNumber.includes('.')) {
                return strNumber.length - 1 > dots ? dots : strNumber.length - 1
            }
            return 0
        }

        this.animationIds[index] = window.requestAnimationFrame(step)
    }
}

export default class Calculator<TData = unknown> {
    static fieldTypes = fieldTypes
    static animatedNodeTypes = animatedNodeTypes

    savedValues: Record<string, unknown> = {}
    values: Record<string, string> = {}
    node: HTMLElement | null = null
    options: CalculatorOptions<TData> & {
        prefix: string
        stylePrefix: string
        dataAttributePrefix: string
    }
    data: TData | null
    fields: Field<TData>[]

    constructor(options: CalculatorOptions<TData>) {
        const { editableFields = [], data = null } = options
        this.options = {
            editableFields: [],
            prefix: 'card',
            data: null,
            stylePrefix: 'calculator',
            dataAttributePrefix: 'calc',
            ...options,
        }
        this.data = data as TData | null
        this.fields = editableFields.map(
            (field) =>
                new Field<TData>({
                    ...field,
                    prefix: this.options.dataAttributePrefix,
                }),
        )
    }

    addField(field: FieldOptions<TData>): void {
        this.fields.push(
            new Field<TData>({
                ...field,
                prefix: this.options.dataAttributePrefix,
            }),
        )
    }

    addSection(section: SectionOptions): void {
        const newSections = (this.options.sectionsOptions ?? []).concat([
            section,
        ])
        this.options.sectionsOptions = newSections
    }

    private sortSections(sections: SectionOptions[]): SectionOptions[] {
        const result: SectionOptions[] = []
        const visited = new Set<string>()

        const visit = (type: string): void => {
            if (visited.has(type)) return
            visited.add(type)
            const section = sections.find((s) => s.type === type)
            if (!section) return
            for (const dep of section.dependsOn ?? []) {
                visit(dep)
            }
            result.push(section)
        }

        for (const section of sections) {
            visit(section.type)
        }

        return result
    }

    private buildInitialSections(): {
        resolvedSections: ResolvedSection[]
        values: Record<string, string>
    } {
        const { initialValues = {} } = this.options
        const sections = this.options.sectionsOptions ?? []
        const values: Record<string, string> = {}

        for (const section of sections) {
            const inputs = resolveInputs(section, values)

            const initialValueInput = inputs.find(
                (i) => i.value === initialValues[section.type] && !i.disabled,
            )

            if (initialValueInput) {
                values[section.type] = initialValueInput.value
            } else {
                const enabledInput = inputs.find((i) => !i.disabled)
                if (enabledInput) {
                    values[section.type] = enabledInput.value
                }
            }
        }

        return { resolvedSections: resolveSections(sections, values), values }
    }

    private processFields(values: Record<string, string>): void {
        this.fields.forEach((field) => {
            try {
                const value = field.options.calculateFunction(
                    values,
                    this.data as TData,
                )
                if (value === null) return
                this.saveValue(field.selector, value)
                field.changeValue(value ?? '--')
            } catch (error) {
                console.warn(error)
            }
        })

        this.values = values
    }

    render(node: HTMLElement): void {
        this.node = node
        if (!this.data) return

        if (this.options.sectionsOptions) {
            this.options.sectionsOptions = this.sortSections(
                this.options.sectionsOptions,
            )
        }

        const { resolvedSections, values } = this.buildInitialSections()

        this.values = values

        const {
            parentSelector,
            stylePrefix,
            prefix,
            dataAttributePrefix,
            id,
            sectionsOptions = [],
        } = this.options

        renderCalculatorForm(node, {
            sections: sectionsOptions,
            initialSections: resolvedSections,
            initialValues: values,
            dataAttributePrefix,
            stylePrefix,
            prefix,
            id,
            onValuesChange: (newValues) => this.processFields(newValues),
        })

        const parent = parentSelector
            ? document.querySelector<HTMLElement>(parentSelector)
            : null

        if (parent) {
            this.fields.forEach((field) =>
                field.getNode({
                    prefix: dataAttributePrefix,
                    parentNode: parent,
                }),
            )
        }

        this.processFields(values)
    }

    getValues(): Record<string, string> {
        return this.values
    }

    saveValue(key: string, value: unknown): void {
        this.savedValues[key] = value
    }

    getValue(key: string): unknown {
        return this.savedValues[key]
    }

    refresh(): void {
        if (this.node) {
            unmountCalculatorForm(this.node)
            this.values = {}
            this.render(this.node)
        }
    }
}
