# Technology Stack

## Languages & runtimes

| Layer | Technology | Notes |
|---|---|---|
| Markup | HTML5 | Semantic elements, `novalidate` on forms, `aria-*` attributes throughout |
| Styles | CSS3 | Custom properties (variables), no preprocessors |
| Logic | Vanilla JavaScript (ES2020) | `'use strict'` mode, no transpilation |

## Third-party libraries

| Library | Version | How it is loaded |
|---|---|---|
| Chart.js | 4.4.3 (pinned) | CDN — `https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js` |

No other third-party libraries are permitted. Do not add npm packages, CDN scripts, or any other external dependencies without explicit approval.

## Browser APIs in use

| API | Purpose |
|---|---|
| `localStorage` | Persisting transactions (`budget_visualizer_transactions`) and theme preference (`budget_visualizer_theme`) |
| `Canvas 2D` (via Chart.js) | Rendering the doughnut chart on `<canvas id="spending-chart">` |
| `Intl.NumberFormat` (via `toLocaleString`) | Formatting amounts as USD currency strings |

## Theming system

Dark / light mode is driven entirely by CSS custom properties. JavaScript toggles `data-theme="dark"` on the `<html>` element; the `[data-theme="dark"]` block in `style.css` overrides the relevant variables. No theme-related styles are written in JavaScript.

## Chart integration rules

- One singleton `Chart` instance (`spendingChart`) is created once in `initChart()` at page load.
- All subsequent updates use `spendingChart.data.datasets[0].data = ...` followed by `spendingChart.update()` — never destroy and recreate the instance.
- When switching themes, use `spendingChart.update('none')` to skip animation and instantly swap the donut border colour.
- Chart.js's built-in legend is disabled (`display: false`); a custom accessible `<ul id="chart-legend">` is rendered by `renderLegend()` instead.

## localStorage schema

```json
// Key: "budget_visualizer_transactions"
// Value: JSON array of transaction objects
[
  {
    "id": "txn_<timestamp>_<random>",
    "name": "string",
    "amount": 12.50,
    "category": "string"
  }
]

// Key: "budget_visualizer_theme"
// Value: "light" | "dark"
```

Both keys are read with a `try/catch` fallback to an empty array / `"light"` respectively, so a corrupted store never breaks the app.
