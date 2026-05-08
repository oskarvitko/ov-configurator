# ov-configurator

Universal frontend product configurator module. Exports `Calculator` and `initConfigurator`.

The package ships two complementary tools:

- **`Calculator`** — a low-level class that renders a form, tracks selected values and computes derived fields (price, labels, etc.). Configure everything in JS.
- **`initConfigurator`** — a higher-level helper that reads an inline JS config from the DOM (`[data-configurator-options]`) and builds a fully wired `Calculator` for a product element. Designed for server-rendered pages where the config lives in HTML.

## Installation

```bash
npm install ov-configurator
```

## CDN

No build step required — include directly via [jsDelivr](https://www.jsdelivr.com/) or [unpkg](https://unpkg.com/):

```html
<script src="https://cdn.jsdelivr.net/npm/ov-configurator/dist/ov-configurator.iife.js"></script>
<script>
    const { Calculator, initConfigurator } = OvConfiurator
</script>
```

The IIFE bundle exposes a global `OvConfiurator` with `Calculator` and `initConfigurator`.

---

## Calculator

Renders a `<form>` with radio/checkbox sections and recomputes fields on every change.

### Basic usage

```ts
import { Calculator } from 'ov-configurator'

interface ProductData {
    sizes: Array<{ label: string; value: string; price: number }>
}

const calc = new Calculator<ProductData>({
    id: 'my-product',
    parentSelector: '#product-card',
    data: { sizes: [{ label: 'S', value: 's', price: 100 }] },
    sectionsOptions: [
        {
            title: 'Size',
            type: 'size',
            inputs: [{ label: 'S', value: 's' }],
        },
    ],
})

calc.addField({
    selector: 'price',
    calculateFunction(values, data) {
        return data.sizes.find(s => s.value === values.size)?.price ?? 0
    },
})

calc.renderInNode(document.getElementById('form-place')!)
calc.init()
```

The form is rendered into the given node. On each `change` event all fields are recomputed and written to matching `[data-calc="<selector>"]` elements inside `parentSelector`.

### `CalculatorOptions`

| option | type | default | description |
|---|---|---|---|
| `id` | `string` | — | unique identifier for the instance |
| `parentSelector` | `string` | — | CSS selector of the container element |
| `data` | `TData \| null` | `null` | arbitrary data object passed to `calculateFunction` |
| `editableFields` | `FieldOptions[]` | `[]` | fields to register on construction |
| `sectionsOptions` | `SectionOptions[]` | `[]` | sections to render in the form |
| `prefix` | `string` | `'card'` | input name prefix (`{prefix}-{id}-{type}`) |
| `stylePrefix` | `string` | `'calculator'` | BEM block name for generated HTML |
| `dataAttributePrefix` | `string` | `'calc'` | prefix for `data-{prefix}="<selector>"` attributes |

### `FieldOptions`

| option | type | default | description |
|---|---|---|---|
| `selector` | `string` | — | matches `data-{dataAttributePrefix}="<selector>"` in the DOM |
| `calculateFunction` | `(values, data) => unknown` | `() => null` | returns the new value; `null` is ignored |
| `attribute` | `boolean` | `false` | write value as an attribute instead of `innerHTML` (reads `data-calc-attribute` from the node) |
| `animated` | `boolean` | `false` | animate block on value change (requires Animate.css) |
| `animatedNode` | `'parent' \| 'self' \| 'closest'` | `'parent'` | which node to animate |
| `animatedNodeSelector` | `string` | — | selector for `closest()` when `animatedNode='closest'` |
| `animation` | `string[]` | `['animate__faster', 'animate__pulse']` | Animate.css classes |
| `duration` | `number` | `800` | number animation duration (ms) |
| `dots` | `number` | `0` | decimal places for number animation |

### `SectionOptions`

| option | type | default | description |
|---|---|---|---|
| `type` | `string` | — | key used in `values` object and input `name` |
| `title` | `string` | — | section heading |
| `inputs` | `SectionInput[] \| (data) => SectionInput[]` | — | static list or factory function |
| `className` | `string` | `''` | extra class on each `.{stylePrefix}__section-col` |
| `checked` | `boolean` | `true` | pre-select first matching value |
| `inputType` | `string` | `'radio'` | input type (`'radio'` or `'checkbox'`) |

### Instance methods

| method | description |
|---|---|
| `addField(options)` | register a new field |
| `addSection(options)` | add a section to the form |
| `init()` | attach DOM nodes to fields and wire the `change` listener |
| `renderInNode(node)` | write generated HTML into `node` and store a reference |
| `refresh()` | re-render HTML and re-init (use when inputs change dynamically) |
| `getValues()` | return current `{ [type]: value }` map |
| `getValue(key)` | return the last saved value for a field `selector` |
| `saveValue(key, value)` | manually persist a value accessible via `getValue` |

---

## initConfigurator

Higher-level helper for server-rendered pages. Reads the config from an inline `<script type="text/plain" data-configurator-options>` element, receives product data externally, and builds a `Calculator` with standard fields (`price`, `old-price`, `params`, per-section value/view fields, and mirrored attribute fields).

### HTML structure

```html
<div data-calc-id="product-a">
    <!-- output fields -->
    <span data-calc="price"></span>
    <span data-calc="old-price"></span>
    <span data-calc="params"></span>

    <!-- Calculator renders the form here -->
    <div data-calc-place="product-a"></div>

    <!-- inline config (JS object syntax, functions allowed) -->
    <script type="text/plain" data-configurator-options>
    {
        oldPricePercent: 20,
        getPrice: function(values, item) {
            return item.basePrice + (item.sizePrices[values.size] || 0)
        },
        sections: [
            {
                key: 'size',
                title: 'Size',
                path: '$.sizes[*]',
                postfix: ' m'
            }
        ]
    }
    </script>
</div>
```

### JS initialization

```ts
import { initConfigurator } from 'ov-configurator'
import type { DataSource } from 'ov-configurator'

const data: DataSource = {
    'product-a': {
        basePrice: 45_000,
        sizes: ['3x4', '3x6'],
        sizePrices: { '3x4': 0, '3x6': 15_000 },
    },
}

document.querySelectorAll<HTMLElement>('[data-calc-id]').forEach((el) => {
    initConfigurator(data, el)
})
```

`initConfigurator` is also exported as `Configurator` (alias).

### `ConfiguratorOptions` (inline config object)

| key | type | description |
|---|---|---|
| `getPrice` | `(values, item, id) => number` | returns the current price |
| `oldPricePercent` | `number` | discount % — old price = `price / ((100 - n) / 100)` |
| `sections` | `ConfiguratorSection[]` | sections to build |
| `fields` | `ConfiguratorField[]` | optional extra fields |

### `ConfiguratorSection`

| key | type | description |
|---|---|---|
| `key` | `string` | field selector and value key in `values` |
| `title` | `string` | section heading |
| `path` | `string` | JSONPath / pipe expression to extract inputs from item data |
| `postfix` | `string` | suffix appended to values in labels and `params` |
| `inputs` | `SectionInput[]` | static inputs list (overrides `path`) |
| `labelMapping` | `Record<string, string>` | map raw values to display labels |
| `selectorDisplay` | `(selected, sectionData) => string` | custom display for the `*-view` field |

### Built-in fields registered by `initConfigurator`

For each `section` with key `k` the following `data-calc` targets are populated:

| selector | content |
|---|---|
| `price` | result of `getPrice` |
| `old-price` | price before discount |
| `params` | space-joined `value + postfix` for every section |
| `params-view` | newline-joined `title: value + postfix` |
| `k` | selected raw value |
| `k-view` | display label (via `labelMapping` / `selectorDisplay`) |
| `price` *(attr)* | same value written as an HTML attribute |
| `old-price` *(attr)* | same |
| `k` *(attr)* | same |

### `queryByPath`

Utility used internally by `initConfigurator` to traverse item data. Available as a named export for advanced custom fields.

```ts
import { queryByPath } from 'ov-configurator'

// JSONPath
queryByPath(data, '$.sizes[*]')

// chained operations
queryByPath(data, '$.variants > $first')

// fallback chain
queryByPath(data, '$.primary || $.fallback')

// save/get across operations
queryByPath(data, '$save:key > $.next')
```

Supported special operations: `$root`, `$first`, `$last`, `$save:<key>`, `$get:<key>`, any JSONPath expression.

