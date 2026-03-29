# Firebase Setup Instructions

## Current Issue
Google login is failing because the Firebase project only has `localhost:5173` authorized, but the app is running on `localhost:5174`.

## Solution Steps:

### 1. Go to Firebase Console
Visit: https://console.firebase.google.com/

### 2. Select your project
Project name: `marketlens-ai-2a0a8`

### 3. Add Authorized Domain
1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Click **Add domain**
3. Add: `localhost:5174`
4. Save

### 4. Enable Google Sign-in Provider
1. Go to **Authentication** → **Sign-in method**
2. Click on **Google**
3. Make sure it's **Enabled**
4. Add your email for testing if needed
5. Save

### 5. Test the application
1. Refresh the browser
2. Try clicking "Continue with Google" button
3. It should now open the Google sign-in popup

## Debug Information
The app is currently running on: http://localhost:5174
Firebase project ID: marketlens-ai-2a0a8

## Common Issues & Solutions

### Issue: "auth/unauthorized-domain" error
**Solution**: Add `localhost:5174` to authorized domains in Firebase Console

### Issue: "auth/popup-closed-by-user" error
**Solution**: This usually means the popup was blocked. Allow popups for localhost

### Issue: "auth/popup-blocked" error
**Solution**: Click the popup blocker icon in browser and allow popups

### Issue: Environment variables not loading
**Solution**: Restart the development server after changing .env files
