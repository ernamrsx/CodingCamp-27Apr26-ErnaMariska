# Product Overview

## What this project is

A mobile-friendly, client-side Expense & Budget Visualizer. Users log spending transactions, track a running total balance, and see a live doughnut chart of spending broken down by category. Everything runs in the browser — there is no backend, no build step, and no framework.

## Target user

Anyone who wants a lightweight, zero-signup way to track daily expenses directly in their browser on a phone or desktop.

## Core features

| Feature | Description |
|---|---|
| Balance card | Displays the running total of all transaction amounts |
| Transaction form | Accepts item name, amount, and category (Food / Transport / Fun / custom) |
| Transaction list | Scrollable history, sortable by amount or category (asc / desc), newest-first by default |
| Doughnut chart | Live Chart.js chart showing spending distribution per category |
| Custom categories | Users can type any category name; it gets an auto-assigned colour from a palette |
| Dark / light mode | Header toggle button; preference persists across sessions |
| localStorage persistence | All transactions and the theme preference survive page refresh |

## Non-goals

- No user accounts or authentication
- No server-side storage or API calls
- No multi-currency support
- No income tracking (expenses only)
- No date filtering or date-based grouping

## Constraints that must never be broken

- No React, Vue, Angular, or any other UI framework
- No backend or server-side code of any kind
- No build tools (webpack, Vite, Rollup, Parcel, etc.)
- No inline CSS in HTML
- No inline JavaScript in HTML
- No runtime `<style>` injection from JavaScript — all styles live in `css/style.css`
- Chart.js is the only permitted third-party library; it must stay pinned to `4.4.3`
