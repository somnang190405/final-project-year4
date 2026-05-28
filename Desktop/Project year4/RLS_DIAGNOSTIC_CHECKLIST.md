# RLS Troubleshooting - Diagnostic Checklist

## Quick Diagnosis (Do These First)

### Step 1: Check RLS Status (Supabase SQL Editor)

Copy and run this query:

```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'products';
```

**Expected:** `products | true`

- [ ] RLS is **enabled** (shows `true`)
- [ ] RLS is **disabled** (shows `false`) → RUN: `ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;`

---

### Step 2: Check Policies Exist (Supabase SQL Editor)

```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'products';
```

**Expected:** Shows at least one policy with `cmd = INSERT`

- [ ] Policy for **INSERT** exists
- [ ] No INSERT policy → RUN:
```sql
CREATE POLICY "allow_insert" ON public.products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

---

### Step 3: Check User Authentication (Browser Console)

Open your app in browser, press **F12** (Developer Tools), go to **Console** tab, paste:

```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);
console.log('User ID:', user?.id);
```

- [ ] **User is logged in** (shows user object with `id`)
- [ ] **User is NOT logged in** (shows `null`) → **This is your problem!** See: "User Not Authenticated" solution below

---

### Step 4: Check Table Name (Supabase SQL Editor)

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

- [ ] Table is named exactly **"products"** (lowercase)
- [ ] Table has different name → Update your code to match

---

## Problem: User Not Authenticated in Supabase

**Symptom:** Browser console shows `User: null`

### Why This Happens
Your app uses **Firebase** for login, but Supabase doesn't know about it.

### Solution: Check Supabase Auth Status

```javascript
// In browser console
const { data: { session } } = await supabase.auth.getSession();
console.log('Supabase session:', session);
```

**If null:** User is logged into Firebase, but NOT Supabase

### Quick Fix Options:

#### Option A: Disable RLS (Development Only)
```sql
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
```

⚠️ **WARNING: Not secure for production!**

#### Option B: Use Backend API (Recommended)
See "RLS_ADVANCED_TROUBLESHOOTING.md" - Backend API section

#### Option C: Switch to Supabase Auth
Replace Firebase auth with Supabase auth

---

## Problem: Policy Exists but Still Blocked

### Step 1: Test Most Permissive Policy

```sql
DROP POLICY IF EXISTS "test" ON public.products;

CREATE POLICY "test"
ON public.products
FOR INSERT
WITH CHECK (true);
```

Try inserting again from frontend.

- [ ] Works with `WITH CHECK (true)` → Your auth condition is wrong
- [ ] Still fails → RLS configuration issue

### Step 2: Check Payload Column Names

Your INSERT might fail because column names don't match table schema.

```javascript
// In browser console, check what you're sending:
console.log('Insert payload:', {
  name: 'Test',
  price: 99.99,
  // ... other fields
});
```

Run this in Supabase SQL to see exact table columns:

```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position;
```

**Common mistakes:**
- Sending `image` but table has `image_url` ❌
- Sending `promotion_percent` but table has `promotion` ❌
- Sending extra fields not in table ❌

---

## Problem: RLS Not Enabled

### Symptom
`pg_tables` query shows `rowsecurity | false`

### Fix

Run in Supabase SQL Editor:

```sql
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
```

Then create a policy:

```sql
CREATE POLICY "allow_insert"
ON public.products
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
```

---

## Browser Console Debug Script

Copy and paste this entire script into browser console to get all diagnostics at once:

```javascript
async function diagnoseRLS() {
  console.log('=== RLS DIAGNOSTIC REPORT ===\n');
  
  // 1. Check Supabase user
  const { data: { user } } = await supabase.auth.getUser();
  console.log('1. SUPABASE USER:');
  console.log('   Authenticated:', !!user);
  console.log('   User ID:', user?.id || 'NONE');
  console.log('   Role:', user?.role || 'NONE');
  
  // 2. Check Supabase session
  const { data: { session } } = await supabase.auth.getSession();
  console.log('\n2. SUPABASE SESSION:');
  console.log('   Session exists:', !!session);
  console.log('   Has access token:', !!session?.access_token);
  
  // 3. Check Firebase user
  try {
    const firebaseUser = auth.currentUser;
    console.log('\n3. FIREBASE USER:');
    console.log('   Authenticated:', !!firebaseUser);
    console.log('   Email:', firebaseUser?.email || 'NONE');
  } catch (e) {
    console.log('\n3. FIREBASE USER: ERROR -', e.message);
  }
  
  // 4. Test a simple insert
  console.log('\n4. ATTEMPTING TEST INSERT:');
  try {
    const result = await supabase
      .from('products')
      .insert([{
        name: 'TEST_PRODUCT',
        price: 1,
        stock: 1,
        category: 'test',
        subcategory: 'test',
        promotion_percent: 0,
        is_featured: false,
        description: 'test',
        image_url: 'https://example.com/test.jpg',
        created_at: new Date().toISOString()
      }])
      .select();
    
    if (result.error) {
      console.log('   ❌ INSERT FAILED');
      console.log('   Error:', result.error.message);
    } else {
      console.log('   ✅ INSERT SUCCESS');
      console.log('   Data:', result.data);
      
      // Clean up test product
      if (result.data && result.data[0]) {
        await supabase.from('products').delete().eq('id', result.data[0].id);
      }
    }
  } catch (error) {
    console.log('   ❌ ERROR:', error.message);
  }
  
  console.log('\n=== END REPORT ===');
}

// Run it
diagnoseRLS();
```

---

## Interpretation Guide

### If you see:
```
✅ Authenticated: true
✅ INSERT SUCCESS
```
→ Everything is working! Problem might be elsewhere.

### If you see:
```
❌ Authenticated: false (Supabase)
✅ Authenticated: true (Firebase)
```
→ **This is your problem!** User is logged into Firebase but not Supabase.

**Solution:** Implement backend API (see Advanced Troubleshooting)

### If you see:
```
✅ Authenticated: true
❌ INSERT FAILED: row-level security
```
→ Policy syntax or configuration issue. Run:
```sql
SELECT policyname, qual, with_check FROM pg_policies WHERE tablename = 'products';
```

---

## Column Name Reference

Your code sends these fields. Make sure your table has exactly these columns:

```typescript
{
  name: string,
  price: number,
  stock: number,
  category: string,
  subcategory: string,
  promotion_percent: number,
  is_featured: boolean,
  description: string,
  image_url: string,
  created_at: string  // ISO timestamp
}
```

Check in Supabase SQL:
```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products';
```

If table has `image` instead of `image_url` → **Update your code!**

---

## Quick Fixes (In Order of Likelihood)

1. **User not authenticated in Supabase**
   ```javascript
   // Check in console
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) console.log('PROBLEM FOUND: User is null');
   ```

2. **RLS not enabled**
   ```sql
   ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
   ```

3. **No INSERT policy**
   ```sql
   CREATE POLICY "allow_insert" ON public.products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
   ```

4. **Column name mismatch**
   ```sql
   SELECT column_name FROM information_schema.columns WHERE table_name = 'products';
   ```

5. **Wrong table name**
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   ```

---

## Need More Help?

When asking for help, include:

1. Output of browser console debug script (above)
2. Output of this SQL:
   ```sql
   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'products';
   ```
3. The exact error message from browser console (Network tab)
4. Screenshot of the error in your app

