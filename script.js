/* ═══════════════════════════════════════════════════════════
   InvoiceFlow — script.js
   Professional Invoice Generator
   ═══════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────
   STATE
────────────────────────────────────────── */
let currency = '₹';
let itemCount = 0;

/* ──────────────────────────────────────────
   DOM READY — INIT
────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initCurrency();
  loadProfile();
  initInvoiceMeta();
  loadDraft();
  bindProfileLogo();
  bindNavSaveDraft();

  // Start with 2 default item rows
  addItem();
  addItem();

  // Listen to all form inputs to update live preview
  bindLivePreview();
});

/* ──────────────────────────────────────────
   THEME — DARK / LIGHT TOGGLE
────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem('invoiceflow_theme') || 'light';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
  }
  localStorage.setItem('invoiceflow_theme', theme);
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ──────────────────────────────────────────
   CURRENCY SELECTOR
────────────────────────────────────────── */
function initCurrency() {
  const saved = localStorage.getItem('invoiceflow_currency') || '₹';
  currency = saved;
  const sel = document.getElementById('currencySelect');
  if (sel) sel.value = saved;
  updateAllTotals();
}

document.getElementById('currencySelect').addEventListener('change', function () {
  currency = this.value;
  localStorage.setItem('invoiceflow_currency', currency);
  updateAllTotals();
  updatePreview();
});

/* ──────────────────────────────────────────
   INVOICE META — Number / Dates
────────────────────────────────────────── */
function initInvoiceMeta() {
  // Auto invoice number
  const savedCount = parseInt(localStorage.getItem('invoiceflow_invCount') || '0') + 1;
  const year = new Date().getFullYear();
  const paddedCount = String(savedCount).padStart(3, '0');
  const invNumber = `INV-${year}-${paddedCount}`;
  document.getElementById('invNumber').value = invNumber;

  // Auto current date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('invDate').value = today;

  // Due date +15 days
  const due = new Date();
  due.setDate(due.getDate() + 15);
  document.getElementById('invDueDate').value = due.toISOString().split('T')[0];
}

/* ──────────────────────────────────────────
   BUSINESS PROFILE
────────────────────────────────────────── */
const PROFILE_FIELDS = [
  'bName','bOwner','bGst','bPhone','bEmail','bWebsite',
  'bAddress','bBankName','bAccNo','bIfsc','bUpi','bLogoUrl'
];

function saveProfile() {
  const profile = {};
  PROFILE_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) profile[id] = el.value.trim();
  });
  localStorage.setItem('invoiceflow_profile', JSON.stringify(profile));

  // Animate button
  const btn = document.getElementById('saveProfileBtn');
  btn.classList.add('save-success');
  btn.innerHTML = '<i class="bi bi-check2-circle me-2"></i>Saved!';
  setTimeout(() => {
    btn.classList.remove('save-success');
    btn.innerHTML = '<i class="bi bi-check2-circle me-2"></i>Save Business Profile';
  }, 1800);

  showToast('✅ Business profile saved to browser!');
  updatePreview();
}

function loadProfile() {
  const raw = localStorage.getItem('invoiceflow_profile');
  if (!raw) return;
  try {
    const profile = JSON.parse(raw);
    PROFILE_FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (el && profile[id] !== undefined) el.value = profile[id];
    });
    // Trigger logo preview
    const logoEl = document.getElementById('bLogoUrl');
    if (logoEl && logoEl.value) previewLogo(logoEl.value);
  } catch (e) {
    console.warn('Could not load profile:', e);
  }
}

function clearProfile() {
  if (!confirm('Clear all business profile fields?')) return;
  PROFILE_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  localStorage.removeItem('invoiceflow_profile');
  resetLogoPreview();
  updatePreview();
  showToast('Profile cleared.');
}

/* ── Logo Preview ── */
function bindProfileLogo() {
  const input = document.getElementById('bLogoUrl');
  if (!input) return;
  input.addEventListener('input', () => previewLogo(input.value.trim()));
}

function previewLogo(url) {
  const img = document.getElementById('logoPreview');
  const placeholder = document.getElementById('logoPlaceholder');
  if (!url) { resetLogoPreview(); return; }
  img.src = url;
  img.onload = () => {
    img.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    updatePreview();
  };
  img.onerror = () => resetLogoPreview();
}

function resetLogoPreview() {
  const img = document.getElementById('logoPreview');
  const placeholder = document.getElementById('logoPlaceholder');
  if (img) { img.src = ''; img.style.display = 'none'; }
  if (placeholder) placeholder.style.display = 'flex';
}

/* ──────────────────────────────────────────
   INVOICE ITEMS
────────────────────────────────────────── */
function addItem() {
  itemCount++;
  const id = itemCount;
  const tbody = document.getElementById('itemsBody');
  const tr = document.createElement('tr');
  tr.id = `item-row-${id}`;
  tr.dataset.itemId = id;

  tr.innerHTML = `
    <td><input type="text" class="form-control item-name" placeholder="Item name" oninput="updateRowTotal(${id}); updatePreview();" /></td>
    <td><input type="text" class="form-control item-desc" placeholder="Description" oninput="updatePreview();" /></td>
    <td><input type="number" class="form-control item-qty" value="1" min="0" step="any" oninput="updateRowTotal(${id}); updatePreview();" /></td>
    <td><input type="number" class="form-control item-price" value="0" min="0" step="any" oninput="updateRowTotal(${id}); updatePreview();" /></td>
    <td>
      <select class="form-control form-select item-gst" onchange="updateRowTotal(${id}); updatePreview();">
        <option value="0">0%</option>
        <option value="5">5%</option>
        <option value="12">12%</option>
        <option value="18" selected>18%</option>
        <option value="28">28%</option>
      </select>
    </td>
    <td class="item-total-cell" id="item-total-${id}">${currency} 0.00</td>
    <td>
      <button class="btn-remove-item" onclick="removeItem(${id})" title="Remove item">
        <i class="bi bi-x-circle-fill"></i>
      </button>
    </td>
  `;

  tbody.appendChild(tr);
  updateAllTotals();
}

function removeItem(id) {
  const row = document.getElementById(`item-row-${id}`);
  if (row) {
    row.style.opacity = '0';
    row.style.transition = 'opacity 0.2s';
    setTimeout(() => {
      row.remove();
      updateAllTotals();
      updatePreview();
    }, 200);
  }
}

function updateRowTotal(id) {
  const row = document.getElementById(`item-row-${id}`);
  if (!row) return;

  const qty   = parseFloat(row.querySelector('.item-qty')?.value) || 0;
  const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
  const gst   = parseFloat(row.querySelector('.item-gst')?.value) || 0;
  const base  = qty * price;
  const total = base + (base * gst / 100);

  const cell = document.getElementById(`item-total-${id}`);
  if (cell) cell.textContent = `${currency} ${total.toFixed(2)}`;

  updateAllTotals();
}

function updateAllTotals() {
  let subtotal = 0;
  let totalGst = 0;

  document.querySelectorAll('#itemsBody tr').forEach(row => {
    const id = row.dataset.itemId;
    const qty   = parseFloat(row.querySelector('.item-qty')?.value) || 0;
    const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
    const gst   = parseFloat(row.querySelector('.item-gst')?.value) || 0;
    const base  = qty * price;
    const gstAmt = base * gst / 100;

    subtotal += base;
    totalGst += gstAmt;

    const cell = document.getElementById(`item-total-${id}`);
    if (cell) cell.textContent = `${currency} ${(base + gstAmt).toFixed(2)}`;
  });

  const grand = subtotal + totalGst;

  // Update form summary
  setText('summarySubtotal', `${currency} ${subtotal.toFixed(2)}`);
  setText('summaryGst',      `${currency} ${totalGst.toFixed(2)}`);
  setText('summaryGrand',    `${currency} ${grand.toFixed(2)}`);

  // Update preview totals
  setText('prev_subtotal', `${currency} ${subtotal.toFixed(2)}`);
  setText('prev_gst',      `${currency} ${totalGst.toFixed(2)}`);
  setText('prev_grand',    `${currency} ${grand.toFixed(2)}`);
}

/* ──────────────────────────────────────────
   LIVE PREVIEW
────────────────────────────────────────── */
function bindLivePreview() {
  // All text / date inputs
  document.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('input', updatePreview);
    el.addEventListener('change', updatePreview);
  });
}

function updatePreview() {
  // Business
  const bName = val('bName') || 'Your Business Name';
  setText('prev_bName',    bName);
  setText('prev_bName2',   bName);
  setText('prev_bOwner',   val('bOwner'));
  setText('prev_bGst',     val('bGst') || '—');
  setText('prev_bAddress', val('bAddress') || '—');
  setText('prev_bPhone',   val('bPhone') || '—');
  setText('prev_bEmail',   val('bEmail') || '—');
  setText('prev_bBankName', val('bBankName') || '—');
  setText('prev_bAccNo',   val('bAccNo') || '—');
  setText('prev_bIfsc',    val('bIfsc') || '—');
  setText('prev_bUpi',     val('bUpi') || '—');
  setText('prev_signName', val('bName') || '');

  // Logo
  const logoUrl = val('bLogoUrl');
  const prevLogo = document.getElementById('prev_logo');
  if (prevLogo) {
    if (logoUrl) {
      prevLogo.src = logoUrl;
      prevLogo.style.display = 'block';
    } else {
      prevLogo.style.display = 'none';
    }
  }

  // Invoice meta
  setText('prev_invNumber', val('invNumber') || 'INV-2026-001');
  setText('prev_invDate',   formatDate(val('invDate'))   || '—');
  setText('prev_invDueDate',formatDate(val('invDueDate')) || '—');

  // Client
  setText('prev_cName',    val('cName') || '—');
  setText('prev_cAddress', val('cAddress') || '—');
  setText('prev_cPhone',   val('cPhone') || '—');
  setText('prev_cEmail',   val('cEmail') || '—');
  const cGstEl = document.getElementById('prev_cGst');
  const cGst = val('cGst');
  if (cGstEl) cGstEl.textContent = cGst ? `GST: ${cGst}` : '';

  // Items
  buildPreviewItems();
  updateAllTotals();

  // Notes / Terms
  const notes = val('invNotes');
  const terms = val('invTerms');
  const notesBlock = document.getElementById('prev_notesBlock');
  const termsBlock = document.getElementById('prev_termsBlock');
  const prevNotes  = document.getElementById('prev_notes');
  const prevTerms  = document.getElementById('prev_terms');

  if (notesBlock) notesBlock.style.display = notes ? 'block' : 'none';
  if (prevNotes)  prevNotes.textContent = notes;
  if (termsBlock) termsBlock.style.display = terms ? 'block' : 'none';
  if (prevTerms)  prevTerms.textContent = terms;
}

function buildPreviewItems() {
  const tbody = document.getElementById('prev_itemsBody');
  if (!tbody) return;

  const rows = document.querySelectorAll('#itemsBody tr');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:10px;color:#9ca3af;font-size:11px;">Add items to see them here</td></tr>`;
    return;
  }

  let html = '';
  rows.forEach((row, idx) => {
    const name  = row.querySelector('.item-name')?.value  || '—';
    const desc  = row.querySelector('.item-desc')?.value  || '';
    const qty   = parseFloat(row.querySelector('.item-qty')?.value)   || 0;
    const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
    const gst   = parseFloat(row.querySelector('.item-gst')?.value)   || 0;
    const base  = qty * price;
    const total = base + (base * gst / 100);

    html += `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${escHtml(name)}</strong>${desc ? `<br><span style="color:#9ca3af;font-size:10px">${escHtml(desc)}</span>` : ''}</td>
        <td>${qty}</td>
        <td>${currency} ${price.toFixed(2)}</td>
        <td>${gst}%</td>
        <td style="font-weight:600;">${currency} ${total.toFixed(2)}</td>
      </tr>`;
  });

  tbody.innerHTML = html;
}

/* ──────────────────────────────────────────
   DRAFT — SAVE / LOAD
────────────────────────────────────────── */
const INVOICE_TEXT_FIELDS = [
  'invNumber','invDate','invDueDate',
  'cName','cPhone','cEmail','cAddress','cGst',
  'invNotes','invTerms'
];

function saveDraft() {
  const draft = {};

  // Text fields
  INVOICE_TEXT_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) draft[id] = el.value;
  });

  // Items
  draft.items = [];
  document.querySelectorAll('#itemsBody tr').forEach(row => {
    draft.items.push({
      name:  row.querySelector('.item-name')?.value  || '',
      desc:  row.querySelector('.item-desc')?.value  || '',
      qty:   row.querySelector('.item-qty')?.value   || 1,
      price: row.querySelector('.item-price')?.value || 0,
      gst:   row.querySelector('.item-gst')?.value   || 18,
    });
  });

  draft.currency = currency;
  localStorage.setItem('invoiceflow_draft', JSON.stringify(draft));

  // Increment invoice counter
  const match = draft.invNumber.match(/INV-\d{4}-(\d+)/);
  if (match) localStorage.setItem('invoiceflow_invCount', parseInt(match[1]));

  showToast('💾 Draft saved to browser!');
}

function loadDraft() {
  const raw = localStorage.getItem('invoiceflow_draft');
  if (!raw) return;
  try {
    const draft = JSON.parse(raw);

    INVOICE_TEXT_FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (el && draft[id] !== undefined) el.value = draft[id];
    });

    if (draft.currency) {
      currency = draft.currency;
      const sel = document.getElementById('currencySelect');
      if (sel) sel.value = currency;
    }

    if (draft.items && draft.items.length) {
      // Clear existing rows first
      document.getElementById('itemsBody').innerHTML = '';
      itemCount = 0;
      draft.items.forEach(item => {
        addItem();
        const lastRow = document.querySelector('#itemsBody tr:last-child');
        if (!lastRow) return;
        if (lastRow.querySelector('.item-name'))  lastRow.querySelector('.item-name').value  = item.name;
        if (lastRow.querySelector('.item-desc'))  lastRow.querySelector('.item-desc').value  = item.desc;
        if (lastRow.querySelector('.item-qty'))   lastRow.querySelector('.item-qty').value   = item.qty;
        if (lastRow.querySelector('.item-price')) lastRow.querySelector('.item-price').value = item.price;
        if (lastRow.querySelector('.item-gst'))   lastRow.querySelector('.item-gst').value   = item.gst;
        updateRowTotal(itemCount);
      });
    }

    updateAllTotals();
    updatePreview();
  } catch (e) {
    console.warn('Could not load draft:', e);
  }
}

/* ── nav save draft shortcut ── */
function bindNavSaveDraft() {
  const btn = document.getElementById('navSaveDraft');
  if (btn) btn.addEventListener('click', saveDraft);
}

/* ──────────────────────────────────────────
   CLEAR INVOICE
────────────────────────────────────────── */
function clearInvoice() {
  if (!confirm('Clear all invoice data? (Business profile will be kept)')) return;

  INVOICE_TEXT_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  document.getElementById('itemsBody').innerHTML = '';
  itemCount = 0;
  addItem();
  addItem();

  initInvoiceMeta();
  updateAllTotals();
  updatePreview();
  localStorage.removeItem('invoiceflow_draft');
  showToast('Invoice cleared.');
}

/* ──────────────────────────────────────────
   PRINT
────────────────────────────────────────── */
function printInvoice() {
  window.print();
}

/* ──────────────────────────────────────────
   DOWNLOAD PDF (html2pdf.js)
────────────────────────────────────────── */
function downloadPDF() {
  const element = document.getElementById('invoiceDocument');
  if (!element) { showToast('Invoice document not found.'); return; }

  const invNumber = val('invNumber') || 'invoice';
  const clientName = val('cName') || 'client';
  const filename = `${invNumber}-${clientName.replace(/\s+/g,'-')}.pdf`;

  showToast('📄 Generating PDF…');

  const opt = {
    margin:       [8, 8, 8, 8],
    filename:     filename,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak:    { mode: ['avoid-all'] }
  };

  html2pdf().set(opt).from(element).save()
    .then(() => showToast('✅ PDF downloaded!'))
    .catch(() => showToast('❌ PDF export failed. Try print instead.'));
}

/* ──────────────────────────────────────────
   TOAST NOTIFICATION
────────────────────────────────────────── */
function showToast(msg, type = 'info') {
  const toastEl = document.getElementById('appToast');
  const msgEl   = document.getElementById('toastMsg');
  if (!toastEl || !msgEl) return;

  msgEl.textContent = msg;

  // Color by type
  toastEl.className = 'toast align-items-center';
  if (type === 'success') toastEl.style.borderLeft = '3px solid #10b981';
  else if (type === 'error') toastEl.style.borderLeft = '3px solid #ef4444';
  else toastEl.style.borderLeft = '3px solid #6c47ff';

  const bsToast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3000 });
  bsToast.show();
}

/* ──────────────────────────────────────────
   HELPER UTILITIES
────────────────────────────────────────── */

/** Get trimmed value from an element by ID */
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/** Set text content safely */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/** Format ISO date string to readable format */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

/** Escape HTML entities */
function escHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}
