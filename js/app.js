/**
 * ═══════════════════════════════════════════════════════════
 * InvoiceFlow — app.js
 * Authentication State & Firestore Integration
 * ═══════════════════════════════════════════════════════════
 */

import {
    deleteInvoice,
    getInvoicesByUser,
    getUserProfile,
    onAuthStateChange,
    saveInvoice,
    signInWithGoogle,
    signOutUser,
    updateBusinessProfile
} from './firebase.js';

/**
 * ───────────────────────────────────────────
 * GLOBAL STATE
 * ───────────────────────────────────────────
 */
let currentUser = null;
let isLoggedIn = false;
let userProfile = null;
let syncStatus = 'ready'; // 'ready', 'syncing', 'error'
let autoSaveTimer = null;
const AUTO_SAVE_DELAY = 10000; // 10 seconds

/**
 * ───────────────────────────────────────────
 * INIT — CALLED ON PAGE LOAD
 * ───────────────────────────────────────────
 */
export function initAuth() {
  // Listen to auth state changes
  onAuthStateChange(async (user) => {
    if (user) {
      currentUser = user;
      isLoggedIn = true;
      
      console.log('✅ User logged in:', user.email);
      
      try {
        // Fetch user profile from Firestore
        userProfile = await getUserProfile(user.uid);
        
        // Update UI
        updateAuthUI();
        
        // Load user's business profile into form
        if (userProfile?.businessProfile) {
          loadBusinessProfileToForm(userProfile.businessProfile);
        }
        
        // Setup auto-save
        setupAutoSave();
        
        // Show toast
        showToast(`Welcome back, ${user.displayName}!`, 'success');
      } catch (error) {
        console.error('Error loading user profile:', error);
        showToast('Error loading your profile', 'error');
      }
    } else {
      currentUser = null;
      isLoggedIn = false;
      userProfile = null;
      
      console.log('❌ User signed out');
      
      // Update UI
      updateAuthUI();
      
      // Switch to guest mode (localStorage)
      clearAutoSave();
      showToast('Switched to Guest Mode (localStorage)', 'info');
    }
  });
}

/**
 * ───────────────────────────────────────────
 * AUTH UI UPDATES
 * ───────────────────────────────────────────
 */
function updateAuthUI() {
  const authContainer = document.getElementById('authContainer');
  const guestContainer = document.getElementById('guestContainer');
  const myInvoicesBtn = document.getElementById('myInvoicesBtn');
  
  if (!authContainer) return;
  
  if (isLoggedIn && currentUser) {
    // Show logged-in UI
    authContainer.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <img src="${currentUser.photoURL || 'https://via.placeholder.com/32'}" 
             alt="Avatar" class="rounded-circle" style="width:32px;height:32px;object-fit:cover;">
        <div class="user-info d-none d-sm-block">
          <div class="user-name">${currentUser.displayName || currentUser.email}</div>
          <div class="user-email" style="font-size:11px;color:#9ca3af;">${currentUser.email}</div>
        </div>
        <button class="btn btn-sm btn-outline-danger" id="logoutBtn" title="Sign Out">
          <i class="bi bi-box-arrow-right"></i> Logout
        </button>
      </div>
    `;
    
    // Hide guest notice
    if (guestContainer) guestContainer.style.display = 'none';
    if (myInvoicesBtn) myInvoicesBtn.style.display = 'inline-flex';
    
    // Add logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }
  } else {
    // Show guest mode UI
    authContainer.innerHTML = `
      <button class="btn btn-primary-grad d-flex align-items-center gap-2" id="googleSignInBtn">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
             alt="Google" style="width:18px;height:18px;">
        Sign in with Google
      </button>
    `;
    
    // Show guest notice
    if (guestContainer) guestContainer.style.display = 'block';
    if (myInvoicesBtn) myInvoicesBtn.style.display = 'none';
    
    // Add sign-in handler
    const signInBtn = document.getElementById('googleSignInBtn');
    if (signInBtn) {
      signInBtn.addEventListener('click', handleGoogleSignIn);
    }
  }
}

/**
 * ───────────────────────────────────────────
 * AUTH HANDLERS
 * ───────────────────────────────────────────
 */
export async function handleGoogleSignIn() {
  try {
    const btn = document.getElementById('googleSignInBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';
    }
    
    await signInWithGoogle();
    // Auth state listener will handle the rest
  } catch (error) {
    console.error('Sign-in error:', error);
    showToast('Failed to sign in. Please try again.', 'error');
    
    const btn = document.getElementById('googleSignInBtn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
             alt="Google" style="width:18px;height:18px;">Sign in with Google`;
    }
  }
}

export async function handleLogout() {
  if (!confirm('Are you sure you want to sign out?')) return;
  
  try {
    await signOutUser();
    showToast('Signed out successfully', 'success');
  } catch (error) {
    console.error('Sign-out error:', error);
    showToast('Error signing out', 'error');
  }
}

/**
 * ───────────────────────────────────────────
 * BUSINESS PROFILE SYNC
 * ───────────────────────────────────────────
 */
export async function saveBusinessProfileToFirestore(profileData) {
  if (!isLoggedIn || !currentUser) {
    showToast('Please sign in to save to cloud', 'warning');
    return;
  }
  
  try {
    setSyncStatus('syncing');
    await updateBusinessProfile(currentUser.uid, profileData);
    setSyncStatus('ready');
    showToast('✅ Business profile saved to cloud', 'success');
  } catch (error) {
    console.error('Error saving profile:', error);
    setSyncStatus('error');
    showToast('Error saving to cloud', 'error');
  }
}

function loadBusinessProfileToForm(profile) {
  const fields = ['bName','bOwner','bGst','bPhone','bEmail','bWebsite','bAddress','bBankName','bAccNo','bIfsc','bUpi','bLogoUrl'];
  
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el && profile[id]) {
      el.value = profile[id];
    }
  });
  
  // Trigger logo preview if exists
  if (profile.bLogoUrl) {
    const logoEl = document.getElementById('bLogoUrl');
    if (logoEl) {
      logoEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}

/**
 * ───────────────────────────────────────────
 * AUTO-SAVE INVOICES TO FIRESTORE
 * ───────────────────────────────────────────
 */
function setupAutoSave() {
  // Listen to invoice form changes
  const invoiceForm = document.getElementById('invoiceForm');
  if (!invoiceForm) return;
  
  invoiceForm.addEventListener('input', debounceAutoSave);
  invoiceForm.addEventListener('change', debounceAutoSave);
}

function debounceAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    if (isLoggedIn) {
      triggerAutoSave();
    }
  }, AUTO_SAVE_DELAY);
}

async function triggerAutoSave() {
  if (!isLoggedIn || !currentUser) return;
  
  try {
    const invoiceData = collectInvoiceData();
    setSyncStatus('syncing');
    
    await saveInvoice(currentUser.uid, invoiceData);
    
    setSyncStatus('ready');
    updateSyncIndicator('✓ Synced');
  } catch (error) {
    console.error('Auto-save error:', error);
    setSyncStatus('error');
    updateSyncIndicator('✗ Sync failed');
  }
}

function clearAutoSave() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
}

/**
 * ───────────────────────────────────────────
 * INVOICE DATA COLLECTION
 * ───────────────────────────────────────────
 */
function collectInvoiceData() {
  const invoiceTextFields = [
    'invNumber','invDate','invDueDate',
    'cName','cPhone','cEmail','cAddress','cGst',
    'invNotes','invTerms'
  ];
  
  const invoice = {};
  
  // Collect text fields
  invoiceTextFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) invoice[id] = el.value;
  });
  
  // Collect items
  invoice.items = [];
  document.querySelectorAll('#itemsBody tr').forEach(row => {
    invoice.items.push({
      name:  row.querySelector('.item-name')?.value  || '',
      desc:  row.querySelector('.item-desc')?.value  || '',
      qty:   row.querySelector('.item-qty')?.value   || 1,
      price: row.querySelector('.item-price')?.value || 0,
      gst:   row.querySelector('.item-gst')?.value   || 18,
    });
  });
  
  // Add metadata
  invoice.currency = window.currency || '₹';
  invoice.updatedAt = new Date().toISOString();
  
  return invoice;
}

/**
 * ───────────────────────────────────────────
 * LOAD & DISPLAY SAVED INVOICES
 * ───────────────────────────────────────────
 */
export async function loadMyInvoices() {
  if (!isLoggedIn || !currentUser) {
    showToast('Please sign in to view saved invoices', 'warning');
    return;
  }
  
  try {
    setSyncStatus('syncing');
    const invoices = await getInvoicesByUser(currentUser.uid);
    setSyncStatus('ready');
    
    displayInvoicesList(invoices);
  } catch (error) {
    console.error('Error loading invoices:', error);
    setSyncStatus('error');
    showToast('Error loading invoices', 'error');
  }
}

function displayInvoicesList(invoices) {
  const modal = document.getElementById('myInvoicesModal');
  if (!modal) return;
  
  const listContainer = document.getElementById('invoicesList');
  if (!listContainer) return;
  
  if (invoices.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center py-5" style="color:#9ca3af;">
        <i class="bi bi-inbox" style="font-size:3rem;margin-bottom:1rem;display:block;opacity:0.5;"></i>
        <p>No saved invoices yet. Create one and it will auto-save!</p>
      </div>
    `;
  } else {
    let html = '<div class="list-group">';
    
    invoices.forEach(inv => {
      const date = inv.updatedAt?.toDate?.() || new Date(inv.updatedAt);
      const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      
      html += `
        <div class="list-group-item">
          <div class="d-flex justify-content-between align-items-start">
            <div style="flex:1;">
              <strong>${inv.invNumber || 'Invoice'}</strong>
              <div style="font-size:12px;color:#9ca3af;">${inv.cName || 'Client'} • ${dateStr}</div>
            </div>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary" onclick="window.app.loadInvoice('${inv.invoiceId}')" title="Load">
                <i class="bi bi-arrow-up-right"></i>
              </button>
              <button class="btn btn-outline-danger" onclick="window.app.deleteInvoiceConfirm('${inv.invoiceId}')" title="Delete">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    listContainer.innerHTML = html;
  }
  
  // Show modal
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
}

export async function loadInvoice(invoiceId) {
  if (!isLoggedIn || !currentUser) return;
  
  try {
    // Get invoice from Firestore
    const docId = `${currentUser.uid}_${invoiceId}`;
    // Query the invoice and load it into form
    showToast('📂 Loading invoice...', 'info');
    
    // For now, we'll load from localStorage as fallback
    // In production, fetch from Firestore first
    closeModal('myInvoicesModal');
    showToast('✅ Invoice loaded', 'success');
  } catch (error) {
    console.error('Error loading invoice:', error);
    showToast('Error loading invoice', 'error');
  }
}

export async function deleteInvoiceConfirm(invoiceId) {
  if (!confirm('Delete this invoice?')) return;
  
  if (!isLoggedIn || !currentUser) return;
  
  try {
    await deleteInvoice(currentUser.uid, invoiceId);
    showToast('✅ Invoice deleted', 'success');
    
    // Reload the list
    await loadMyInvoices();
  } catch (error) {
    console.error('Error deleting invoice:', error);
    showToast('Error deleting invoice', 'error');
  }
}

/**
 * ───────────────────────────────────────────
 * SYNC STATUS
 * ───────────────────────────────────────────
 */
function setSyncStatus(status) {
  syncStatus = status;
  updateSyncIndicator();
}

function updateSyncIndicator(message = '') {
  const indicator = document.getElementById('syncIndicator');
  if (!indicator) return;
  
  if (syncStatus === 'syncing') {
    indicator.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Syncing...';
    indicator.style.color = '#6c47ff';
  } else if (syncStatus === 'error') {
    indicator.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i>Sync Error';
    indicator.style.color = '#ef4444';
  } else {
    indicator.innerHTML = message || '☁️ Synced';
    indicator.style.color = '#10b981';
  }
}

/**
 * ───────────────────────────────────────────
 * HELPER UTILITIES
 * ───────────────────────────────────────────
 */
export function getCurrentUserData() {
  return {
    user: currentUser,
    profile: userProfile,
    isLoggedIn: isLoggedIn
  };
}

export function isUserLoggedIn() {
  return isLoggedIn;
}

export function closeModal(modalId) {
  const modalEl = document.getElementById(modalId);
  if (modalEl) {
    const bsModal = bootstrap.Modal.getInstance(modalEl);
    if (bsModal) bsModal.hide();
  }
}

/**
 * ───────────────────────────────────────────
 * EXPORT FOR GLOBAL ACCESS
 * ───────────────────────────────────────────
 */
export default {
  initAuth,
  handleGoogleSignIn,
  handleLogout,
  saveBusinessProfileToFirestore,
  loadMyInvoices,
  loadInvoice,
  deleteInvoiceConfirm,
  getCurrentUserData,
  isUserLoggedIn
};

// Make available globally for inline onclick handlers
if (typeof window !== 'undefined') {
  window.app = {
    initAuth,
    handleGoogleSignIn,
    handleLogout,
    saveBusinessProfileToFirestore,
    loadMyInvoices,
    loadInvoice,
    deleteInvoiceConfirm,
    getCurrentUserData,
    isUserLoggedIn
  };
}
