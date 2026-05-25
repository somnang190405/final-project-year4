# Backend API Solution - Firebase + Supabase

## Overview

Instead of calling Supabase directly from your frontend, you'll:
1. Upload image to Supabase Storage (from frontend)
2. Send product data to **your backend API**
3. Backend inserts into Supabase using service role key (bypasses RLS)
4. Backend returns product ID to frontend

```
Frontend (Firebase Auth)
    ↓ POST /api/products
Backend API (has Service Role Key)
    ↓ supabaseAdmin.from('products').insert(...)
Supabase Database ✅ INSERT succeeds (RLS bypassed)
```

---

## Choice: Express.js vs Next.js

| Option | Setup Time | Complexity | When to Use |
|--------|-----------|-----------|-----------|
| **Express.js** | 15 min | Simple | Standalone backend |
| **Next.js** | 20 min | Medium | Integrate with frontend |

**Recommendation:** Start with **Express.js** if you don't have Next.js setup yet.

---

## Option 1: Express.js Backend (RECOMMENDED)

### Step 1: Create Backend Folder Structure

```bash
cd /Users/apple/Desktop/Project\ year4/final-project-year4
mkdir -p backend/routes backend/middleware backend/config
```

### Step 2: Create Backend Files

Create `backend/package.json`:

```json
{
  "name": "tinhme-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@supabase/supabase-js": "^2.45.0",
    "firebase-admin": "^12.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  }
}
```

Create `backend/.env`:

```
PORT=3001
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-firebase-project.iam.gserviceaccount.com
```

### Step 3: Create Backend Server

Create `backend/server.js`:

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productsRouter from './routes/products.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api', productsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
```

Create `backend/middleware/auth.js`:

```javascript
import admin from 'firebase-admin';

// Initialize Firebase Admin
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
});

// Middleware to verify Firebase token
export const verifyFirebaseToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No auth token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

Create `backend/config/supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

// Admin client - uses service role key (bypasses RLS)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase configuration');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

Create `backend/routes/products.js`:

```javascript
import express from 'express';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// POST /api/products - Create a new product
router.post('/products', verifyFirebaseToken, async (req, res) => {
  try {
    const { payload } = req.body;

    // Validate required fields
    if (!payload.name || !payload.price || !payload.image_url) {
      return res.status(400).json({
        error: 'Missing required fields: name, price, image_url'
      });
    }

    // Insert into Supabase using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([payload])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'Failed to insert product' });
    }

    console.log('✅ Product created:', data[0].id);
    res.json({ 
      success: true, 
      data: data[0] 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products - Get all products (no auth required)
router.get('/products', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Step 4: Install Dependencies

```bash
cd backend
npm install
```

### Step 5: Start Backend

```bash
npm run dev
```

You should see:
```
✅ Backend running on http://localhost:3001
```

---

## Option 2: Next.js Server Actions (API Routes)

If you want to upgrade to Next.js, create these files:

Create `app/api/products/route.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import * as admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Firebase Admin
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig as admin.ServiceAccount),
  });
}

// Admin Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify Firebase token middleware
async function verifyToken(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) throw new Error('No token');
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// POST - Create product
export async function POST(req: NextRequest) {
  try {
    // Verify Firebase auth
    await verifyToken(req);

    const { payload } = await req.json();

    // Validate
    if (!payload.name || !payload.price || !payload.image_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert with service role
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([payload])
      .select();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// GET - List products
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*');

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## Frontend Changes

Now update your React component to call the backend API instead of Supabase directly:

### Before (Current - Calls Supabase directly):

```typescript
const response = await supabase
  .from('products')
  .insert<SupabaseProductRow>([payload])
  .select();

if (response.error) {
  throw response.error;
}

const data = response.data as SupabaseProductRow[] | null;
```

### After (NEW - Calls your backend):

```typescript
// Get Firebase token
const token = await auth.currentUser?.getIdToken();

if (!token) {
  throw new Error('Not authenticated');
}

// Call your backend API
const response = await fetch('http://localhost:3001/api/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ payload })
});

if (!response.ok) {
  const errorData = await response.json();
  throw new Error(errorData.error || 'Failed to create product');
}

const result = await response.json();
const data = [result.data] as SupabaseProductRow[];
```

---

## Environment Setup

### 1. Get Supabase Service Role Key

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Settings → API → **Service Role** key
3. Copy it (⚠️ Keep secret! Backend only!)

### 2. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Project Settings → Service Accounts
3. Click "Generate New Private Key"
4. You'll get a JSON file with the credentials

### 3. Add to `backend/.env`

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEv...
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@...
```

---

## Complete Frontend Code Change

Replace this section in `src/admin/AdminDashboard.tsx`:

```typescript
// OLD CODE (REMOVE):
const response = await supabase
  .from('products')
  .insert<SupabaseProductRow>([payload])
  .select();

if (response.error) {
  throw response.error;
}

const data = response.data as SupabaseProductRow[] | null;
if (!data || data.length === 0) {
  throw new Error('No product was inserted.');
}
```

With:

```typescript
// NEW CODE (ADD):
// Get Firebase auth token
const token = await auth.currentUser?.getIdToken();
if (!token) {
  throw new Error('You must be logged in');
}

// Call backend API
const apiResponse = await fetch(
  process.env.VITE_API_URL || 'http://localhost:3001',
  {
    method: 'POST',
    pathname: '/api/products',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ payload })
  }
);

if (!apiResponse.ok) {
  const errorData = await apiResponse.json();
  throw new Error(errorData.error || 'Failed to create product');
}

const result = await apiResponse.json();
const data = [result.data] as SupabaseProductRow[];
if (!data || data.length === 0) {
  throw new Error('No product was inserted.');
}
```

Add to `.env`:

```
VITE_API_URL=http://localhost:3001
```

---

## Security Checklist

- [ ] ✅ Service role key **never** exposed to frontend
- [ ] ✅ Backend verifies Firebase token on every request
- [ ] ✅ Backend validates payload before insert
- [ ] ✅ CORS configured to specific domains
- [ ] ✅ Database RLS still enabled (recommended)
- [ ] ✅ Backend runs on separate port (3001)

---

## Testing

### Test 1: Backend Health Check

```bash
curl http://localhost:3001/health
```

Should return: `{"status":"Backend is running"}`

### Test 2: Create Product from Frontend

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `npm run dev` (in another terminal)
3. Go to Admin Dashboard → Add Product
4. Fill form and click Create
5. Should succeed! ✅

### Test 3: Verify RLS Still Works

Database still has RLS enabled. Direct frontend calls to Supabase will still be blocked (good!).

---

## Production Deployment

### Backend (example: Render, Railway, Heroku)

```bash
# Deploy backend repo/directory
# Set environment variables in hosting dashboard
# Backend runs on their domain: https://your-backend.com
```

### Frontend `.env.production`

```
VITE_API_URL=https://your-backend.com
```

---

## Troubleshooting

### Backend won't start

```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill process
kill -9 <PID>
```

### CORS error

Add your frontend domain to backend CORS config:

```javascript
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://yourdomain.com' // production
  ],
  credentials: true
};

app.use(cors(corsOptions));
```

### "Invalid token" error

- Check Firebase is initialized correctly
- Verify user is logged in on frontend
- Check token isn't expired

### "Missing Supabase configuration"

- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `backend/.env`
- Check it's NOT the anon key (service role key is longer)

