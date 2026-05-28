# Supabase RLS Policy Setup for Products Table

## Problem
You're getting this error:
```
Insert blocked by Supabase row-level security. Add an insert policy for the products table or use a server-side insert path.
```

This happens because **Row-Level Security (RLS)** is enabled on your `products` table but there's no INSERT policy defined.

---

## Solution: Add INSERT Policy

Choose one of the options below based on your needs:

### **Option 1: Allow All Authenticated Users to INSERT** (Simpler)

This allows any logged-in user to insert products.

**SQL Query:**
```sql
CREATE POLICY "Allow authenticated users to insert products"
ON public.products
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
```

---

### **Option 2: Allow Only Admin Users to INSERT** (More Secure)

This restricts insertions to admin users only. You'll need:
- A `user_role` column in your `profiles` table
- Users marked as `'admin'` in that column

**SQL Query:**
```sql
CREATE POLICY "Allow admin users to insert products"
ON public.products
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  )
);
```

---

### **Option 3: Allow SELECT for Everyone, INSERT Only for Admins** (Recommended)

This is a complete setup:
- Everyone can see products (SELECT)
- Only admins can create products (INSERT)
- Only admins can update/delete products (UPDATE/DELETE)

**SQL Queries:**
```sql
-- Policy for SELECT (everyone can view)
CREATE POLICY "Allow public to view products"
ON public.products
FOR SELECT
USING (true);

-- Policy for INSERT (admins only)
CREATE POLICY "Allow admins to insert products"
ON public.products
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  )
);

-- Policy for UPDATE (admins only)
CREATE POLICY "Allow admins to update products"
ON public.products
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  )
);

-- Policy for DELETE (admins only)
CREATE POLICY "Allow admins to delete products"
ON public.products
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  )
);
```

---

## How to Apply in Supabase Dashboard

### Step 1: Open Supabase Console
1. Go to [https://supabase.com](https://supabase.com)
2. Sign in with your account
3. Select your project

### Step 2: Navigate to SQL Editor
1. In the left sidebar, click **"SQL Editor"**
2. Click **"New Query"** (or the **"+"** button)

### Step 3: Copy & Paste the SQL
1. Copy one of the SQL queries above (choose the option that fits your needs)
2. Paste it into the SQL editor
3. Click **"Run"** button (or press `Cmd+Enter` / `Ctrl+Enter`)

### Step 4: Verify the Policy Was Created
1. Navigate to **"Authentication"** → **"Policies"** in the left sidebar
2. Select your **"products"** table from the dropdown
3. You should see your new policy listed

---

## Detailed Steps with Screenshots

### Opening SQL Editor
1. Dashboard → left sidebar → find **"SQL Editor"** section
2. Click it to expand
3. Click **"New Query"** button

### Running the Query
1. Paste the SQL code
2. Click the blue **"Run"** button in the top right
3. You should see a success message

### Checking Policies (Optional)
1. Go to **"Authentication"** → **"Policies"** (in sidebar)
2. Click the **"products"** table dropdown
3. You'll see all active policies for that table
4. Your new policy should appear in the list

---

## Which Option Should You Choose?

| Option | Use Case | Security | Complexity |
|--------|----------|----------|-----------|
| **Option 1** | Development/Testing | ⚠️ Low | ✅ Simple |
| **Option 2** | Production with admin roles | ✅ Good | 📊 Medium |
| **Option 3** | Production recommended | ✅✅ Best | 📊 Medium |

### Recommendation:
- **Development**: Use **Option 1** for quick testing
- **Production**: Use **Option 3** for full control
- **If you use auth.uid()**: Make sure your `profiles` table exists and has `user_role` column

---

## Troubleshooting

### Error: "Policy already exists"
```sql
DROP POLICY "Allow authenticated users to insert products" ON public.products;
-- Then run the CREATE POLICY query again
```

### Error: "Table profiles does not exist" (for Option 2 or 3)
You need to create a `profiles` table first:
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  user_role TEXT DEFAULT 'user', -- 'admin' or 'user'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create a policy for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);
```

### How to Mark User as Admin
```sql
UPDATE public.profiles
SET user_role = 'admin'
WHERE id = 'USER_ID_HERE';
```

To find a user's ID:
1. Go to **Authentication** → **Users** in Supabase dashboard
2. Find the user and copy their ID
3. Replace `USER_ID_HERE` above

---

## Verify It Works

After applying the policy:

1. Go back to your React app
2. Try adding a product again
3. It should now work without the RLS error
4. Check **"View"** section in Supabase dashboard to see if the product was inserted

---

## Still Having Issues?

### Check if RLS is Enabled
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'products';

-- Then check if RLS is on
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'products';
```

If `relrowsecurity` is `false`, you need to enable RLS:
```sql
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
```

### Debug: List All Policies
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'products';
```

---

## Quick Reference: Policy Components

```sql
CREATE POLICY "policy_name"           -- Name of the policy
ON public.table_name                  -- Table it applies to
FOR INSERT                            -- Action (INSERT, SELECT, UPDATE, DELETE)
WITH CHECK (condition);               -- Condition that must be true
```

**Common Conditions:**
- `auth.role() = 'authenticated'` - Any logged-in user
- `auth.uid() = user_id` - Only the current user
- `true` - Allow everyone (no security)
- `false` - Block everyone

