# Project Structure

## File tree

```
/
├── index.html          — single HTML entry point
├── css/
│   └── style.css       — all styles (light mode, dark mode, components, utilities)
├── js/
│   └── script.js       — all application logic
└── .kiro/
    └── steering/       — Kiro steering documents
```

The project is intentionally flat. Do not add folders, split files, or introduce a `src/` directory.

## index.html responsibilities

- Declares the full DOM structure — every section, form field, button, and container
- Links `css/style.css` in `<head>`
- Loads the Chart.js CDN script **before** `js/script.js` at the bottom of `<body>`
- Contains **no inline styles** and **no inline scripts**
- Uses semantic HTML5 elements (`<header>`, `<main>`, `<section>`, `<footer>`, `<form>`)
- Every interactive element has an `aria-label` or associated `<label>`; live regions use `aria-live="polite"`

### Key IDs JavaScript depends on

| ID | Element | Purpose |
|---|---|---|
| `total-balance` | `<p>` | Balance display |
| `transaction-form` | `<form>` | Form submission target |
| `item-name` | `<input>` | Transaction name field |
| `amount` | `<input>` | Amount field |
| `category` | `<select>` | Category picker |
| `custom-category-group` | `<div>` | Wrapper shown/hidden for custom category |
| `custom-category` | `<input>` | Custom category text field |
| `transaction-list` | `<ul>` | Rendered transaction items |
| `no-transactions-msg` | `<p>` | Empty-state message |
| `spending-chart` | `<canvas>` | Chart.js render target |
| `chart-legend` | `<ul>` | Custom chart legend |
| `theme-toggle` | `<button>` | Dark/light mode toggle |

### Key classes JavaScript depends on

| Class | Used on | Purpose |
|---|---|---|
| `.btn-sort` | `<button>` | Sort buttons (selected via `querySelectorAll`) |
| `.sort-arrow` | `<span>` inside `.btn-sort` | Arrow indicator text (↑ / ↓) |
| `.theme-icon` | `<span>` inside `#theme-toggle` | Emoji icon (🌙 / ☀️) |

## css/style.css responsibilities

- **All** visual styles for the project live here — no exceptions
- Organised into clearly commented sections (see below)
- Uses CSS custom properties defined in `:root` for every colour, radius, shadow, and transition
- Dark mode is a single `[data-theme="dark"]` override block that reassigns variables only — no duplicated rules
- Never use `!important` except for `.input-error` border/shadow overrides (validation state must win over base styles)

### Section order in style.css

1. CSS Custom Properties — `:root` (light mode defaults)
2. Dark mode overrides — `[data-theme="dark"]`
3. Reset & Base
4. Layout
5. Header (includes `.btn-theme-toggle`)
6. Card base (shared section styles)
7. Balance Card
8. Transaction Form
9. Transaction List (includes sort controls, scrollbar, items, delete button, empty state, validation errors)
10. Chart Section (canvas, legend)
11. Footer
12. Responsive (`@media (min-width: 520px)`)

## js/script.js responsibilities

- **All** application logic lives here — no exceptions
- Uses `'use strict'` at the top
- Organised into clearly commented sections (see below)
- DOM references are declared once at the top as `const` — never query the DOM inside render functions
- Application state (`transactions`, `sortState`) is module-level `let` — no globals beyond what is declared at the top of the file

### Section order in script.js

1. Constants (`STORAGE_KEY`, `THEME_STORAGE_KEY`, `CATEGORY_COLORS`, `CUSTOM_COLOR_PALETTE`, `DEFAULT_CATEGORIES`)
2. DOM References
3. State (`transactions`, `sortState`)
4. Theme (`applyTheme`, `toggleTheme`, `loadTheme`)
5. Persistence (`loadTransactions`, `saveTransactions`)
6. Sorting (`getSortedTransactions`, `handleSortClick`, `updateSortButtons`)
7. Rendering (`formatCurrency`, `renderBalance`, `createTransactionElement`, `renderTransactionList`)
8. Pie Chart — Chart.js (`getCategoryTotals`, `getCategoryColor`, `initChart`, `renderLegend`, `renderChart`)
9. Full UI Refresh (`renderAll`)
10. Actions (`addTransaction`, `deleteTransaction`)
11. Form Handling (`showFieldError`, `clearFieldError`, `clearAllErrors`, `handleSubmit`)
12. Event Listeners
13. Initialise (`loadTheme()` → `initChart()` → `renderAll()`)

### State update pattern

Every user action follows the same flow:

```
user action → mutate state → saveTransactions() → renderAll()
```

`renderAll()` always calls `renderBalance()`, `renderTransactionList()`, and `renderChart()` together. Never call individual render functions from event handlers — always go through `renderAll()` or the specific render function that matches the scope of the change (e.g. `renderTransactionList()` for sort-only updates).

### Category colour rules

- Default categories (`Food`, `Transport`, `Fun`) have fixed hex colours in `CATEGORY_COLORS`.
- Custom categories are assigned a colour from `CUSTOM_COLOR_PALETTE` based on their insertion order among custom categories in the current `transactions` array.
- `getCategoryColor(category)` is the single source of truth — always use it; never hardcode colours for categories outside of the two constant objects.
