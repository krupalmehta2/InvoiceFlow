/**
 * ═══════════════════════════════════════════════════════════
 * Firebase Configuration
 * ═══════════════════════════════════════════════════════════
 * 
 * ⚠️ IMPORTANT:
 * - Get your credentials from Firebase Console → Project Settings
 * - NEVER commit this file to version control
 * - Add "firebaseConfig.js" to .gitignore
 * 
 * Steps:
 * 1. Go to https://console.firebase.google.com
 * 2. Select your project
 * 3. Click Project Settings (gear icon)
 * 4. Scroll to "Your apps" → Click Web icon (</>)
 * 5. Copy the firebaseConfig object
 * 6. Replace the values below
 * 7. Rename this file from .example to actual firebaseConfig.js
 */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "1234567890123",
  appId: "1:1234567890123:web:abcdef1234567890abcdef"
};

export default firebaseConfig;
