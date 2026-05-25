# Firebase Storage Security Rules Configuration

## Overview
This document contains the security rules for Firebase Storage. These rules control access to product images and user avatars, ensuring proper permissions while maintaining public read access for images.

## Configuration

### 1. Access Firebase Storage Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **tinhmee-project**
3. Navigate to **Storage** → **Rules** tab
4. Replace the existing rules with the configuration below

---

## Security Rules

### Paste these rules into Firebase Console Storage Rules:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Allow anyone to read product images
    match /products/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null 
        && hasAdminRole(request.auth.uid);
    }
    
    // Allow authenticated users to read and write their own avatars
    match /avatars/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null 
        && request.auth.uid == userId 
        && hasAdminRole(request.auth.uid);
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
  
  // Helper function to check if user is admin
  function hasAdminRole(uid) {
    return exists(/databases/(default)/documents/users/{uid}) &&
           get(/databases/(default)/documents/users/{uid}).data.role == 'admin';
  }
}
```

---

## Alternative: Simplified Rules (Development Only)

If you want simpler rules for development/testing (not recommended for production):

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Public read, authenticated write for products
    match /products/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Public read, authenticated write for avatars
    match /avatars/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Deny everything else
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Production Rules (Strict)

For maximum security in production:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Product images: public read, admin-only write
    match /products/{document=**} {
      allow read: if true;
      allow write: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // User avatars: owner can read/write, public can read
    match /avatars/{uid}/{document=**} {
      allow read: if true;
      allow create, update: if request.auth.uid == uid && isAdmin();
      allow delete: if request.auth.uid == uid && isAdmin();
    }
    
    // Block everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
  
  // Helper: Check if user is authenticated admin
  function isAdmin() {
    return request.auth != null && 
           request.auth.token.email in [
             'admin@tinhme.com',
             'your-admin-email@example.com'
           ];
  }
}
```

---

## File Upload Paths

### Product Images
- **Path**: `products/{uniqueFileName}`
- **Naming**: `{timestamp}-{randomId}-{productName}-{originalFilename}`
- **Example**: `1716624000000-a1b2c3d4-blue-shirt-product.jpg`
- **Access**: Public read, admin write

### User Avatars
- **Path**: `avatars/{userId}/{uniqueFileName}`
- **Naming**: `{timestamp}-{randomId}-{userId}-{originalFilename}`
- **Example**: `avatars/user123/1716624000000-a1b2c3d4-user123-avatar.jpg`
- **Access**: Public read, owner write

---

## Common Issues & Solutions

### ❌ Issue: "Permission denied" error when uploading

**Cause**: User doesn't have write permission
- Check that you're logged in as admin
- Verify email is in `VITE_ADMIN_EMAILS`
- Wait a few minutes for security rules to propagate

**Solution**:
```javascript
// Use simplified rules during development:
match /products/{allPaths=**} {
  allow read, write: if request.auth != null;
}
```

---

### ❌ Issue: Images uploaded but URLs return 403 Forbidden

**Cause**: Public read permission not enabled

**Solution**: Ensure rules include:
```javascript
match /products/{allPaths=**} {
  allow read: if true;  // ← Public read enabled
}
```

---

### ❌ Issue: URL shows "storage.googleapis.com" but returns 403

**Cause**: Storage security rules are too restrictive

**Solution**:
1. Go to Storage Rules in Firebase Console
2. Verify `allow read: if true;` is set for products path
3. Click "Publish" button to apply changes
4. Wait 2-3 minutes for propagation

---

### ❌ Issue: Image displays in preview but not on published site

**Cause**: CORS (Cross-Origin) configuration issue

**Solution**:
1. Storage URLs should automatically work with CORS
2. If issues persist, add CORS header in your app when displaying images:
```html
<img src="https://storage.googleapis.com/bucket/image.jpg" crossOrigin="anonymous" />
```

---

## Testing Your Rules

### Test with Firebase Console Storage Emulator:

```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools

# Initialize emulator
firebase init emulator

# Start emulator
firebase emulators:start --only storage
```

---

## Deployment Checklist

- [ ] Security rules are published to Firebase Console
- [ ] Verified `allow read: if true;` for products
- [ ] Verified authenticated users can write to products
- [ ] Tested image upload functionality
- [ ] Tested image URL access in browser
- [ ] Verified images display on website
- [ ] Checked browser console for CORS errors
- [ ] Verified file size limits are enforced (5MB max in app)
- [ ] Admin users can upload images
- [ ] Non-admin users get permission errors (if using strict rules)

---

## Important Notes

1. **Rules Propagation**: Changes to security rules may take 2-3 minutes to take effect
2. **No SQL Injections**: Storage rules use JSON syntax, no SQL needed
3. **File Size Limits**: Enforce in app code (5MB limit), not in rules
4. **CORS**: Firebase Storage handles CORS automatically for public read
5. **Performance**: Public read is optimized for CDN distribution

---

## Related Documentation

- [Firebase Storage Security Rules Docs](https://firebase.google.com/docs/storage/security)
- [Firebase Auth Token Documentation](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Storage Best Practices](https://firebase.google.com/docs/storage/best-practices)

---

**Last Updated**: May 25, 2026
**Status**: ✅ Ready for Production
