import type {
    CalculatorOptions,
    FieldOptions,
    SectionOptions,
    SectionInput,
} from './types'

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
    node: HTMLElement | null = null
    animationId: number = 0
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

    getNode(options: GetNodeOptions): HTMLElement | null {
        const { prefix, parentNode, type = fieldTypes.DEFAULT } = options

        if (type === fieldTypes.CUSTOM) {
            this.node = parentNode.querySelector<HTMLElement>(
                this.options.selector,
            )
        } else {
            this.node = parentNode.querySelector<HTMLElement>(
                `[data-${prefix}="${this.options.selector}"]`,
            )

            if (
                !this.node &&
                this.options.attribute &&
                parentNode.getAttribute(`data-${prefix}`) ===
                    this.options.selector
            ) {
                this.node = parentNode
            }
        }

        return this.node
    }

    changeValue(value: unknown): void {
        if (!this.node) return

        this.animateBlock(value)

        if (this.options.attribute) {
            const attributeName = this.node.dataset.calcAttribute
            if (attributeName) {
                this.node.setAttribute(attributeName, String(value))
            }
        } else {
            if (Number.isNaN(Number(value))) {
                this.node.innerHTML = String(value)
                return
            }
            this.animateNumber(Number(value))
        }

        this.prevValue = value
    }

    animateBlock(value: unknown): void {
        if (value === this.prevValue) return

        const { animated, animation, animatedNode, animatedNodeSelector } =
            this.options

        let node: HTMLElement | null = null

        switch (animatedNode) {
            case animatedNodeTypes.SELF:
                node = this.node
                break
            case animatedNodeTypes.PARENT:
                node = this.node?.parentNode as HTMLElement | null
                break
            case animatedNodeTypes.CLOSEST:
                node =
                    this.node?.closest<HTMLElement>(animatedNodeSelector) ??
                    null
                break
        }

        if (animated && node) {
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
    }

    animateNumber(to: number): void {
        const { duration = 800, dots = 0 } = this.options
        const node = this.node!
        window.cancelAnimationFrame(this.animationId)

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
                this.animationId = window.requestAnimationFrame(step)
            } else {
                node.textContent = to.toFixed(getCompletedDots(to))
                window.cancelAnimationFrame(this.animationId)
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

        this.animationId = window.requestAnimationFrame(step)
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
    private form!: HTMLFormElement

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
        this.fields = editableFields.map((field) => new Field<TData>(field))
    }

    addField(field: FieldOptions<TData>): void {
        this.fields.push(new Field<TData>(field))
    }

    addSection(section: SectionOptions): void {
        const newSections = (this.options.sectionsOptions ?? []).concat([
            section,
        ])
        this.options.sectionsOptions = newSections
    }

    init(): void {
        if (!this.data) return

        const { parentSelector, dataAttributePrefix, stylePrefix } =
            this.options

        const parent = document.querySelector<HTMLElement>(parentSelector!)!
        this.fields.forEach((field) =>
            field.getNode({
                prefix: dataAttributePrefix,
                parentNode: parent,
            }),
        )
        this.form = parent.querySelector<HTMLFormElement>(`.${stylePrefix}`)!
        this.form.addEventListener('change', () =>
            this.changeHandler(this.form),
        )

        this.changeHandler(this.form)
    }

    getValues(): Record<string, string> {
        return this.values
    }

    changeHandler(form: HTMLFormElement): void {
        const checked = Array.from(
            form.querySelectorAll<HTMLInputElement>('input'),
        ).filter((input) => input.checked)

        const values = checked.reduce<Record<string, string>>(
            (result, input) => {
                const arr = input.name.split('-')
                return {
                    ...result,
                    [arr[arr.length - 1]]: input.value,
                }
            },
            {},
        )

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

    saveValue(key: string, value: unknown): void {
        this.savedValues[key] = value
    }

    getValue(key: string): unknown {
        return this.savedValues[key]
    }

    getHTML(): string {
        if (!this.data) return ''
        const { stylePrefix, sectionsOptions } = this.options

        return `
            <form action="/" class="${stylePrefix}">
                ${(sectionsOptions ?? [])
                    .map((options) => this.getSectionHTML(options))
                    .join('')}
            </form>
        `
    }

    getSectionHTML(options: SectionOptions): string {
        const { stylePrefix, prefix, id } = this.options
        let {
            title = '',
            type,
            inputs,
            className = '',
            checked = true,
            inputType = 'radio',
        } = options

        if (typeof inputs === 'function') inputs = inputs(this.data)
        if (!inputs.length) return ''

        const defaultValue = inputs[0].value
        let checkedValue = this.getValues()[type] ?? defaultValue
        if (!inputs.find((input) => input.value === checkedValue)) {
            checkedValue = defaultValue
        }

        return `
        <div class="${stylePrefix}__section">
            ${
                title &&
                `<h4 class="${stylePrefix}__section-title">${title}:</h4>`
            }
            <div class="${stylePrefix}__section-row">
            ${inputs
                .map((input: SectionInput, i: number) => {
                    const checkedAttribute =
                        checkedValue === input.value ? 'checked' : ''

                    return `
                <div class="${stylePrefix}__section-col ${className}">
                        <input
                        ${checked ? checkedAttribute : ''}
                            name="${prefix}-${id}-${type}"
                            id="${prefix}-${id}-${type}-${i}"
                            type="${inputType}"
                            value="${input.value}"
                        />
                        <label
                            for="${prefix}-${id}-${type}-${i}"
                            >${input.label}</label
                        >
                    </div>
                        `
                })
                .join('')}
            </div>
        </div>
        `
    }

    renderInNode(node: HTMLElement): void {
        node.innerHTML = this.getHTML()
        this.node = node
    }

    refresh(): void {
        if (this.node) {
            this.renderInNode(this.node)
            this.init()
        }
    }
}
