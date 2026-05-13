# Deployment Guide & Production Checklist

**For Production Release & Advisor Demonstration**

---

## 🚀 Pre-Deployment Checklist

### Code Quality
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No console warnings or errors
- [ ] All imports are working
- [ ] No unused variables or dead code
- [ ] Environment variables configured

### Testing
- [ ] Manual testing completed (see DEFENSE_CHECKLIST.md)
- [ ] All features working as expected
- [ ] Error handling tested
- [ ] Mobile responsive verified
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

### Security
- [ ] `.env` file is in `.gitignore` ✓ (already done)
- [ ] No secrets hardcoded in code
- [ ] Firebase security rules deployed
- [ ] Admin users properly configured
- [ ] HTTPS enabled (automatic on Firebase)

### Documentation
- [ ] README.md updated
- [ ] ARCHITECTURE.md complete
- [ ] FIREBASE_SETUP.md finished
- [ ] DEFENSE_CHECKLIST.md ready
- [ ] Code comments are clear (not over-documented)

---

## 📦 Local Build & Preview

### Step 1: Clean Build
```bash
rm -rf dist node_modules package-lock.json
npm install
npm run build
```

### Step 2: Fix Any Build Errors
If build fails:
```bash
npm install --legacy-peer-deps  # If peer dependency conflicts
npm install                      # Try fresh install
npm run build                    # Build again
```

### Step 3: Preview Production Build Locally
```bash
npm run preview
```
- Opens at `http://localhost:4173`
- Test all features in production mode
- Check asset sizes in Network tab

### Step 4: Test Production Features
- [ ] Login/logout works
- [ ] All pages load
- [ ] Images display correctly
- [ ] No missing assets
- [ ] Performance acceptable
- [ ] Responsive on mobile

---

## 🔧 Optimize for Production

### Performance Optimization

#### 1. Build Output Analysis
```bash
# Check build size
npm run build 2>&1 | tail -20
```

#### 2. Code Splitting Already Done
- Admin dashboard loads lazy
- Other pages load on demand
- Good for performance ✓

#### 3. CSS Optimization
Tailwind already optimizes for production:
```bash
# Already: purges unused CSS
# Already: minifies CSS
```

#### 4. Image Optimization
Check your images:
```bash
# Expected in Cloud Storage or public/
# Keep images < 500KB each
# Use WebP where possible
```

---

## 🌐 Deploy to Firebase Hosting

### Prerequisites
1. **Firebase CLI installed**
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project created** (see FIREBASE_SETUP.md)

3. **Logged into Firebase**
   ```bash
   firebase login
   ```

### Deployment Steps

#### Step 1: Initialize Firebase
```bash
firebase init hosting
```

When prompted:
```
? What do you want to use as your public directory? dist
? Configure as a single-page app? Yes
? Set up automatic builds and deploys with GitHub? No (for now)
? Overwrite dist/404.html? No
? Overwrite dist/index.html? No
```

#### Step 2: Build for Production
```bash
npm run build
```

Result: Production files in `dist/` directory

#### Step 3: Deploy
```bash
firebase deploy
```

Output:
```
✓ Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project
Hosting URL: https://your-project.web.app
Hosting URL: https://your-project.firebaseapp.com
```

#### Step 4: Visit Your Live Site
Open: `https://your-project.web.app`

---

## ✅ Post-Deployment Verification

### Functional Tests
- [ ] Login still works (real Firebase)
- [ ] Products load from Firestore
- [ ] Cart items persist
- [ ] Can create order
- [ ] Admin features available
- [ ] Search functionality works
- [ ] Images display correctly

### Performance Check
- [ ] Page loads in < 3 seconds
- [ ] Interactions are responsive
- [ ] No 404 errors (Network tab)
- [ ] No CORS issues

### Security Verification
- [ ] HTTPS is enforced (lock icon)
- [ ] Sensitive data never logged
- [ ] Admin features require login
- [ ] Security rules block unauthorized access

### Monitoring
```
Firebase Console → Hosting → Analytics
Check:
- Page views
- Bounce rate
- Average session duration
```

---

## 🔄 Continuous Deployment (Optional)

### Deploy from Git (GitHub)

1. **Push code to GitHub**
2. **Connect GitHub to Firebase**
   ```bash
   firebase hosting:channel:deploy main
   ```
3. **Auto-deploy on push to `main` branch**

Benefit: Every code push automatically deploys.

---

## 🚨 Rollback Plan

### If Something Goes Wrong

#### Option 1: Deploy Previous Version
```bash
# First, rebuild your previous code
git checkout previous-commit-hash
npm install
npm run build
firebase deploy
```

#### Option 2: Release a New Version
```bash
# Fix the bug
git commit -am "Fix issue"
npm run build
firebase deploy
```

#### Option 3: Check Deploy History
```bash
firebase hosting:releases --project=your-project
```

---

## 📊 Monitor Production

### Firebase Console Monitoring

1. **Hosting Tab**
   - View traffic
   - Check for errors
   - Monitor uptime

2. **Firestore Tab**
   - Monitor reads/writes
   - Check for overages
   - View query performance

3. **Storage Tab**
   - Monitor bandwidth usage
   - Check file sizes
   - Delete old temp files

4. **Authentication Tab**
   - See active users
   - Monitor sign-ups
   - Check failed logins

### Set Up Caching

In `firebase.json`:
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "headers": [{
      "source": "**/*.{js,css}",
      "headers": [{
        "key": "Cache-Control",
        "value": "public, max-age=31536000"
      }]
    }]
  }
}
```

Then deploy:
```bash
firebase deploy
```

---

## 📱 Redirect WWW to Non-WWW (Optional)

In Firebase Hosting, set up redirect:
```bash
firebase hosting:sites:create your-project
```

This ensures:
- `www.your-project.com` → `your-project.com`
- Prevents duplicate content

---

## 🆘 Common Deployment Issues

### Issue: "Cannot find dist directory"
**Solution:**
```bash
npm run build  # Generate dist/
firebase deploy
```

### Issue: "Page shows 404"
**Solution:**
- Check `firebase.json` has `"rewrites"` for SPA:
```json
"rewrites": [{ "source": "**", "destination": "/index.html" }]
```
- Run: `firebase deploy`

### Issue: "Firestore reads/writes failing"
**Solution:**
- Check security rules in Firebase Console
- Verify .env has correct Firebase config
- Check rules allow public read (for products)

### Issue: "Images not loading in production"
**Solution:**
- Images should be in Cloud Storage
- Check storage.rules allow public read
- Verify image URLs are correct

### Issue: "Build fails with TypeScript errors"
**Solution:**
```bash
npm install
npm run build -- --mode=production
```

---

## 📈 Performance Monitoring

### Check Performance Metrics
```bash
npm run build
# Look for output like:
# ✓ dist/index.html  (5.5 kB)
# ✓ dist/assets/main-xxx.js  (150.2 kB)
# ✓ dist/assets/admin-xxx.js  (85.1 kB)
```

### Good Targets:
- Main bundle < 200KB
- Total assets < 500KB
- Load time < 3 seconds

### Optimize if Needed:
1. Remove unused dependencies
2. Lazy load heavy components
3. Compress images
4. Enable gzip compression

---

## 🔐 Production Security Checklist

- [ ] `.env` file is NOT committed
- [ ] `.gitignore` prevents .env upload
- [ ] No API keys in source code
- [ ] Firebase rules are restrictive
- [ ] HTTPS is enforced
- [ ] Admin users created securely
- [ ] Passwords are strong
- [ ] Firestore backup enabled
- [ ] Monitoring alerts set up

---

## 📞 Support & Maintenance

### Monthly Tasks
- [ ] Monitor Firebase usage
- [ ] Check for errors in console
- [ ] Update dependencies (carefully)
- [ ] Review user feedback

### Quarterly Tasks
- [ ] Performance audit (npm audit)
- [ ] Security review
- [ ] Update documentation
- [ ] Plan new features

### Yearly Tasks
- [ ] Major version updates
- [ ] Full security audit
- [ ] Scalability review
- [ ] User research

---

## 🎓 For Your Advisor

**What to Show During Defense:**

1. **Development Environment**
   ```bash
   npm run dev
   # Shows React running locally
   ```

2. **Production Build**
   ```bash
   npm run build
   npm run preview
   # Shows optimized production version
   ```

3. **Deployment**
   Show advisor the live site:
   - `https://[your-project].web.app`
   - Works from any device/network
   - Real data from Firebase
   - Professional presentation

4. **Configuration**
   - Show `.env.example` (no secrets)
   - Show `firebase.json`
   - Explain security rules
   - Show hosting configuration

---

## ✨ Final Deployment Checklist

Before going live:
- [ ] All features tested
- [ ] Performance acceptable
- [ ] Security rules deployed
- [ ] .env configured correctly
- [ ] Build completes without errors
- [ ] Preview works perfectly
- [ ] Documentation complete
- [ ] Ready for advisor review
- [ ] Can answer tech questions
- [ ] Have backup plan if needed

---

**Your project is ready for production! 🚀**

Next: Show your advisor the live deployment and explain the architecture!
