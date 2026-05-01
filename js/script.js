/* ============================================================
   Expense & Budget Visualizer — script.js
   ============================================================ */

'use strict';

// ── Constants ────────────────────────────────────────────────
const STORAGE_KEY       = 'budget_visualizer_transactions';
const THEME_STORAGE_KEY = 'budget_visualizer_theme';

/** Matches the CSS custom-property colours for each category. */
const CATEGORY_COLORS = {
  Food:      '#f59e0b',
  Transport: '#3b82f6',
  Fun:       '#ec4899',
};

/**
 * Palette of colours auto-assigned to custom categories.
 * Cycles through when more than the palette length are created.
 */
const CUSTOM_COLOR_PALETTE = [
  '#10b981', '#8b5cf6', '#ef4444', '#06b6d4',
  '#f97316', '#84cc16', '#e879f9', '#14b8a6',
];

const DEFAULT_CATEGORIES = Object.keys(CATEGORY_COLORS);

// ── DOM References ───────────────────────────────────────────
const form                = document.getElementById('transaction-form');
const inputName           = document.getElementById('item-name');
const inputAmount         = document.getElementById('amount');
const inputCategory       = document.getElementById('category');
const customCategoryGroup = document.getElementById('custom-category-group');
const inputCustomCategory = document.getElementById('custom-category');
const totalBalanceEl      = document.getElementById('total-balance');
const transactionList     = document.getElementById('transaction-list');
const noTransactionsMsg   = document.getElementById('no-transactions-msg');
const chartCanvas         = document.getElementById('spending-chart');
const chartLegend         = document.getElementById('chart-legend');
const sortButtons         = document.querySelectorAll('.btn-sort');
const themeToggleBtn      = document.getElementById('theme-toggle');

// ── State ────────────────────────────────────────────────────

/** @type {Array<{id: string, name: string, amount: number, category: string}>} */
let transactions = loadTransactions();

/**
 * Sort state.
 * - field: 'none' | 'amount' | 'category'
 * - direction: 'asc' | 'desc'
 */
let sortState = { field: 'none', direction: 'asc' };

// ── Theme ────────────────────────────────────────────────────

/**
 * Apply a theme to the document and update the toggle button label/icon.
 * @param {'light'|'dark'} theme
 */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : '';

  const isDark = theme === 'dark';
  themeToggleBtn.querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
  themeToggleBtn.setAttribute(
    'aria-label',
    isDark ? 'Switch to light mode' : 'Switch to dark mode'
  );

  // Keep the chart's donut border in sync with the surface colour
  if (spendingChart) {
    const borderColor = isDark ? '#1c1f2e' : '#ffffff';
    spendingChart.data.datasets[0].borderColor = borderColor;
    spendingChart.update('none'); // 'none' skips animation for instant colour swap
  }
}

/** Toggle between light and dark, then persist the choice. */
function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_STORAGE_KEY, next);
}

/** Load the saved theme preference (falls back to light). */
function loadTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  applyTheme(saved);
}

// ── Persistence ──────────────────────────────────────────────

/** Load transactions from localStorage, returning an empty array on failure. */
function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Persist the current transactions array to localStorage. */
function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

// ── Sorting ──────────────────────────────────────────────────

/**
 * Return a sorted copy of transactions based on the current sortState.
 * When field is 'none', returns newest-first (default order).
 *
 * @returns {Array}
 */
function getSortedTransactions() {
  const copy = [...transactions];

  if (sortState.field === 'none') {
    // Default: newest first
    return copy.reverse();
  }

  copy.sort((a, b) => {
    let comparison = 0;

    if (sortState.field === 'amount') {
      comparison = a.amount - b.amount;
    } else if (sortState.field === 'category') {
      comparison = a.category.localeCompare(b.category);
    }

    return sortState.direction === 'asc' ? comparison : -comparison;
  });

  return copy;
}

/**
 * Update sort state when a sort button is clicked.
 * Clicking the active button toggles direction; clicking a new button
 * sets it as active with ascending direction.
 *
 * @param {string} field - 'amount' | 'category'
 */
function handleSortClick(field) {
  if (sortState.field === field) {
    // Toggle direction
    sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.field = field;
    sortState.direction = 'asc';
  }

  updateSortButtons();
  renderTransactionList();
}

/** Sync the visual state of all sort buttons to sortState. */
function updateSortButtons() {
  sortButtons.forEach((btn) => {
    const field = btn.dataset.sort;
    const arrow = btn.querySelector('.sort-arrow');
    const isActive = sortState.field === field;

    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));

    if (isActive) {
      arrow.textContent = sortState.direction === 'asc' ? '↑' : '↓';
    } else {
      arrow.textContent = '';
    }
  });
}

// ── Rendering ────────────────────────────────────────────────

/** Format a number as a USD currency string. */
function formatCurrency(value) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/** Re-render the total balance display. */
function renderBalance() {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  totalBalanceEl.textContent = formatCurrency(total);
}

/**
 * Build and return a single transaction <li> element.
 *
 * @param {{id: string, name: string, amount: number, category: string}} transaction
 * @returns {HTMLLIElement}
 */
function createTransactionElement(transaction) {
  const li = document.createElement('li');
  li.className = 'transaction-item';
  li.dataset.id = transaction.id;
  li.dataset.category = transaction.category;

  // Info block
  const info = document.createElement('div');
  info.className = 'item-info';

  const nameEl = document.createElement('span');
  nameEl.className = 'item-name';
  nameEl.textContent = transaction.name;

  const categoryEl = document.createElement('span');
  categoryEl.className = 'item-category';
  categoryEl.textContent = transaction.category;

  info.appendChild(nameEl);
  info.appendChild(categoryEl);

  // Amount
  const amountEl = document.createElement('span');
  amountEl.className = 'item-amount';
  amountEl.textContent = `−${formatCurrency(transaction.amount)}`;

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-delete';
  deleteBtn.type = 'button';
  deleteBtn.setAttribute('aria-label', `Delete ${transaction.name}`);
  deleteBtn.textContent = '✕';
  deleteBtn.addEventListener('click', () => deleteTransaction(transaction.id));

  li.appendChild(info);
  li.appendChild(amountEl);
  li.appendChild(deleteBtn);

  return li;
}

/** Re-render the full transaction list from state. */
function renderTransactionList() {
  transactionList.innerHTML = '';

  if (transactions.length === 0) {
    noTransactionsMsg.style.display = 'block';
    return;
  }

  noTransactionsMsg.style.display = 'none';

  getSortedTransactions().forEach((t) => {
    transactionList.appendChild(createTransactionElement(t));
  });
}

// ── Pie Chart (Chart.js) ─────────────────────────────────────

/**
 * Aggregate spending totals per category.
 * @returns {Object.<string, number>}
 */
function getCategoryTotals() {
  return transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});
}

/**
 * Singleton Chart.js instance.
 * Initialised once in initChart(); updated in place on every renderChart() call.
 * @type {import('chart.js').Chart|null}
 */
let spendingChart = null;

/**
 * Resolve the colour for any category — default or custom.
 * Custom categories get a colour from CUSTOM_COLOR_PALETTE, assigned
 * deterministically by their position among custom categories.
 *
 * @param {string} category
 * @returns {string} hex colour
 */
function getCategoryColor(category) {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];

  // Assign a palette colour based on insertion order of custom categories
  const customCategories = [...new Set(
    transactions
      .map((t) => t.category)
      .filter((c) => !DEFAULT_CATEGORIES.includes(c))
  )];
  const index = customCategories.indexOf(category);
  return CUSTOM_COLOR_PALETTE[index % CUSTOM_COLOR_PALETTE.length] || '#94a3b8';
}

/**
 * Create the Chart.js doughnut instance.
 * Called once on page load — subsequent updates go through renderChart().
 */
function initChart() {
  const ctx = chartCanvas.getContext('2d');

  spendingChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [],
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '55%',
      animation: {
        animateRotate: true,
        duration: 400,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label(context) {
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
              return ` ${formatCurrency(value)}  (${percent}%)`;
            },
          },
        },
      },
    },
  });
}

/** Re-render the custom legend list below the chart. */
function renderLegend(totals) {
  chartLegend.innerHTML = '';

  const grandTotal = Object.values(totals).reduce((sum, v) => sum + v, 0);

  Object.entries(totals).forEach(([category, value]) => {
    if (value === 0) return;

    const percent = grandTotal > 0
      ? ((value / grandTotal) * 100).toFixed(1)
      : '0.0';

    const li = document.createElement('li');
    li.className = 'legend-item';

    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.backgroundColor = getCategoryColor(category);
    swatch.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'legend-label';
    label.textContent = category;

    const valueEl = document.createElement('span');
    valueEl.className = 'legend-value';
    valueEl.textContent = formatCurrency(value);

    const percentEl = document.createElement('span');
    percentEl.className = 'legend-percent';
    percentEl.textContent = `${percent}%`;

    li.appendChild(swatch);
    li.appendChild(label);
    li.appendChild(valueEl);
    li.appendChild(percentEl);
    chartLegend.appendChild(li);
  });
}

/**
 * Push fresh data into the existing Chart.js instance and re-render the legend.
 * Rebuilds labels/colours dynamically to support custom categories.
 */
function renderChart() {
  const totals = getCategoryTotals();
  const activeCategories = Object.keys(totals).filter((c) => totals[c] > 0);

  spendingChart.data.labels = activeCategories;
  spendingChart.data.datasets[0].data = activeCategories.map((c) => totals[c]);
  spendingChart.data.datasets[0].backgroundColor = activeCategories.map(getCategoryColor);
  spendingChart.update();

  renderLegend(totals);
}

// ── Full UI Refresh ──────────────────────────────────────────

/** Re-render every UI component from the current state. */
function renderAll() {
  renderBalance();
  renderTransactionList();
  renderChart();
}

// ── Actions ──────────────────────────────────────────────────

/**
 * Add a new transaction to state, persist, and refresh the UI.
 *
 * @param {string} name
 * @param {number} amount
 * @param {string} category
 */
function addTransaction(name, amount, category) {
  const transaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    amount,
    category,
  };

  transactions.push(transaction);
  saveTransactions();
  renderAll();
}

/**
 * Remove a transaction by ID, persist, and refresh the UI.
 *
 * @param {string} id
 */
function deleteTransaction(id) {
  transactions = transactions.filter((t) => t.id !== id);
  saveTransactions();
  renderAll();
}

// ── Form Handling ────────────────────────────────────────────

/** Show an inline error message below a field. */
function showFieldError(inputEl, message) {
  // Remove any existing error for this field
  clearFieldError(inputEl);

  inputEl.setAttribute('aria-invalid', 'true');
  inputEl.classList.add('input-error');

  const errorEl = document.createElement('p');
  errorEl.className = 'field-error';
  errorEl.id = `${inputEl.id}-error`;
  errorEl.textContent = message;
  errorEl.setAttribute('role', 'alert');

  inputEl.setAttribute('aria-describedby', errorEl.id);
  inputEl.parentNode.appendChild(errorEl);
}

/** Remove the inline error message for a field. */
function clearFieldError(inputEl) {
  inputEl.removeAttribute('aria-invalid');
  inputEl.classList.remove('input-error');
  inputEl.removeAttribute('aria-describedby');

  const existing = inputEl.parentNode.querySelector('.field-error');
  if (existing) existing.remove();
}

/** Clear all field errors in the form. */
function clearAllErrors() {
  [inputName, inputAmount, inputCategory].forEach(clearFieldError);
}

/** Handle form submission. */
function handleSubmit(event) {
  event.preventDefault();
  clearAllErrors();

  const name      = inputName.value;
  const amountRaw = inputAmount.value;
  const selected  = inputCategory.value;
  const isCustom  = selected === '__custom__';
  const customVal = inputCustomCategory ? inputCustomCategory.value.trim() : '';

  let hasError = false;

  if (!name.trim()) {
    showFieldError(inputName, 'Item name is required.');
    hasError = true;
  }

  const amount = parseFloat(amountRaw);
  if (amountRaw === '' || isNaN(amount)) {
    showFieldError(inputAmount, 'Please enter a valid amount.');
    hasError = true;
  } else if (amount <= 0) {
    showFieldError(inputAmount, 'Amount must be greater than zero.');
    hasError = true;
  }

  if (!selected) {
    showFieldError(inputCategory, 'Please select a category.');
    hasError = true;
  } else if (isCustom && !customVal) {
    showFieldError(inputCustomCategory, 'Please enter a custom category name.');
    hasError = true;
  }

  if (hasError) return;

  const category = isCustom ? customVal : selected;
  addTransaction(name, amount, category);
  form.reset();

  // Hide the custom input after reset
  if (customCategoryGroup) customCategoryGroup.hidden = true;

  inputName.focus();
}

// ── Event Listeners ──────────────────────────────────────────
form.addEventListener('submit', handleSubmit);

// Clear field error as soon as the user starts correcting it
inputName.addEventListener('input',    () => clearFieldError(inputName));
inputAmount.addEventListener('input',  () => clearFieldError(inputAmount));
inputCategory.addEventListener('change', () => {
  clearFieldError(inputCategory);
  // Show/hide the custom category input
  if (customCategoryGroup) {
    customCategoryGroup.hidden = inputCategory.value !== '__custom__';
  }
});

// Sort buttons
sortButtons.forEach((btn) => {
  btn.addEventListener('click', () => handleSortClick(btn.dataset.sort));
});

// Theme toggle
themeToggleBtn.addEventListener('click', toggleTheme);

// ── Initialise ───────────────────────────────────────────────
loadTheme();
initChart();
renderAll();
