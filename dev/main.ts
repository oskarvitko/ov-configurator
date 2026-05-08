import './style.css'
import { Calculator, initConfigurator } from '../src/index'
import type { DataSource } from '../src/index'

// ── Tab switching ──────────────────────────────────────────────────────────────

const tabBtns = document.querySelectorAll<HTMLButtonElement>('[data-tab-btn]')
const tabPanels = document.querySelectorAll<HTMLElement>('[data-tab]')

tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.tabBtn!
        tabBtns.forEach((b) => b.classList.toggle('tab-btn--active', b === btn))
        tabPanels.forEach((panel) =>
            panel.classList.toggle('hidden', panel.dataset.tab !== target),
        )
    })
})

// ── Demo 1: Calculator (raw) ───────────────────────────────────────────────────
//
// Demonstrates direct usage of Calculator:
// — sections are defined via sectionsOptions
// — fields are calculated via addField / calculateFunction

interface GreenhouseData {
    sizes: Array<{ label: string; value: string; basePrice: number }>
    materialMultipliers: Record<string, number>
}

const calcData: GreenhouseData = {
    sizes: [
        { label: '3×4 m', value: '3x4', basePrice: 38_000 },
        { label: '3×6 m', value: '3x6', basePrice: 55_000 },
        { label: '4×8 m', value: '4x8', basePrice: 90_000 },
    ],
    materialMultipliers: {
        polycarbonate: 1.0,
        aluminum: 1.25,
        steel: 1.5,
    },
}

const calculator = new Calculator<GreenhouseData>({
    id: 'greenhouse',
    parentSelector: '#calc-parent',
    data: calcData,
    dataAttributePrefix: 'calc',
    stylePrefix: 'calculator',
    sectionsOptions: [
        {
            title: 'Size',
            type: 'size',
            inputs: calcData.sizes.map((s) => ({
                label: '<b>LOL</b>',
                value: s.value,
                disabled: s.value === '3x6',
            })),
        },
        {
            title: 'Material',
            type: 'material',
            inputs: [
                { label: 'Polycarbonate', value: 'polycarbonate' },
                { label: 'Aluminum', value: 'aluminum' },
                { label: 'Steel', value: 'steel' },
            ],
        },
    ],
})

calculator.addField({
    selector: 'price',
    calculateFunction(values, data) {
        const sizeRec = data.sizes.find(
            (s) => s.value === (values.size ?? '3x4'),
        )
        const base = sizeRec?.basePrice ?? 0
        const multiplier =
            data.materialMultipliers[values.material ?? 'polycarbonate'] ?? 1
        return Math.round(base * multiplier)
    },
})

calculator.addField({
    selector: 'old-price',
    calculateFunction() {
        const raw = String(calculator.getValue('price')).replace(/[^0-9.]/g, '')
        const price = Number(raw)
        return Math.round(price / 0.8)
    },
})

const formPlace = document.getElementById('calc-form')!
calculator.render(formPlace)

// ── Demo 2: Configurator (data-driven) ────────────────────────────────────────
//
// Demonstrates initConfigurator:
// — config (sections, getPrice) lives in [data-configurator-options] inline in HTML
// — data is passed as DataSource from outside

const configuratorData = {
    'product-1': {
        basePrice: 45_000,
        sizes: ['3x4', '3x6', '4x8'],
        coverings: ['polycarbonate', 'glass'],
        sizePrices: { '3x4': 0, '3x6': 15_000, '4x8': 38_000 },
        coveringPrices: { polycarbonate: 0, glass: 12_000 },
        nested: {
            '3x4': {
                polycarbonate: {
                    white: 20000,
                    black: 15000,
                },
                aluminum: 55_000,
                steel: 90_000,
            },
            '3x6': {
                solvation: 38_000,
                aluminum: 55_000,
                luterion: 90_000,
            },
        },
    },
} as unknown as DataSource

const configuratorEl = document.querySelector<HTMLElement>(
    '[data-calc-id="product-1"]',
)!

initConfigurator(configuratorData, configuratorEl, {
    calcPlaceSelector: (id) => `[data-calc-place="${id}"]`,
})
