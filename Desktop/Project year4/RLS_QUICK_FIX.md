# Quick Fix: Supabase RLS for Products Table

## TL;DR - Quick Copy-Paste Solution

### **Fastest Fix (For Development):**

Open [Supabase SQL Editor](https://app.supabase.com) and run this:

```sql
CREATE POLICY "Allow authenticated users to insert products"
ON public.products
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
```

**Done!** Your admin dashboard can now insert products.

---

## Step-by-Step (with Pictures)

### **Step 1:** Go to Supabase Dashboard
- Open: https://app.supabase.com
- Sign in
- Select your project

### **Step 2:** Open SQL Editor
- Left sidebar → **SQL Editor** 
- Click **New Query** button

### **Step 3:** Paste the SQL
Copy this:
```sql
CREATE POLICY "Allow authenticated users to insert products"
ON public.products
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
```

- Click in the editor area
- Paste the code (Cmd+V / Ctrl+V)
- Click the **Run** button (blue triangle icon)

### **Step 4:** You're Done! ✅
- You should see: `Success. No rows returned`
- Go back to your app
- Try adding a product - it should work now!

---

## If You Want More Security (Recommend for Production)

### **Option A: Restrict to Admin Users Only**

First, you need a way to mark users as admin. Run this:

```sql
-- Create a user roles table
CREATE TABLE public.user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own role
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);
```

Then, create the admin-only INSERT policy:

```sql
CREATE POLICY "Admin users can insert products"
ON public.products
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);
```

### **How to Mark Your Account as Admin:**

1. Go to **Authentication** → **Users** in Supabase
2. Find your user and copy the **ID** (UUID like `a1b2c3d4-...`)
3. Run this SQL (replace the ID):

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_ID_HERE', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

---

## What Each Policy Does

| Policy | Allows | Use Case |
|--------|--------|----------|
| `auth.role() = 'authenticated'` | ✅ Any logged-in user | Quick dev/test |
| Admin check policy | ✅ Users with `role='admin'` | Production |
| `true` | ✅ Everyone (no auth needed) | ⚠️ Don't use! |
| `false` | ❌ No one | Disabled |

---

## Verify It's Working

### **In Supabase Dashboard:**

1. **Policies** tab → Select **products** table
2. You should see your new policy listed
3. Click on it to edit or view details

### **In Your App:**

1. Go to Admin Dashboard → Products → Add Product
2. Fill in the form and click Create
3. Should work now! 🎉

If it still fails:
- Check browser **Console** (F12) for error details
- Make sure your Supabase key has the right permissions
- Verify you're logged in as an authenticated user

---

## Common Issues & Fixes

### **"Policy already exists"**
You already created it. Skip this step or run:
```sql
DROP POLICY "Allow authenticated users to insert products" ON public.products;
```
Then create it again.

### **"Table user_roles does not exist"**
You're trying to use the admin option but didn't create the table. Run the full SQL setup for admin option.

### **"auth.uid() returns NULL"**
Your user isn't logged in properly. Make sure:
1. You're logged into your app
2. Your Firebase/Auth setup is correct
3. Check browser console for auth errors

---

## Don't Have a Profiles Table?

That's fine! Use the simple policy:

```sql
CREATE POLICY "Allow authenticated users to insert products"
ON public.products
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
```

This works because Supabase's `auth.role()` checks if ANY user is logged in.

---

## Read-Only for Customers, Edit-Only for Admins?

Run all these policies:

```sql
-- Customers can only view products
CREATE POLICY "Everyone can view products"
ON public.products
FOR SELECT
USING (true);

-- Only admins can insert
CREATE POLICY "Only admins insert products"
ON public.products
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND (
    SELECT role FROM public.user_roles WHERE user_id = auth.uid()
  ) = 'admin'
);

-- Only admins can update
CREATE POLICY "Only admins update products"
ON public.products
FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND (
    SELECT role FROM public.user_roles WHERE user_id = auth.uid()
  ) = 'admin'
);

-- Only admins can delete
CREATE POLICY "Only admins delete products"
ON public.products
FOR DELETE
USING (
  auth.role() = 'authenticated'
  AND (
    SELECT role FROM public.user_roles WHERE user_id = auth.uid()
  ) = 'admin'
);
```

---

## Still Stuck?

Try these debugging steps:

### **Check if RLS is Actually Enabled:**
```sql
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'products';
```

Should show: `products | t` (t = true, meaning RLS is on)

### **List All Current Policies:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'products';
```

### **See Your Authentication Status:**
In your browser console (F12), run:
```javascript
// If using Supabase JS client
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);
```

---

## Need Help?

1. Check [Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
2. Look at your RLS policies: **Supabase Dashboard** → **Authentication** → **Policies**
3. Search error message in Supabase Discord/GitHub

