
/*!
  Personal Finance Tracker - Single-file non-module script
  Persists to localStorage under key "financeTracker.v1"
*/
(function () {
  'use strict';

  const STORAGE_KEY = 'financeTracker.v1';
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const state = {
    transactions: [],
    filters: {
      category: '',
      type: 'all', // all | income | expense
      from: '', // YYYY-MM-DD
      to: '' // YYYY-MM-DD
    }
  };

  // Fallback UUID
  let _idCounter = 0;
  function genId() {
    if (window.crypto && crypto.randomUUID) {
      try { return crypto.randomUUID(); } catch (_) {}
    }
    return 'tx-' + Date.now().toString(36) + '-' + (++_idCounter).toString(36);
  }

  function setStatus(msg, isError = false) {
    const el = $('#status');
    if (!el) return;
    el.textContent = msg || '';
    el.style.color = isError ? '#ef4444' : '';
  }

  function safeParse(json) {
    try { return JSON.parse(json); } catch (_) { return null; }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = safeParse(raw);
      if (!parsed || typeof parsed !== 'object') return;

      if (Array.isArray(parsed.transactions)) {
        state.transactions = parsed.transactions.filter(isValidStoredTx);
      }
      if (parsed.filters && typeof parsed.filters === 'object') {
        state.filters = {
          category: parsed.filters.category || '',
          type: ['all','income','expense'].includes(parsed.filters.type) ? parsed.filters.type : 'all',
          from: parsed.filters.from || '',
          to: parsed.filters.to || ''
        };
      }
    } catch (err) {
      console.error('loadState failed', err);
      // Reset to defaults if load failed
      state.transactions = [];
      state.filters = { category: '', type: 'all', from: '', to: '' };
      setStatus('Local data was invalid and has been reset.', true);
    }
  }

  function saveState() {
    try {
      const payload = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, payload);
      setStatus('');
    } catch (err) {
      console.error('saveState failed', err);
      setStatus('Failed to save to localStorage. Your changes may not persist.', true);
    }
  }

  function isValidStoredTx(tx) {
    return tx && typeof tx === 'object' &&
      typeof tx.id === 'string' &&
      typeof tx.date === 'string' &&
      typeof tx.category === 'string' &&
      typeof tx.amount === 'number' &&
      typeof tx.createdAt === 'string';
  }

  function toISODateUTCFromInput(yyyyMMdd) {
    if (!yyyyMMdd) return '';
    // Force UTC midnight for given calendar day
    const iso = new Date(yyyyMMdd + 'T00:00:00.000Z').toISOString();
    return iso;
  }
  function toEndOfDayISO(yyyyMMdd) {
    if (!yyyyMMdd) return '';
    return new Date(yyyyMMdd + 'T23:59:59.999Z').toISOString();
  }
  function isoToDateOnly(iso) {
    try { return new Date(iso).toISOString().slice(0, 10); } catch (_) { return ''; }
  }
  function fmtAmount(n) {
    const str = (Math.round(n * 100) / 100).toString();
    return n > 0 ? '+' + str : str; // negatives already include minus
  }

  function validateTransaction(input) {
    const errors = [];
    const out = {
      date: '',
      category: '',
      description: '',
      amount: 0
    };

    // Date
    if (!input.date) {
      errors.push('Date is required.');
    } else {
      const iso = toISODateUTCFromInput(input.date);
      if (!iso || Number.isNaN(new Date(iso).getTime())) {
        errors.push('Invalid date.');
      } else {
        out.date = iso;
      }
    }

    // Category
    const cat = (input.category || '').trim();
    if (!cat) errors.push('Category is required.');
    out.category = cat;

    // Description optional
    out.description = (input.description || '').trim();

    // Amount
    let amount = Number(input.amount);
    if (Number.isNaN(amount) || !Number.isFinite(amount) || input.amount === '') {
      errors.push('Amount must be a number.');
    } else {
      // Keep as-is; sign denotes income/expense
      out.amount = amount;
    }

    return { ok: errors.length === 0, errors, value: out };
  }

  function attachFormHandlers() {
    const form = $('#tx-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      $('#tx-error').textContent = '';

      const data = {
        date: $('#tx-date').value,
        category: $('#tx-category').value,
        description: $('#tx-description').value,
        amount: $('#tx-amount').value
      };
      const res = validateTransaction(data);
      if (!res.ok) {
        $('#tx-error').textContent = res.errors.join(' ');
        return;
      }
      const nowIso = new Date().toISOString();
      const tx = {
        id: genId(),
        date: res.value.date,
        category: res.value.category,
        description: res.value.description,
        amount: res.value.amount,
        createdAt: nowIso
      };
      state.transactions.push(tx);
      saveState();
      clearForm();
      renderAll();
    });
  }

  function clearForm() {
    $('#tx-date').value = '';
    $('#tx-category').value = '';
    $('#tx-description').value = '';
    $('#tx-amount').value = '';
    $('#tx-date').focus();
  }

  function attachFilterHandlers() {
    const apply = () => {
      state.filters.category = $('#filter-category').value.trim();
      state.filters.type = $('#filter-type').value;
      state.filters.from = $('#filter-from').value;
      state.filters.to = $('#filter-to').value;
      saveState();
      renderAll();
    };
    $('#filter-category').addEventListener('input', apply);
    $('#filter-type').addEventListener('change', apply);
    $('#filter-from').addEventListener('change', apply);
    $('#filter-to').addEventListener('change', apply);
  }

  function restoreControlsFromState() {
    $('#filter-category').value = state.filters.category || '';
    $('#filter-type').value = state.filters.type || 'all';
    $('#filter-from').value = state.filters.from || '';
    $('#filter-to').value = state.filters.to || '';
  }

  function getFilteredAndSortedTransactions() {
    let list = state.transactions.slice();

    // Filter by category (exact)
    if (state.filters.category) {
      list = list.filter(tx => tx.category === state.filters.category);
    }
    // Filter by type
    if (state.filters.type === 'income') {
      list = list.filter(tx => tx.amount > 0);
    } else if (state.filters.type === 'expense') {
      list = list.filter(tx => tx.amount < 0);
    }
    // Filter by date range inclusive
    let fromIso = state.filters.from ? toISODateUTCFromInput(state.filters.from) : '';
    let toIso = state.filters.to ? toEndOfDayISO(state.filters.to) : '';
    if (fromIso) {
      const fromTs = new Date(fromIso).getTime();
      list = list.filter(tx => new Date(tx.date).getTime() >= fromTs);
    }
    if (toIso) {
      const toTs = new Date(toIso).getTime();
      list = list.filter(tx => new Date(tx.date).getTime() <= toTs);
    }

    // Sort by date desc, then createdAt desc
    list.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (db !== da) return db - da;
      const ca = new Date(a.createdAt).getTime();
      const cb = new Date(b.createdAt).getTime();
      return cb - ca;
    });

    return list;
  }

  function computeStats(transactions) {
    let totalIncome = 0, totalExpenses = 0, balance = 0;
    for (const tx of transactions) {
      balance += tx.amount;
      if (tx.amount > 0) totalIncome += tx.amount;
      if (tx.amount < 0) totalExpenses += tx.amount;
    }
    return {
      totalIncome,
      totalExpenses, // negative number
      balance
    };
  }

  function aggregateByCategory(transactions) {
    const map = {};
    for (const tx of transactions) {
      if (tx.amount < 0) {
        map[tx.category] = (map[tx.category] || 0) + Math.abs(tx.amount);
      }
    }
    return map;
  }

  function aggregateMonthlyNet(transactions) {
    const map = {};
    for (const tx of transactions) {
      const d = new Date(tx.date);
      if (Number.isNaN(d.getTime())) continue;
      const key = d.toISOString().slice(0, 7); // YYYY-MM
      map[key] = (map[key] || 0) + tx.amount;
    }
    const keys = Object.keys(map).sort();
    return keys.map(k => ({ month: k, value: map[k] }));
  }

  function renderStats() {
    const list = getFilteredAndSortedTransactions();
    const stats = computeStats(list);
    $('#stat-income').textContent = fmtAmount(Math.round(stats.totalIncome * 100) / 100);
    $('#stat-expenses').textContent = fmtAmount(Math.round(stats.totalExpenses * 100) / 100);
    $('#stat-balance').textContent = fmtAmount(Math.round(stats.balance * 100) / 100);

    $('#stat-income').className = 'value tx-income';
    $('#stat-expenses').className = 'value tx-expense';
    $('#stat-balance').className = 'value ' + (stats.balance >= 0 ? 'tx-income' : 'tx-expense');
  }

  function renderTable() {
    const tbody = $('#tx-tbody');
    tbody.innerHTML = '';
    const list = getFilteredAndSortedTransactions();

    if (list.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.textContent = 'No transactions. Add one above.';
      td.style.color = '#94a3b8';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    for (const tx of list) {
      const tr = document.createElement('tr');
      tr.dataset.id = tx.id;

      const tdDate = document.createElement('td');
      tdDate.textContent = isoToDateOnly(tx.date);

      const tdCat = document.createElement('td');
      tdCat.textContent = tx.category;

      const tdDesc = document.createElement('td');
      tdDesc.textContent = tx.description || '';

      const tdAmt = document.createElement('td');
      tdAmt.className = 'right amount ' + (tx.amount >= 0 ? 'tx-income' : 'tx-expense');
      tdAmt.textContent = fmtAmount(tx.amount);

      const tdActions = document.createElement('td');
      tdActions.className = 'actions';
      const btnEdit = document.createElement('button');
      btnEdit.type = 'button';
      btnEdit.className = 'small';
      btnEdit.textContent = 'Edit';
      btnEdit.addEventListener('click', () => enterEditMode(tr, tx));
      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'small ghost';
      btnDel.textContent = 'Delete';
      btnDel.addEventListener('click', () => deleteTx(tx.id));
      tdActions.append(btnEdit, btnDel);

      tr.append(tdDate, tdCat, tdDesc, tdAmt, tdActions);
      tbody.appendChild(tr);
    }
  }

  function enterEditMode(tr, tx) {
    tr.innerHTML = '';

    const tdDate = document.createElement('td');
    const inputDate = document.createElement('input');
    inputDate.type = 'date';
    inputDate.value = isoToDateOnly(tx.date);
    tdDate.appendChild(inputDate);

    const tdCat = document.createElement('td');
    const inputCat = document.createElement('input');
    inputCat.type = 'text';
    inputCat.value = tx.category;
    tdCat.appendChild(inputCat);

    const tdDesc = document.createElement('td');
    const inputDesc = document.createElement('input');
    inputDesc.type = 'text';
    inputDesc.value = tx.description || '';
    tdDesc.appendChild(inputDesc);

    const tdAmt = document.createElement('td');
    tdAmt.className = 'right';
    const inputAmt = document.createElement('input');
    inputAmt.type = 'number';
    inputAmt.step = '0.01';
    inputAmt.value = String(tx.amount);
    inputAmt.style.textAlign = 'right';
    tdAmt.appendChild(inputAmt);

    const tdActions = document.createElement('td');
    tdActions.className = 'actions';
    const btnSave = document.createElement('button');
    btnSave.type = 'button';
    btnSave.className = 'small primary';
    btnSave.textContent = 'Save';
    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.className = 'small ghost';
    btnCancel.textContent = 'Cancel';
    const error = document.createElement('div');
    error.className = 'error';
    error.style.minWidth = '160px';

    btnSave.addEventListener('click', () => {
      const res = validateTransaction({
        date: inputDate.value,
        category: inputCat.value,
        description: inputDesc.value,
        amount: inputAmt.value
      });
      if (!res.ok) {
        error.textContent = res.errors.join(' ');
        return;
      }
      // Update existing tx in-place (keep id, createdAt)
      tx.date = res.value.date;
      tx.category = res.value.category;
      tx.description = res.value.description;
      tx.amount = res.value.amount;

      saveState();
      renderAll();
    });
    btnCancel.addEventListener('click', () => {
      renderAll();
    });

    tdActions.append(btnSave, btnCancel);
    tr.append(tdDate, tdCat, tdDesc, tdAmt, tdActions);
    const trErr = document.createElement('tr');
    const tdErr = document.createElement('td');
    tdErr.colSpan = 5;
    tdErr.appendChild(error);
    // Insert error row after editing row
    tr.after(trErr);
    trErr.appendChild(tdErr);
  }

  function deleteTx(id) {
    const idx = state.transactions.findIndex(t => t.id === id);
    if (idx >= 0) {
      state.transactions.splice(idx, 1);
      saveState();
      renderAll();
    }
  }

  // Canvas utils
  function setupCanvas(canvas, cssWidth, cssHeight) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function renderCategoryBarChart() {
    const canvas = $('#chart-category-expenses');
    if (!canvas) return;
    const containerWidth = canvas.parentElement.clientWidth || 600;
    const height = 300;
    const ctx = setupCanvas(canvas, containerWidth, height);

    const dataMap = aggregateByCategory(getFilteredAndSortedTransactions()); // absolute totals
    const entries = Object.entries(dataMap).sort((a, b) => b[1] - a[1]);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui';
    if (entries.length === 0) {
      ctx.fillText('No expense data to show.', 10, 20);
      return;
    }

    const margin = { top: 16, right: 16, bottom: 48, left: 44 };
    const innerW = containerWidth - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const values = entries.map(e => e[1]);
    const maxVal = Math.max(...values, 1);
    const barCount = entries.length;
    const gap = 10;
    const barW = Math.max(10, (innerW - gap * (barCount - 1)) / barCount);

    // Axes
    ctx.strokeStyle = '#344155';
    ctx.beginPath();
    ctx.moveTo(margin.left, height - margin.bottom);
    ctx.lineTo(containerWidth - margin.right, height - margin.bottom);
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.stroke();

    // Y ticks (4)
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = (maxVal * i) / ticks;
      const y = height - margin.bottom - (innerH * i) / ticks;
      ctx.fillText(String(Math.round(v)), margin.left - 6, y);
      ctx.strokeStyle = 'rgba(52,65,85,0.4)';
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(containerWidth - margin.right, y);
      ctx.stroke();
    }

    // Bars
    let x = margin.left;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const [label, val] of entries) {
      const h = innerH * (val / maxVal);
      const y = height - margin.bottom - h;
      // bar
      const grd = ctx.createLinearGradient(0, y, 0, y + h);
      grd.addColorStop(0, '#ef4444');
      grd.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = grd;
      ctx.fillRect(x, y, barW, h);
      // label
      ctx.fillStyle = '#e2e8f0';
      const labelX = x + barW / 2;
      ctx.save();
      ctx.translate(labelX, height - margin.bottom + 4);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText(label, 0, 0);
      ctx.restore();
      x += barW + gap;
    }
  }

  function renderMonthlyLineChart() {
    const canvas = $('#chart-monthly-net');
    if (!canvas) return;
    const containerWidth = canvas.parentElement.clientWidth || 600;
    const height = 300;
    const ctx = setupCanvas(canvas, containerWidth, height);

    const series = aggregateMonthlyNet(getFilteredAndSortedTransactions());
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui';
    if (series.length === 0) {
      ctx.fillText('No monthly data to show.', 10, 20);
      return;
    }

    const margin = { top: 16, right: 16, bottom: 48, left: 44 };
    const innerW = containerWidth - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const values = series.map(p => p.value);
    const minVal = Math.min(...values, 0);
    const maxVal = Math.max(...values, 0);
    const range = Math.max(1, maxVal - minVal || 1);

    // Axes
    ctx.strokeStyle = '#344155';
    ctx.beginPath();
    ctx.moveTo(margin.left, height - margin.bottom);
    ctx.lineTo(containerWidth - margin.right, height - margin.bottom);
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.stroke();

    // 0 baseline if within range
    if (minVal < 0 && maxVal > 0) {
      const zeroY = margin.top + innerH * (maxVal / range);
      ctx.strokeStyle = 'rgba(59,130,246,0.4)';
      ctx.beginPath();
      ctx.moveTo(margin.left, zeroY);
      ctx.lineTo(containerWidth - margin.right, zeroY);
      ctx.stroke();
    }

    // Points
    const stepX = innerW / Math.max(series.length - 1, 1);

    function yFor(v) {
      return margin.top + innerH * (1 - (v - minVal) / range);
    }

    // Line
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < series.length; i++) {
      const x = margin.left + stepX * i;
      const y = yFor(series[i].value);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Markers and labels
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'center';
    for (let i = 0; i < series.length; i++) {
      const x = margin.left + stepX * i;
      const y = yFor(series[i].value);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      // x labels
      const lbl = series[i].month;
      ctx.save();
      ctx.translate(x, height - margin.bottom + 6);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText(lbl, 0, 0);
      ctx.restore();
    }
  }

  function renderAll() {
    renderStats();
    renderTable();
    renderCategoryBarChart();
    renderMonthlyLineChart();
  }

  function onResize() {
    // Re-render charts to fit new width
    renderCategoryBarChart();
    renderMonthlyLineChart();
  }

  // Manual test helpers
  function seedDemoData() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const pad = (n) => String(n).padStart(2, '0');
    const iso = (yyyy, mm, dd) => new Date(`${yyyy}-${pad(mm)}-${pad(dd)}T00:00:00.000Z`).toISOString();
    const demo = [
      { date: iso(y, 1, 5), category: 'Salary', description: 'January salary', amount: 3000 },
      { date: iso(y, 1, 10), category: 'Food', description: 'Groceries', amount: -120.55 },
      { date: iso(y, 1, 12), category: 'Transport', description: 'Bus pass', amount: -45 },
      { date: iso(y, 2, 5), category: 'Salary', description: 'February salary', amount: 3000 },
      { date: iso(y, 2, 13), category: 'Rent', description: 'Monthly rent', amount: -1400 },
      { date: iso(y, 2, 18), category: 'Food', description: 'Dining out', amount: -60.75 },
      { date: iso(y, 3, 2), category: 'Gift', description: 'From friend', amount: 50 },
      { date: iso(y, 3, 6), category: 'Utilities', description: 'Electricity', amount: -95.2 },
      { date: iso(y, 3, 22), category: 'Food', description: 'Groceries', amount: -150.1 }
    ];
    for (const d of demo) {
      state.transactions.push({
        id: genId(),
        createdAt: new Date().toISOString(),
        ...d
      });
    }
    saveState();
    renderAll();
  }
  function clearAllData() {
    state.transactions = [];
    saveState();
    renderAll();
  }

  // Expose a small test harness for manual page
  window.financeTrackerTest = {
    seedDemoData,
    clearAllData,
    computeStats,
    aggregateByCategory,
    aggregateMonthlyNet
  };

  // Init
  window.addEventListener('load', () => {
    loadState();
    restoreControlsFromState();
    attachFormHandlers();
    attachFilterHandlers();
    renderAll();
  });
  window.addEventListener('resize', () => {
    // Throttle with requestAnimationFrame
    if (onResize._raf) cancelAnimationFrame(onResize._raf);
    onResize._raf = requestAnimationFrame(onResize);
  });
})();
