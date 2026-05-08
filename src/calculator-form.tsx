import { render } from 'preact'
import { useState } from 'preact/hooks'
import type { SectionOptions, SectionInput } from './types'

export interface ResolvedSection {
    options: SectionOptions
    inputs: SectionInput[]
    checkedValue: string
}

export interface CalculatorFormProps {
    sections: SectionOptions[]
    initialSections: ResolvedSection[]
    initialValues: Record<string, string>
    stylePrefix: string
    dataAttributePrefix: string
    prefix: string
    id: string
    onValuesChange: (values: Record<string, string>) => void
}

function resolveCheckedValue(
    type: string,
    values: Record<string, string>,
    inputs: SectionInput[],
): string {
    const firstEnabled = inputs.find((i) => !i.disabled)
    const defaultValue = firstEnabled?.value ?? inputs[0]?.value ?? ''
    const current = values[type] ?? defaultValue
    if (!inputs.find((i) => i.value === current && !i.disabled))
        return defaultValue
    return current
}
export const resolveInputs = (
    section: SectionOptions,
    values: Record<string, string>,
): SectionInput[] =>
    typeof section.inputs === 'function'
        ? section.inputs(values)
        : section.inputs

export function resolveSections(
    sections: SectionOptions[],
    values: Record<string, string>,
): ResolvedSection[] {
    return sections.map((section) => {
        const inputs = resolveInputs(section, values)
        const checkedValue = resolveCheckedValue(section.type, values, inputs)
        return { options: section, inputs, checkedValue }
    })
}

function computeCascade(
    sections: SectionOptions[],
    prevValues: Record<string, string>,
    changedType: string,
    changedValue: string,
): { values: Record<string, string>; resolvedSections: ResolvedSection[] } {
    let values: Record<string, string> = {
        ...prevValues,
        [changedType]: changedValue,
    }

    for (const section of sections) {
        if (!section.dependsOn?.length) continue

        const depChanged = section.dependsOn.some(
            (dep) => values[dep] !== prevValues[dep],
        )

        if (!depChanged) continue

        const freshInputs = resolveInputs(section, values)
        const prevChecked = prevValues[section.type]
        const prevStillValid = freshInputs.find(
            (i) => i.value === prevChecked && !i.disabled,
        )

        if (!prevStillValid) {
            const firstEnabled = freshInputs.find((i) => !i.disabled)
            if (firstEnabled) {
                values = { ...values, [section.type]: firstEnabled.value }
            } else {
                const copy = { ...values }
                delete copy[section.type]
                values = copy
            }
        }
    }

    const resolvedSections = resolveSections(sections, values)

    return { values, resolvedSections }
}

interface SectionProps {
    options: SectionOptions
    inputs: SectionInput[]
    checkedValue: string
    stylePrefix: string
    dataAttributePrefix: string
    prefix: string
    id: string
}

const getCls = (prefix: string) => (className: string) =>
    `${prefix}__${className}`

function Section({
    options,
    inputs,
    checkedValue,
    stylePrefix,
    dataAttributePrefix,
    prefix,
    id,
}: SectionProps) {
    const {
        title = '',
        type,
        className = '',
        checked = true,
        inputType = 'radio',
    } = options

    const cls = getCls(stylePrefix)

    if (!inputs.length) return null

    return (
        <div
            class={cls('section')}
            {...{ [`data-${dataAttributePrefix}-section-type`]: type }}
        >
            {title && <h4 class={cls('section-title')}>{title}:</h4>}
            <div class={cls('section-row')}>
                {inputs.map((input, i) => (
                    <div
                        class={cls(`section-col ${className}`)}
                        key={input.value}
                    >
                        <input
                            checked={
                                checked ? checkedValue === input.value : false
                            }
                            name={`${prefix}-${id}-${type}`}
                            id={`${prefix}-${id}-${type}-${i}`}
                            type={inputType as string}
                            value={input.value}
                            disabled={input.disabled}
                        />
                        <label
                            for={`${prefix}-${id}-${type}-${i}`}
                            dangerouslySetInnerHTML={{ __html: input.label }}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}

function CalculatorForm({
    sections,
    initialSections,
    initialValues,
    stylePrefix,
    dataAttributePrefix,
    prefix,
    id,
    onValuesChange,
}: CalculatorFormProps) {
    const [resolvedSections, setResolvedSections] =
        useState<ResolvedSection[]>(initialSections)
    const [values, setValues] = useState<Record<string, string>>(initialValues)

    const handleChange = (e: Event): void => {
        const input = e.target as HTMLInputElement
        if (input.tagName !== 'INPUT') return

        const parts = input.name.split('-')
        const type = parts[parts.length - 1]

        const result = computeCascade(sections, values, type, input.value)

        setResolvedSections(result.resolvedSections)
        setValues(result.values)
        onValuesChange(result.values)
    }

    return (
        <form action="/" class={stylePrefix} onChange={handleChange}>
            {resolvedSections.map(({ options, inputs, checkedValue }) => (
                <Section
                    key={options.type}
                    options={options}
                    inputs={inputs}
                    checkedValue={checkedValue}
                    stylePrefix={stylePrefix}
                    dataAttributePrefix={dataAttributePrefix}
                    prefix={prefix}
                    id={id}
                />
            ))}
        </form>
    )
}

export function renderCalculatorForm(
    container: HTMLElement,
    props: CalculatorFormProps,
): void {
    render(<CalculatorForm {...props} />, container)
}

export function unmountCalculatorForm(container: HTMLElement): void {
    render(null, container)
}
