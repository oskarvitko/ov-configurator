# ov-cart

Universal frontend shopping cart module. Exports `createCart(options)`.

## Installation

```bash
npm install ov-cart
```

## CDN

No build step required — include directly via [jsDelivr](https://www.jsdelivr.com/) or [unpkg](https://unpkg.com/):

```html
<script src="https://cdn.jsdelivr.net/npm/ov-cart/dist/ov-cart.iife.js"></script>
<script>
    const cart = OvCart.createCart({ element: '#cart', currency: '$' })
</script>
```

The IIFE bundle exposes a global `OvCart` with `createCart` and `Cart`.

## Usage

```ts
import { createCart } from 'ov-cart'

const cart = createCart({
    element: '#my-cart',
    currency: '$',
    storageKey: 'shop-cart',
    attr: 'mycart',             // uses data-mycart-* instead of data-cart-*
    classes: {
        countButton: 'btn btn-sm',
    },
    onUpdate(state) {
        // state: { products, productsCount, totalSum, count, isEmpty }
        if (state.isEmpty) MicroModal.close('modal-cart')
    },
})

if (window.clearCart) cart.clear()
```

## Multiple carts on the same page

Each `createCart()` call is an independent instance. When using multiple carts on a page, assign different `attr` values (and `storageKey` if separate storage is needed).

```ts
const cartA = createCart({ element: '#cart-a', attr: 'cart-a', storageKey: 'cart-a' })
const cartB = createCart({ element: '#cart-b', attr: 'cart-b', storageKey: 'cart-b' })
```

## Options

| option | type | default | description |
|---|---|---|---|
| `element` | `string \| Element` | `'#cart'` | cart render container |
| `icon` | `string \| Element \| null` | `'#cart-icon'` | icon element with counter and total |
| `currency` | `string` | `'zł'` | currency symbol |
| `storageKey` | `string` | `'cart'` | `localStorage` key |
| `attr` | `string` | `'cart'` | data-attribute prefix (`'cart'` → `data-cart-*`) |
| `shouldAnimateIconSum` | `function(state, trigger)` | `() => true` | controls whether the icon sum animation plays |
| `renderItem` | `function(id, product, count, currency)` | built-in template | returns HTML string for a single cart item |
| `renderFooter` | `function(total, currency)` | built-in template | returns HTML string for the cart footer |
| `onUpdate` | `function(state)` | `null` | called after every cart change |
| `validateCart` | `function(products)` | `null` | called on init after loading from `localStorage`; receives and returns `CartProductEntry[]` — use to filter out stale items |
| `classes` | `object` | Tailwind classes | partial override of CSS classes (unset keys fall back to defaults) |
| `text` | `object` | see below | partial override of text strings |

## Default CSS classes (`classes`)

| key | description |
|---|---|
| `list` | `<ul>` product list |
| `item` | `<li>` product row |
| `itemInner` | inner wrapper (flex container) |
| `itemContent` | block with title and description |
| `itemTitle` | product title |
| `itemDescription` | product description |
| `itemImage` | product image |
| `itemPriceBox` | price block |
| `itemPriceHidden` | hidden `<span>` with price (for form submission) |
| `controls` | +/− button group |
| `countButton` | +/− buttons |
| `countSpan` | `<span>` with item count |
| `removeButton` | remove item button |
| `footer` | cart total block |
| `iconHidden` | class applied to hide the cart icon |
| `iconSumVisible` | class applied to animate the icon sum |

## Default text (`text`)

| key | default | description |
|---|---|---|
| `sumLabel` | `'Total:'` | label before the total sum |
| `orderInputName` | `'order-sum'` | `name` attribute of the hidden order sum input |
| `addButton` | `'+'` | increment button text |
| `removeButton` | `'−'` | decrement button text |
| `clearButton` | `'✕'` | remove item button text |

### `shouldAnimateIconSum(state, trigger)`

Called before the icon sum animation. Return `false` to suppress the animation. Not called on initial render.

- `state` — current cart state `{ products, productsCount, totalSum, count, isEmpty }`
- `trigger` — the `<button>` element that triggered the change

```ts
shouldAnimateIconSum: () => true
```

### `validateCart(products)`

Called once on initialization, after restoring the cart from `localStorage`. Receives and must return a `CartProductEntry[]` array (`CartProduct & { id: string }`). Use it to filter or update stale products. The result is saved back to `localStorage`.

```ts
validateCart(products) {
    const validIds = new Set(['sku-1', 'sku-3'])
    return products.filter(p => validIds.has(p.id))
}
```

## Data attributes

By default the prefix is `data-cart-`. With `attr: 'mycart'` it becomes `data-mycart-`.

**Buttons:**
- `data-cart-action="add"` — increment item
- `data-cart-action="remove"` — decrement item
- `data-cart-action="clear"` — remove item from cart

**Item container:**
- `data-cart-item="<id>"` — product identifier

**Item parameters** (on descendants of `data-cart-item`):
- `data-cart-item-title` — name (attribute value, or `"self"` to use `textContent`)
- `data-cart-item-price` — price
- `data-cart-item-image` — image URL
- `data-cart-item-description` — description (multiline, separated by `\n`)
- `data-cart-item-params` — additional parameters

**Icon** (`icon`):
- `data-cart-icon-count` — element displaying item count
- `data-cart-icon-sum` — element displaying the total (must contain a `<span>`)

> All attributes use the prefix from the `attr` option. With `attr: 'mycart'` → `data-mycart-action`, `data-mycart-item`, `data-mycart-icon-count`, etc.


```js
import { createCart } from '../../libs/cart/cart.js'

const cart = createCart({
    element: '#my-cart',
    currency: '₽',
    storageKey: 'shop-cart',
    attr: 'mycart',             // data-mycart-* вместо data-cart-*
    classes: {
        countButton: 'btn btn-sm',
    },
    onUpdate(state) {
        // state: { products, productsCount, totalSum, count, isEmpty }
        if (state.isEmpty) MicroModal.close('modal-cart')
    },
})

if (window.clearCart) cart.clear()
```

