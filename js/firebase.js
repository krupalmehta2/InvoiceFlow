/**
 * ═══════════════════════════════════════════════════════════
 * InvoiceFlow — firebase.js
 * Firebase v10 Modular SDK Integration
 * ═══════════════════════════════════════════════════════════
 */

// Firebase v10 Modular Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, serverTimestamp, setDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/**
 * ───────────────────────────────────────────
 * FIREBASE CONFIG
 * ───────────────────────────────────────────
 * Replace these with your Firebase project credentials
 * Get from: https://console.firebase.google.com → Project Settings
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth & Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google Provider
googleProvider.addScope('profile');
googleProvider.addScope('email');

/**
 * ───────────────────────────────────────────
 * AUTH FUNCTIONS
 * ───────────────────────────────────────────
 */

/**
 * Sign in with Google popup
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Create/update user document in Firestore
    await createOrUpdateUser(user);
    
    return user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    if (error.code !== 'auth/popup-closed-by-user') {
      throw error;
    }
  }
}

/**
 * Sign out current user
 */
export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-Out Error:", error);
    throw error;
  }
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * ───────────────────────────────────────────
 * FIRESTORE USER FUNCTIONS
 * ───────────────────────────────────────────
 */

/**
 * Create or update user profile in Firestore
 */
async function createOrUpdateUser(user) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // New user
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Default empty business profile
        businessProfile: {
          bName: '',
          bOwner: '',
          bGst: '',
          bPhone: '',
          bEmail: '',
          bWebsite: '',
          bAddress: '',
          bBankName: '',
          bAccNo: '',
          bIfsc: '',
          bUpi: '',
          bLogoUrl: ''
        }
      });
    } else {
      // Update existing user
      await updateDoc(userRef, {
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error creating/updating user:", error);
    throw error;
  }
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
}

/**
 * Update business profile in Firestore
 */
export async function updateBusinessProfile(userId, profileData) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      businessProfile: profileData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating business profile:", error);
    throw error;
  }
}

/**
 * ───────────────────────────────────────────
 * FIRESTORE INVOICE FUNCTIONS
 * ───────────────────────────────────────────
 */

/**
 * Save invoice to Firestore
 */
export async function saveInvoice(userId, invoiceData) {
  try {
    const invoiceId = invoiceData.invNumber || `inv-${Date.now()}`;
    const invoiceRef = doc(db, 'invoices', `${userId}_${invoiceId}`);
    
    await setDoc(invoiceRef, {
      ...invoiceData,
      userId: userId,
      invoiceId: invoiceId,
      createdAt: invoiceData.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    return invoiceId;
  } catch (error) {
    console.error("Error saving invoice:", error);
    throw error;
  }
}

/**
 * Get single invoice from Firestore
 */
export async function getInvoice(userId, invoiceId) {
  try {
    const invoiceRef = doc(db, 'invoices', `${userId}_${invoiceId}`);
    const invoiceSnap = await getDoc(invoiceRef);
    
    if (invoiceSnap.exists()) {
      return invoiceSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching invoice:", error);
    throw error;
  }
}

/**
 * Get all invoices for current user (sorted by date)
 */
export async function getInvoicesByUser(userId) {
  try {
    const invoicesRef = collection(db, 'invoices');
    const q = query(invoicesRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const invoices = [];
    querySnapshot.forEach((doc) => {
      invoices.push({
        docId: doc.id,
        ...doc.data()
      });
    });
    
    // Sort by updatedAt descending
    invoices.sort((a, b) => {
      const aTime = a.updatedAt?.toMillis?.() || 0;
      const bTime = b.updatedAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    
    return invoices;
  } catch (error) {
    console.error("Error fetching invoices:", error);
    throw error;
  }
}

/**
 * Delete invoice from Firestore
 */
export async function deleteInvoice(userId, invoiceId) {
  try {
    const invoiceRef = doc(db, 'invoices', `${userId}_${invoiceId}`);
    await deleteDoc(invoiceRef);
  } catch (error) {
    console.error("Error deleting invoice:", error);
    throw error;
  }
}

/**
 * ───────────────────────────────────────────
 * EXPORT FOR USE IN APP
 * ───────────────────────────────────────────
 */
export default {
  signInWithGoogle,
  signOutUser,
  getCurrentUser,
  onAuthStateChange,
  getUserProfile,
  updateBusinessProfile,
  saveInvoice,
  getInvoice,
  getInvoicesByUser,
  deleteInvoice
};
