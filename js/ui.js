/**
 * ═══════════════════════════════════════════════════════════
 * InvoiceFlow — ui.js
 * UI Helper Functions (Toasts, Modals, Notifications)
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Show toast notification
 * @param {string} msg - Message to display
 * @param {string} type - 'info' | 'success' | 'error' | 'warning'
 */
export function showToast(msg, type = 'info') {
  const toastEl = document.getElementById('appToast');
  const msgEl   = document.getElementById('toastMsg');
  
  if (!toastEl || !msgEl) {
    console.warn('Toast elements not found');
    return;
  }

  msgEl.textContent = msg;

  // Set color by type
  toastEl.className = 'toast align-items-center border-0';
  
  switch(type) {
    case 'success':
      toastEl.style.background = '#ecfdf5';
      toastEl.style.borderLeft = '4px solid #10b981';
      msgEl.style.color = '#059669';
      break;
    case 'error':
      toastEl.style.background = '#fef2f2';
      toastEl.style.borderLeft = '4px solid #ef4444';
      msgEl.style.color = '#dc2626';
      break;
    case 'warning':
      toastEl.style.background = '#fffbeb';
      toastEl.style.borderLeft = '4px solid #f59e0b';
      msgEl.style.color = '#d97706';
      break;
    case 'info':
    default:
      toastEl.style.background = '#f0f9ff';
      toastEl.style.borderLeft = '4px solid #0ea5e9';
      msgEl.style.color = '#0369a1';
  }

  const bsToast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3500 });
  bsToast.show();
}

/**
 * Show confirmation dialog
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {string} confirmText - Confirm button text
 * @returns {Promise<boolean>}
 */
export async function showConfirmDialog(title, message, confirmText = 'Confirm') {
  return new Promise((resolve) => {
    const modalEl = document.getElementById('confirmModal');
    if (!modalEl) {
      resolve(confirm(message));
      return;
    }
    
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmBtn').textContent = confirmText;
    
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };
    
    const handleCancel = () => {
      cleanup();
      resolve(false);
    };
    
    const cleanup = () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      const bsModal = bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
  });
}

/**
 * Close modal by ID
 */
export function closeModal(modalId) {
  const modalEl = document.getElementById(modalId);
  if (!modalEl) return;
  
  const bsModal = bootstrap.Modal.getInstance(modalEl);
  if (bsModal) {
    bsModal.hide();
  }
}

/**
 * Update sync indicator
 */
export function updateSyncStatus(status) {
  const indicator = document.getElementById('syncIndicator');
  if (!indicator) return;
  
  switch(status) {
    case 'syncing':
      indicator.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Syncing...';
      indicator.style.color = '#6c47ff';
      break;
    case 'error':
      indicator.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i>Sync Error';
      indicator.style.color = '#ef4444';
      break;
    case 'ready':
      indicator.innerHTML = '☁️ Synced';
      indicator.style.color = '#10b981';
      break;
  }
}

/**
 * Show loading spinner
 */
export function showLoading(text = 'Loading...') {
  const loader = document.createElement('div');
  loader.id = 'appLoader';
  loader.innerHTML = `
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
    <p class="mt-2">${text}</p>
  `;
  loader.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    background: rgba(0,0,0,0.05);
    padding: 2rem;
    border-radius: 12px;
  `;
  
  document.body.appendChild(loader);
}

/**
 * Hide loading spinner
 */
export function hideLoading() {
  const loader = document.getElementById('appLoader');
  if (loader) {
    loader.remove();
  }
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Format currency display
 */
export function formatCurrency(amount, currency = '₹') {
  return `${currency} ${parseFloat(amount).toFixed(2)}`;
}

/**
 * Format date to readable string
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Escape HTML entities for safe display
 */
export function escapeHtml(str) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('✅ Copied to clipboard!', 'success');
  } catch (error) {
    console.error('Copy error:', error);
    showToast('Failed to copy', 'error');
  }
}

export default {
  showToast,
  showConfirmDialog,
  closeModal,
  updateSyncStatus,
  showLoading,
  hideLoading,
  debounce,
  formatCurrency,
  formatDate,
  escapeHtml,
  copyToClipboard
};

// Make showToast available globally
if (typeof window !== 'undefined') {
  window.showToast = showToast;
}
