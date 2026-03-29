# Fix Google Login - Unauthorized Domain Error

## Issue: `auth/unauthorized-domain`

This error occurs because `localhost:5174` is not authorized in your Firebase project settings.

## Step-by-Step Fix:

### 1. Go to Firebase Console
- Visit: https://console.firebase.google.com
- Select your project: **marketlens-ai-2a0a8**

### 2. Navigate to Authentication Settings
- Click **Authentication** in the left sidebar
- Go to **Settings** (gear icon ⚙️ at the top)
- Scroll down to **Authorized domains**

### 3. Add Required Domains
Click **"Add domain"** and add:
1. `localhost`
2. `localhost:5173`
3. `localhost:5174`
4. `127.0.0.1`
5. `127.0.0.1:5174`

### 4. Verify Google Provider is Enabled
- Go to **Authentication** → **Sign-in method**
- Find **Google** in the list
- Make sure the toggle is **ON (enabled)**
- If not, click it and:
  - Enable the toggle
  - Add your support email
  - Click **Save**

### 5. Test Again
- Refresh your browser
- Try Google login again
- Should work without the unauthorized domain error

## Alternative: Use Firebase Emulator (for development)

If you want to test locally without Firebase console changes:

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Run: `firebase emulators:start --only auth`
3. Update firebase.js to use emulator when in development

## Current Firebase Config:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC28N8gzL8TCBoXUMKXi-zdlkShAEOv4ec",
  authDomain: "marketlens-ai-2a0a8.firebaseapp.com",
  projectId: "marketlens-ai-2a0a8",
  storageBucket: "marketlens-ai-2a0a8.firebasestorage.app",
  messagingSenderId: "586150415826",
  appId: "1:586150415826:web:2acf12323b5444ab614c0b"
};
```

## Troubleshooting:
- **Clear browser cache** after adding domains
- **Incognito mode** to test fresh session
- **Check port** - make sure you're using 5174, not 5173
- **Verify project ID** - should be "marketlens-ai-2a0a8"

The fix should resolve the `auth/unauthorized-domain` error completely.
