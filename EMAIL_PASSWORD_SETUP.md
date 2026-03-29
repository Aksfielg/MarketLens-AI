# Email/Password Authentication Setup

## Required Firebase Configuration

### Step 1: Enable Email/Password Sign-in Method
1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: `marketlens-ai-2a0a8`
3. Navigate to **Authentication** → **Sign-in method**
4. Find **Email/Password** in the list
5. Click on it and **Enable** the toggle
6. Click **Save**

### Step 2: Test with a Real Account

#### Option A: Create Account via Signup Page
1. Go to http://localhost:5174/signup
2. Fill out the signup form with real email and password
3. Complete the signup process
4. Try logging in with those credentials

#### Option B: Create Test User in Firebase Console
1. Go to Firebase Console → Authentication → Users
2. Click **Add user**
3. Enter:
   - Email: `test@example.com`
   - Password: `test123456`
4. Click **Add user**
5. Try logging in with these credentials

### Step 3: Common Issues & Solutions

#### Issue: "auth/user-not-found"
**Solution**: User doesn't exist. Create account first via signup or Firebase Console.

#### Issue: "auth/wrong-password"
**Solution**: Incorrect password. Check the exact password in Firebase Console.

#### Issue: "auth/invalid-email"
**Solution**: Email format is invalid. Use proper email format.

#### Issue: "auth/too-many-requests"
**Solution**: Too many failed attempts. Wait a few minutes before trying again.

#### Issue: "auth/invalid-credential"
**Solution**: Either email or password is wrong. Double-check both.

### Step 4: Testing Checklist
- [ ] Email/Password provider is enabled in Firebase Console
- [ ] Test user exists in Firebase Authentication → Users
- [ ] Using correct email format
- [ ] Using exact password (case-sensitive)
- [ ] Not rate-limited (wait if too many attempts)

### Debug Information
The login function now provides specific error messages based on Firebase error codes. Check the browser console for detailed error information if login still fails.
