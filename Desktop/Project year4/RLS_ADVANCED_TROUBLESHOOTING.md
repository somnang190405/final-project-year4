# Supabase RLS Insert Block - Advanced Troubleshooting

## Problem Summary
You created a policy but still getting:
```
Insert blocked by Supabase row-level security
```

This means one of these is happening:
1. ❌ User is **not authenticated** in Supabase
2. ❌ Policy is on the **wrong table/schema**
3. ❌ RLS is **not enabled** on the table
4. ❌ Policy syntax is **incorrect**
5. ❌ **Different table** is being targeted than you think

Let's fix it step by step.

---

## Troubleshooting Level 1: Verify RLS is Enabled

### Check if RLS is Actually Enabled on Your Table

Run this in Supabase SQL Editor:

```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'products';
```

**Expected result:**
```
 schemaname | tablename | rowsecurity
------------+-----------+------------
 public     | products  | t
```

**If `rowsecurity` is `f` (false):**
RLS is disabled! Enable it:
```sql
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
```

---

## Troubleshooting Level 2: Verify Your Policy Exists

Run this to see all policies on the products table:

```sql
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'products';
```

**Expected result (one or more policies):**
```
       policyname        | cmd    |     qual     |    with_check
------------------------+--------+--------------+------------------
 Your policy name        | INSERT | (nothing)    | (auth.role() = 'authenticated'::text)
```

**If no policies show up:**
Your policy wasn't created. Run this:
```sql
CREATE POLICY "Allow authenticated users to insert products"
ON public.products
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
```

**If multiple policies exist:**
One might be conflicting. Disable the others:
```sql
DROP POLICY "other_policy_name" ON public.products;
```

---

## Troubleshooting Level 3: Check User Authentication Status

### **Verify You're Actually Logged In to Supabase**

The error happens because your **frontend user is not authenticated in Supabase**. 

You might be:
- ✅ Logged into **Firebase** 
- ❌ But **NOT logged into Supabase**

These are **different systems**!

### Check Current User in Browser Console

Open your browser console (F12) and run:

```javascript
// Check Supabase auth
const { data: { user } } = await supabase.auth.getUser();
console.log('Supabase user:', user);
console.log('User ID:', user?.id);
console.log('Auth role:', user?.role);
```

**If `user` is `null`:**
❌ You're NOT authenticated in Supabase - this is your problem!

**If `user` exists:**
✅ You ARE authenticated - problem is elsewhere

---

## Troubleshooting Level 4: Your App Likely Uses Firebase, Not Supabase Auth

**CRITICAL FINDING:** Your app uses **Firebase for authentication**, but your RLS policy expects **Supabase authentication**.

### The Problem:
```
Firebase Login → User authenticated in Firebase
              ↓
Supabase REST API → Asks "Who are you?"
              ↓
Supabase says: "I don't recognize you" → RLS blocks INSERT
```

### Solution Options:

#### **Option A: Use Supabase Auth (Recommended)**

Replace Firebase auth with Supabase auth:

```typescript
// OLD (Firebase)
import { auth } from "firebase/auth";
const user = auth.currentUser;

// NEW (Supabase)
const { data: { user } } = await supabase.auth.getUser();
```

However, this requires **replacing your entire auth system**, which is major work.

#### **Option B: Use Service Role Key (Quickest Fix)**

Use Supabase's **service role key** in your backend to bypass RLS:

1. Get your **Service Role Key** from Supabase:
   - Supabase Dashboard → Settings → API
   - Copy "service_role" key (⚠️ KEEP THIS SECRET - backend only!)

2. Create a backend endpoint (Node.js/your server):

```javascript
// Backend only - NEVER expose this key to frontend!
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // ← Service role key
);

// Your API endpoint
app.post('/api/products', async (req, res) => {
  const { product } = req.body;
  
  const { data, error } = await supabaseAdmin
    .from('products')
    .insert([product])
    .select();
  
  if (error) return res.status(400).json({ error });
  return res.json({ data });
});
```

3. In your frontend, call your backend instead of Supabase directly:

```typescript
// OLD - Frontend directly to Supabase (gets RLS blocked)
const response = await supabase
  .from('products')
  .insert([payload])
  .select();

// NEW - Frontend to your backend
const response = await fetch('/api/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ product: payload })
});
```

#### **Option C: Create a Supabase User Account**

Make your admin user a Supabase user instead of Firebase:

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user"
3. Create a user with your email
4. Update your login to use Supabase auth:

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'your@email.com',
  password: 'password'
});
```

---

## Troubleshooting Level 5: Advanced RLS Debug

### Check Exact Table and Schema

Your policy might be on wrong table. Run:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

Make sure "products" is listed.

### Check Policy Targets Correct Table

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
ORDER BY tablename;
```

Verify your policy targets `public.products`, not something else.

### Check Table Column Names Match Your Insert

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products';
```

Your insert payload columns must exactly match these names!

**Example mismatch:**
```
Table has column: "image_url"
Your insert sends: "image" ← MISMATCH! INSERT fails
```

---

## Troubleshooting Level 6: Test Policy Directly

### Create a Test Policy (Most Permissive)

Run this to test if RLS policies work at all:

```sql
-- DROP existing policy first
DROP POLICY IF EXISTS "Test policy" ON public.products;

-- Create most permissive policy
CREATE POLICY "Test policy"
ON public.products
FOR INSERT
WITH CHECK (true);
```

Try your insert from the frontend. 

**If it works:** Policy mechanics are fine, problem is authentication check
**If it still fails:** RLS disabled or wrong table

---

## Quick Diagnosis Flowchart

```
Try to insert product
        ↓
    RLS error?
        ↓
    YES → Check: Is RLS enabled?
    ├─ NO → ALTER TABLE ... ENABLE ROW LEVEL SECURITY
    └─ YES → Check: Does INSERT policy exist?
         ├─ NO → CREATE POLICY ... FOR INSERT
         └─ YES → Check: User authenticated in Supabase?
              ├─ NO → That's your problem! (See Solutions above)
              └─ YES → Check: Policy uses correct auth condition?
                   ├─ NO → Update WITH CHECK clause
                   └─ YES → Check: Correct table/schema?
                        ├─ NO → Fix table name
                        └─ YES → Debug payload column names
```

---

## My Recommendation for Your App

Since you're using **Firebase** for authentication:

### **Best Solution: Backend API Endpoint**

Create a simple Node.js/Express endpoint:

```typescript
// backend/routes/products.ts
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize with SERVICE ROLE KEY (backend only)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Firebase token verification middleware
import admin from 'firebase-admin';
const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    await admin.auth().verifyIdToken(token);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.post('/products', verifyFirebaseToken, async (req, res) => {
  try {
    const { product } = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([product])
      .select();
    
    if (error) throw error;
    res.json({ data });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

Then in your frontend:

```typescript
const handleCreateProduct = async () => {
  try {
    // Get Firebase token
    const token = await auth.currentUser?.getIdToken();
    
    // Call your backend
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ product: payload })
    });
    
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    
    console.log('Product created:', result.data);
  } catch (error) {
    console.error('Create failed:', error);
  }
};
```

### Why This Works:
- ✅ Backend has service role key (can bypass RLS)
- ✅ Frontend still authenticated via Firebase token
- ✅ Secure (service key never exposed to frontend)
- ✅ No need to change your auth system

---

## Test Your Current Setup

### **Test 1: Most Permissive Policy**

```sql
DROP POLICY IF EXISTS "test" ON public.products;

CREATE POLICY "test"
ON public.products
FOR INSERT
WITH CHECK (true);
```

Frontend insert works? → Problem is auth check
Frontend insert fails? → Problem is RLS configuration

### **Test 2: Check User Session**

```javascript
// Browser console
const { data: { session } } = await supabase.auth.getSession();
console.log('Supabase session:', session);
console.log('Has token:', !!session?.access_token);
```

No session? → That's your problem!

### **Test 3: Direct SQL Insert**

Try inserting directly in Supabase SQL:

```sql
INSERT INTO public.products (name, price, stock, category, subcategory, promotion_percent, is_featured, description, image_url, created_at)
VALUES ('Test', 99.99, 10, 'Men', 'T-Shirts', 0, false, 'Test desc', 'https://example.com/image.jpg', NOW());
```

Works in SQL? → RLS is fine, problem is frontend auth
Fails in SQL? → RLS policy blocking even admin

---

## Next Steps

1. **Run the diagnostic queries** above (check if RLS enabled, policy exists)
2. **Check if user is authenticated** (browser console)
3. **Choose a solution** (Backend API is safest)
4. **Implement it** and test

---

## Still Stuck?

Share with me:
1. Output of: `SELECT * FROM pg_policies WHERE tablename = 'products';`
2. Browser console output of: `await supabase.auth.getUser()`
3. The exact error message from the browser console (F12 → Network tab)
