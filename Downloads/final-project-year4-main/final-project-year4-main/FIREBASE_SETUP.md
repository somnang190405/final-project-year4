# Firebase Setup & Configuration Guide

## Firebase Project Overview

Your project uses **Firebase as the complete backend solution**. This document explains setup and configuration.

---

## Prerequisites

- Firebase account (free tier available at [firebase.google.com](https://firebase.google.com))
- A Firebase project created
- Node.js 18+ installed locally

---

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add Project"**
3. Enter project name: `TinhMe-ECommerce`
4. Enable Google Analytics (optional)
5. Select region (closest to users)
6. Click **"Create Project"** and wait for completion

---

## Step 2: Enable Firebase Services

### 2A. Enable Authentication
1. In Firebase Console → **Authentication**
2. Click **"Get started"**
3. Under **Sign-in providers**, click **Email/Password**
4. Toggle **Enable**
5. Click **Save**

### 2B. Create Firestore Database
1. In Firebase Console → **Firestore Database**
2. Click **"Create database"**
3. Choose region (same as project)
4. **Start in production mode** (we'll add security rules)
5. Click **"Enable"**

### 2C. Enable Cloud Storage
1. In Firebase Console → **Cloud Storage**
2. Click **"Get started"**
3. Select region (same as Firestore)
4. Click **"Done"**

---

## Step 3: Get Firebase Web Credentials

1. In Firebase Console → **Project Settings** (gear icon)
2. Go to **General** tab
3. Scroll down to "Your apps"
4. Click **Web** icon (```</> ```)
5. Register app name: `tinhme-web`
6. Copy the Firebase config object

```javascript
// Example (your values will differ)
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "tinhme.firebaseapp.com",
  projectId: "tinhme-ecommerce",
  storageBucket: "tinhme.appspot.com",
  messagingSenderId: "123...",
  appId: "1:123...:web:abc...",
};
```

---

## Step 4: Configure Environment Variables

1. **Copy `.env.example` to `.env`**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env`** with your Firebase credentials
   ```
   VITE_FIREBASE_API_KEY=<your_api_key>
   VITE_FIREBASE_AUTH_DOMAIN=<your_auth_domain>
   VITE_FIREBASE_PROJECT_ID=<your_project_id>
   VITE_FIREBASE_STORAGE_BUCKET=<your_storage_bucket>
   VITE_FIREBASE_MESSAGING_SENDER_ID=<your_sender_id>
   VITE_FIREBASE_APP_ID=<your_app_id>
   
   # Payment Configuration
   VITE_ABA_KHQR_BASE_PAYLOAD=000201...  # Get from ABA Pay
   ```

3. **Do NOT commit `.env`** - Already in `.gitignore`

---

## Step 5: Deploy Firestore Security Rules

1. **In Firebase Console**, go to **Firestore → Rules**
2. **Replace the default rules** with security rules from `firestore.rules`
3. Click **"Publish"**

### What These Rules Do:

```firestore
// Users can only access their own profile
match /users/{userId} {
  allow read, update: if request.auth.uid == userId;
  allow create: if request.auth.uid != null;
}

// Anyone can read products, but only admins can write
match /products/{document=**} {
  allow read: if true;
  allow write: if getUserRole(request.auth.uid) == "ADMIN";
}

// Users can see their own orders
match /orders/{orderId} {
  allow read, write: if getUserRole(request.auth.uid) == "ADMIN" 
                        || resource.data.userId == request.auth.uid;
}
```

---

## Step 6: Deploy Cloud Storage Rules

1. **In Firebase Console**, go to **Storage → Rules**
2. **Replace with rules** from `storage.rules`
3. Click **"Publish"**

### What These Rules Do:

```
// Only authenticated users can upload
match /bucket/o {
  match /{allPaths=**} {
    allow read: if request.auth != null;
    allow write: if request.auth != null 
                    && request.resource.size < 5000000; // 5MB limit
  }
}
```

---

## Step 7: Create Sample Data (Optional but Recommended)

### Option A: Use Mock Data (Already in Project)
The app has mock data in `src/services/mockBackend.ts` for testing without real data.

### Option B: Manually Add Data in Firebase Console

1. Go to **Firestore → Data**
2. Click **"Start collection"** and create these collections:

#### Collection: `users`
```javascript
{
  id: "user_doc_id",
  name: "John Doe",
  email: "john@example.com",
  role: "CUSTOMER", // or "ADMIN"
  avatar: "",
  wishlist: [],
  address: "123 Main St",
  phoneNumber: "855123456789",
  city: "Phnom Penh"
}
```

#### Collection: `products`
```javascript
{
  id: "product_id",
  name: "Nike Air Max",
  category: "Men",
  subcategory: "Shoes",
  price: 120,
  promotionPercent: 10,
  stock: 50,
  isNewArrival: true,
  image: "<URL from Cloud Storage>",
  description: "Comfortable sports shoe",
  rating: 4.5,
  colors: ["#000000", "#FFFFFF"],
  sizes: ["40", "41", "42"]
}
```

#### Collection: `categories`
```javascript
{
  id: "men",
  name: "Men"
}
```

#### Collection: `orders`
```javascript
{
  id: "order_id",
  userId: "user_doc_id",
  items: [
    { productId: "product_id", quantity: 2, price: 120 }
  ],
  totalAmount: 240,
  status: "Pending",
  paymentStatus: "Completed",
  shippingAddress: "123 Main St",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## Step 8: Set Up ABA Pay KHQR (Optional but Recommended)

### What is KHQR?
**KHMER Quick Response** - Payment QR code standard in Cambodia

### Setup Steps:
1. Contact ABA Pay for merchant account
2. Get your KHQR payload (starts with `000201...`)
3. Add to `.env`:
   ```
   VITE_ABA_KHQR_BASE_PAYLOAD=000201018801210...
   ```
4. Restart dev server: `npm run dev`

---

## Local Development Testing

### 1. Start Development Server
```bash
npm install
npm run dev
```

### 2. Create Test Accounts
- Visit `http://localhost:3000`
- Use "Sign Up" to create test customer account
- Create admin account by manually adding to Firestore with `role: "ADMIN"`

### 3. Test Admin Features
- Login with admin account
- Go to Admin Dashboard `/admin`
- Test User Management, Products, Orders, Sales

### 4. Test Payment Flow
- Add products to cart as customer
- Go to checkout
- Try KHQR QR code generation (if configured)

---

## Production Deployment

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase Hosting
```bash
firebase init hosting
# Select your project
# Build directory: dist
```

### 4. Build for Production
```bash
npm run build
```

### 5. Deploy to Firebase Hosting
```bash
firebase deploy
```

Your app will be live at: `https://[project-id].web.app`

---

## Monitoring & Maintenance

### Check Firebase Usage
1. Firebase Console → **Usage**
2. Monitor:
   - Firestore reads/writes
   - Storage bandwidth
   - Authentication events

### Backup Data
1. Firebase Console → **Firestore → Import/Export**
2. Export regularly to Cloud Storage

### Enable Analytics (Optional)
1. Firebase Console → **Analytics** → Setup collection
2. Understand user behavior

---

## Common Issues & Solutions

### Issue: "Permission denied" errors
**Solution:**
- Check security rules are deployed
- Verify user is authenticated
- Check user has correct role

### Issue: "Document not found"
**Solution:**
- Verify collection name is correct (case-sensitive)
- Check document ID exists
- Ensure security rules allow read access

### Issue: "Storage quota exceeded"
**Solution:**
- Check `.env` for correct bucket name
- Upgrade Firebase plan if needed
- Delete old/unused files

### Issue: QR code not generating
**Solution:**
- Check `VITE_ABA_KHQR_BASE_PAYLOAD` in `.env`
- Ask ABA Pay for valid payload
- Verify payload format starts with `000201...`

### Issue: Build fails
**Solution:**
```bash
rm -rf dist
npm run build
```

---

## Security Checklist

- ✅ Security rules deployed
- ✅ Storage access controlled
- ✅ `.env` not committed to git
- ✅ No hardcoded credentials in code
- ✅ HTTPS enabled (automatic on Firebase Hosting)
- ✅ Firebase Auth configured
- ✅ Admin user created with proper role

---

## Testing Accounts

### Admin Account
- Email: `admin@example.com`
- Password: Set your own
- Role: ADMIN (set manually in Firestore)

### Customer Account
- Email: `customer@example.com`
- Password: Set your own
- Role: CUSTOMER

Create these in Firebase Auth console → Users tab

---

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)

---

**Your project is now fully configured and ready for development!**
