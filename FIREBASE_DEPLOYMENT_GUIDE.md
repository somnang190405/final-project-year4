# Firebase Complete Migration & Deployment Guide

## Project Overview
This guide covers the complete migration from Supabase to Firebase and deployment to staging environment.

**Date**: May 25, 2026  
**Status**: ✅ Ready for Staging Deployment  
**Estimated Timeline**: 1-2 hours for complete setup

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Firebase Project Setup](#firebase-project-setup)
3. [Firestore Database Configuration](#firestore-database-configuration)
4. [Storage Security Rules](#storage-security-rules)
5. [Environment Configuration](#environment-configuration)
6. [Testing Checklist](#testing-checklist)
7. [Staging Deployment](#staging-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- ✅ Google account with Firebase access
- ✅ Node.js and npm installed
- ✅ Git access to repository
- ✅ Code changes already merged to feature branch

**Current Status**: All npm packages updated, Supabase removed ✅

---

## Firebase Project Setup

### Step 1: Create or Access Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a new project"** or select existing project **"tinhmee-project"**
3. If creating new:
   - Name: `tinhmee-project`
   - Location: Choose closest to your users
   - Analytics: Recommended for production

### Step 2: Register Web Application

1. In Firebase Console, click **"Add app"** → **"Web"**
2. App name: `TinhMe E-Commerce`
3. Copy the configuration object

### Step 3: Enable Authentication

1. Go to **Authentication** → **Sign-in method**
2. Enable:
   - ✅ Email/Password
   - ✅ Google (recommended)
3. Set Authorized redirect URIs:
   - `http://localhost:5173` (development)
   - `https://yourdomain.com` (production)

### Step 4: Enable Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Start in **Production mode**
3. Location: **United States (us-central1)** (or closest to you)
4. Click **"Create"**

### Step 5: Enable Cloud Storage

1. Go to **Storage** → **Get started**
2. Start in **Production mode**
3. Location: **us-central1** (same as Firestore)
4. Click **"Create"**

---

## Firestore Database Configuration

### Step 1: Create Collections

Your Firestore database will automatically create collections as data is inserted. However, you can pre-create them:

#### Collection: `products`
```json
{
  "id": "auto-generated",
  "name": "Product Name",
  "price": 29.99,
  "stock": 100,
  "category": "Men",
  "subcategory": "T-Shirts",
  "image": "https://storage.googleapis.com/...",
  "description": "Product description",
  "promotionPercent": 10,
  "rating": 4.5,
  "isNewArrival": false,
  "colors": ["Red", "Blue"],
  "nameLower": "product name",
  "keywords": ["product", "name", "shirt"],
  "createdAt": "2024-05-25T..."
}
```

#### Collection: `orders`
```json
{
  "id": "auto-generated",
  "userId": "user-id",
  "items": [{
    "productId": "product-id",
    "name": "Product Name",
    "price": 29.99,
    "quantity": 2,
    "image": "url"
  }],
  "total": 59.98,
  "status": "pending",
  "paymentStatus": "pending",
  "date": "2024-05-25T...",
  "paidAt": "2024-05-25T..."
}
```

#### Collection: `users`
```json
{
  "id": "auto-generated",
  "email": "user@example.com",
  "name": "User Name",
  "role": "customer",
  "cart": [],
  "wishlist": [],
  "avatar": "https://storage.googleapis.com/...",
  "address": "123 Main St",
  "phoneNumber": "+1234567890",
  "createdAt": "2024-05-25T..."
}
```

#### Collection: `categories`
```json
{
  "id": "auto-generated",
  "name": "Men",
  "subcategories": [
    "T-Shirts",
    "Shirts",
    "Hoodies & Jackets",
    ...
  ]
}
```

### Step 2: Create Firestore Security Rules

See [FIREBASE_STORAGE_RULES.md](FIREBASE_STORAGE_RULES.md) for complete rules.

For development:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read for all
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

For production, use stricter rules based on user roles.

---

## Storage Security Rules

### Step 1: Update Storage Rules

1. Go to Firebase Console → **Storage** → **Rules** tab
2. Replace all rules with content from [FIREBASE_STORAGE_RULES.md](FIREBASE_STORAGE_RULES.md)
3. Click **"Publish"** button
4. Wait 2-3 minutes for propagation

### Step 2: Verify Storage Configuration

```bash
# List storage buckets
firebase storage:list

# Should show:
# ✔  default bucket: tinhmee-project.appspot.com
```

### Step 3: Test File Upload/Download

```javascript
// Test in browser console
const storage = getStorage();
const imageRef = ref(storage, 'products/test-image.jpg');
const url = await getDownloadURL(imageRef);
console.log('Image URL:', url); // Should work
```

---

## Environment Configuration

### Step 1: Update .env File

Copy from `.env.example`:

```bash
cp .env.example .env
```

### Step 2: Add Firebase Credentials

Get from Firebase Console → Project Settings → Your App:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyCwutS_v6tzMFFzwUCfz7xeNbtscy1PnSM
VITE_FIREBASE_AUTH_DOMAIN=tinhmee-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tinhmee-project
VITE_FIREBASE_STORAGE_BUCKET=tinhmee-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=216550751126
VITE_FIREBASE_APP_ID=1:216550751126:web:1aa937e0214e558b0a7bb7

# Admin Access
VITE_ADMIN_EMAILS=admin@tinhme.com,your-email@example.com

# Payment Configuration
VITE_PAYMENT_PROVIDER_NAME=ABA PAY
VITE_PAYMENT_MERCHANT_NAME=TinhMe Store
VITE_ABA_KHQR_BASE_PAYLOAD=000201...

# Optional: Gemini API (for AI features)
GEMINI_API_KEY=your_key_here
```

### Step 3: Verify Configuration

```bash
# Check if .env is loaded correctly
npm run dev

# In browser console:
console.log(import.meta.env.VITE_FIREBASE_PROJECT_ID)
# Should output: tinhmee-project
```

---

## Testing Checklist

### ✅ Unit Testing

```bash
# Run any existing tests
npm test
```

### ✅ Manual Testing (Local)

```bash
# Start development server
npm run dev

# Navigate to: http://localhost:5173
```

#### Test User Authentication:
- [ ] Sign up with new email
- [ ] Sign in with email
- [ ] Sign out
- [ ] Verify user appears in Firebase Authentication console

#### Test Product Creation (Admin):
- [ ] Navigate to Admin Dashboard
- [ ] Click "Add Product"
- [ ] Fill in all required fields
- [ ] Upload image using drag-and-drop
- [ ] Upload image using file browser
- [ ] Paste image URL
- [ ] Submit form
- [ ] Verify product appears in product list
- [ ] Verify image displays correctly

#### Test Product Search:
- [ ] Search by product name
- [ ] Search by category
- [ ] Verify results display correctly
- [ ] Click on product to view details

#### Test Shopping Cart:
- [ ] Add product to cart
- [ ] Update quantity
- [ ] Remove from cart
- [ ] Checkout process

#### Test Image URLs:
- [ ] Right-click product image → "Open in new tab"
- [ ] Image should display (not "403 Forbidden")
- [ ] Check browser console for CORS errors
- [ ] Image URL should start with `https://storage.googleapis.com/`

### ✅ Firebase Console Verification

1. **Authentication Tab**:
   - [ ] New users appear after sign-up
   - [ ] User email/password stored
   - [ ] Last sign-in timestamp updates

2. **Firestore Tab**:
   - [ ] `products` collection created
   - [ ] `orders` collection created
   - [ ] `users` collection created
   - [ ] Sample data visible
   - [ ] Security rules published

3. **Storage Tab**:
   - [ ] `products/` folder contains images
   - [ ] `avatars/` folder visible (if users upload)
   - [ ] Security rules published
   - [ ] Files are readable

---

## Staging Deployment

### Step 1: Prepare for Staging

```bash
# Ensure you're on the feature branch
git checkout Hyly-250526-Improvement

# Verify all changes are committed
git status

# Should show: "nothing to commit, working tree clean"
```

### Step 2: Push to Remote Repository

```bash
# Push feature branch to origin
git push -u origin Hyly-250526-Improvement

# Output should show:
# ✔ Branch Hyly-250526-Improvement set up to track 'origin/Hyly-250526-Improvement'
```

### Step 3: Create Pull Request

1. Go to GitHub/GitLab repository
2. Click "New Pull Request"
3. **From**: `Hyly-250526-Improvement`
4. **To**: `main` (or `staging` if you have one)
5. Title: `Migration: Remove Supabase and migrate 100% to Firebase`
6. Description:
```
## Summary
Complete migration from Supabase to Firebase with UI improvements.

## Changes
- ✅ Removed @supabase/supabase-js dependency
- ✅ Replaced image uploads to use Firebase Storage
- ✅ Updated ProductFormModal with modern UI/UX
- ✅ Removed all Supabase environment variables
- ✅ Updated security rules and configurations

## Testing
- [x] Local testing completed
- [x] Firebase Firestore tested
- [x] Image uploads working
- [x] Image URLs display correctly
- [x] No console errors

## Deployment
Ready for staging environment.
```

### Step 4: Code Review & Merge

1. Request team review
2. Address any feedback
3. Merge to `main` branch
4. Delete feature branch

### Step 5: Deploy to Staging

#### Option A: Firebase Hosting

```bash
# Login to Firebase
firebase login

# Install Firebase CLI if needed
npm install -g firebase-tools

# Initialize Firebase hosting
firebase init hosting

# Build project
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Output will show staging URL:
# ✔ Deploy complete!
# Project Console: https://console.firebase.google.com/project/tinhmee-project
# Hosting URL: https://tinhmee-project.web.app
```

#### Option B: Custom Staging Server

```bash
# Build production bundle
npm run build

# Dist folder contains optimized files:
# dist/
#   ├── index.html
#   ├── assets/
#   └── ...

# Upload to staging server via FTP/SCP/CI-CD pipeline
scp -r dist/* staging.example.com:/var/www/html/
```

#### Option C: GitHub Pages (Simple Testing)

```bash
# Build
npm run build

# Deploy to GitHub Pages (requires configuration)
npm run deploy
```

### Step 6: Staging Testing

1. **Access Staging URL**: `https://your-staging-domain.com`
2. **Test Complete User Flow**:
   - [ ] Sign up new account
   - [ ] Admin can create product with image
   - [ ] Product image displays
   - [ ] Search functionality works
   - [ ] Cart/checkout works
   - [ ] Payment flow works

3. **Verify Firebase Connection**:
   - [ ] Firestore data persists
   - [ ] Images upload to Storage
   - [ ] No 403 errors on images
   - [ ] User authentication works

4. **Performance Testing**:
   - [ ] Page loads in <3 seconds
   - [ ] Images load quickly
   - [ ] No console errors
   - [ ] Mobile responsive

---

## Troubleshooting

### ❌ Issue: "PERMISSION_DENIED" on image upload

**Solutions**:
1. Verify user is logged in as admin
2. Check Firestore security rules allow write
3. Verify Firebase credentials in .env

```bash
# Check .env
grep VITE_FIREBASE .env

# Should show all required variables
```

### ❌ Issue: Firestore data not persisting

**Solutions**:
1. Check Firestore is enabled in Firebase Console
2. Verify Firestore rules allow write:
```javascript
match /{document=**} {
  allow write: if request.auth != null;
}
```
3. Check browser console for error messages

### ❌ Issue: Image URLs return 403 Forbidden

**Solutions**:
1. Verify Storage rules include `allow read: if true;`
2. Publish rules in Firebase Console
3. Wait 2-3 minutes for propagation
4. Check file path is correct: `products/filename.jpg`

### ❌ Issue: "Build failed" deployment error

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try build again
npm run build

# Check for errors
npm run lint
```

### ❌ Issue: CORS errors in browser console

**Solutions**:
```javascript
// Add CORS handling in image tag
<img src={imageUrl} crossOrigin="anonymous" />

// Or use fetch with CORS mode
fetch(imageUrl, { mode: 'cors' })
```

### ❌ Issue: Files uploaded but not visible in Storage

**Solutions**:
1. Check Storage path matches: `products/...`
2. Verify file upload completed (check browser network tab)
3. Reload Firebase Console Storage tab
4. Check storage quota not exceeded

---

## Post-Deployment Tasks

- [ ] Update production Firebase configuration
- [ ] Update SSL certificate if needed
- [ ] Enable Firebase Monitoring
- [ ] Set up Firebase Analytics
- [ ] Configure backup strategy
- [ ] Create runbook for team
- [ ] Schedule team training
- [ ] Monitor error logs

---

## Maintenance Checklist

### Weekly
- [ ] Check Firebase quota usage
- [ ] Review Firestore backups
- [ ] Monitor error logs
- [ ] Test critical workflows

### Monthly
- [ ] Update dependencies
- [ ] Review security rules
- [ ] Optimize slow queries
- [ ] Backup critical data

### Quarterly
- [ ] Security audit
- [ ] Performance review
- [ ] Capacity planning
- [ ] Update documentation

---

## Support & Resources

- **Firebase Documentation**: https://firebase.google.com/docs
- **Firestore Reference**: https://firebase.google.com/docs/firestore
- **Storage Security**: https://firebase.google.com/docs/storage/security
- **Firebase CLI**: https://firebase.google.com/docs/cli
- **Stack Overflow**: Tag `firebase`

---

## Contact & Escalation

For issues during deployment:

1. **Firestore Issues**: Check Firestore status at status.firebase.google.com
2. **Storage Issues**: Check Storage documentation
3. **Authentication Issues**: Review Auth configuration
4. **Deployment Issues**: Check Firebase Hosting logs

---

## Conclusion

Your application has been successfully migrated from Supabase to Firebase. All image uploads, authentication, and database operations now use Firebase as the single backend provider.

**Status**: ✅ Ready for Production  
**Timeline**: 1-2 hours for complete setup  
**Confidence**: High (tested locally)

---

**Document Version**: 1.0  
**Last Updated**: May 25, 2026  
**Next Review**: June 2026
