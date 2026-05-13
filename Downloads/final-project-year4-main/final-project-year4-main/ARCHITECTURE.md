# Architecture Documentation

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  React Components                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │   │
│  │  │  Admin Pages │  │Customer Pages│  │  Components  │ │   │
│  │  │ - Dashboard  │  │ - Home       │  │ - Cart       │ │   │
│  │  │ - Users      │  │ - Shop       │  │ - Auth Modal │ │   │
│  │  │ - Orders     │  │ - Orders     │  │ - Products   │ │   │
│  │  │ - Sales      │  │ - Payment    │  │ - Search     │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓ HTTP/WebSocket                    │
├─────────────────────────────────────────────────────────────┤
│                   APPLICATION LOGIC LAYER                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Services & State Management              │   │
│  │  ┌──────────────────┐    ┌──────────────────────┐   │   │
│  │  │ Firestore Service│    │Context API (Cart)    │   │   │
│  │  │ - Query products │    │- Cart state          │   │   │
│  │  │ - User CRUD      │    │- Cart persistence    │   │   │
│  │  │ - Order mgmt     │    │- Wishlist state      │   │   │
│  │  └──────────────────┘    └──────────────────────┘   │   │
│  │  ┌──────────────────┐    ┌──────────────────────┐   │   │
│  │  │Payment Services  │    │  Error Boundary      │   │   │
│  │  │ - ABA KHQR       │    │ - Error catching     │   │   │
│  │  │ - EMV QR codes   │    │ - Error UI           │   │   │
│  │  └──────────────────┘    └──────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓ REST API (Firebase SDK)          │
├─────────────────────────────────────────────────────────────┤
│                      FIREBASE BACKEND                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │  Firestore  │  │   Auth   │  │ Cloud Storage│  │   │
│  │  │- Collections│  │ - Users  │  │- Product imgs│  │   │
│  │  │- Documents  │  │ - Tokens │  │- Avatars     │  │   │
│  │  │- Security   │  │ - Session│  │- Files       │  │   │
│  │  │  Rules      │  │          │  │              │  │   │
│  │  └──────────────┘  └──────────┘  └──────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Directory Structure Explained

#### `/src/admin/` - Admin Features
Manages administrative operations. Each file represents a major feature:

- **AdminDashboard.tsx** - Main admin page with overview stats
- **UserManagement.tsx** - User CRUD and analytics
- **OrderManagement.tsx** - Order processing workflow
- **SalesReports.tsx** - Charts and analytics (uses Recharts)

#### `/src/customer/` - Customer Pages
Customer-facing pages that compose the shopping experience:

- **LandingPage.tsx** - First page users see
- **CustomerHome.tsx** - Dashboard after login
- **Shop.tsx** - Product listing/browsing
- **ProductDetails.tsx** - Individual product page
- **Cart.tsx** - Shopping cart display
- **Wishlist.tsx** - Saved items
- **OrdersPage.tsx** - Order history
- **PaymentPage.tsx** - Checkout flow
- **ProfilePage.tsx** - User account management
- **SearchPage.tsx** - Search results

#### `/src/components/` - Reusable Components

**Top-level components:**
- **AuthModal.tsx** - Login/Register form (shown as modal)
- **CategoryDropdown.tsx** - Filter by category
- **ProductFormModal.tsx** - Add/Edit product form
- **BackHomeButton.tsx** - Navigation helper

**Customer sub-components** (`/src/components/customer/`)
- **ProductCard.tsx** - Reusable product display card
- **Cart.tsx** - Cart component with item management
- **CartContext.tsx** - Cart state management provider
- **Profile.tsx** - User profile view
- **Wishlist.tsx** - Wishlist display
- **Shop.tsx** - Shop layout with products
- **Home.tsx** - Customer home component

#### `/src/services/` - Business Logic Layer

- **firebase.ts** - Firebase initialization and config
- **firestoreService.ts** - **Core business logic** for:
  - User CRUD (create, read, update, delete)
  - Product queries and filtering
  - Order management
  - Wishlist operations
  - Cart synchronization
  
- **abaKhqr.ts** - ABA KHQR payment QR code generation
- **emvQr.ts** - EMV QR format utilities
- **paymentConfig.ts** - Payment configuration constants
- **pricing.ts** - Price calculation utilities
- **mockBackend.ts** - Test data (can be removed in production)

---

## Data Flow Patterns

### User Authentication Flow

```
User Input (AuthModal)
    ↓
Firebase Auth (signIn/signUp)
    ↓
Save to Firestore (user documents)
    ↓
Update App.tsx state
    ↓
Redirect to Dashboard
    ↓
Load User Data (ListenUser)
    ↓
Set Cart from Firestore
```

### Product Browsing Flow

```
User navigates to Shop
    ↓
Load products from Firestore
    ↓
Display ProductCards (map over products)
    ↓
User clicks product
    ↓
Load ProductDetails page
    ↓
Fetch full product info
    ↓
Display description, images, specs
```

### Shopping Cart Flow

```
User adds to cart
    ↓
CartContext updates state
    ↓
Sync cart to Firestore
    ↓
User navigates to checkout
    ↓
PaymentPage loads cart items
    ↓
Generate KHQR QR code
    ↓
After payment confirmed
    ↓
Create Order in Firestore
    ↓
Clear cart
    ↓
Show order confirmation
```

---

## State Management Pattern

### Global State (Context API)

**CartContext.tsx** handles:
- Cart items
- Add/remove item functions
- Update quantity functions
- Persistent storage

```typescript
interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}
```

### Local State (Component State)

Components use `useState` for:
- Form inputs
- Modal visibility
- Loading states
- Error messages

### Server State (Firestore Real-time Listeners)

**firestoreService.ts** provides real-time listeners:
- `listenUser()` - Watch user data changes
- `listenUserCartItems()` - Watch cart in real-time
- Direct queries for one-time fetches

---

## Security Architecture

### Authentication (Firebase Auth)
- Email/password sign-up and login
- Secure password hashing (Firebase handles)
- Session tokens (stored by Firebase SDK)
- Automatic logout on invalid token

### Authorization (Firestore Security Rules)

**Principle:** Role-based access control

```firestore
// Users can only read/update their own document
match /users/{userId} {
  allow read, update: if request.auth.uid == userId
}

// Products can be read by anyone, written by admins
match /products/{document=**} {
  allow read: if true
  allow write: if getUserRole(request.auth.uid) == "ADMIN"
}

// Orders - users can only see their own
match /orders/{document=**} {
  allow read: if resource.data.userId == request.auth.uid || 
                 getUserRole(request.auth.uid) == "ADMIN"
  allow write: if getUserRole(request.auth.uid) == "ADMIN"
}
```

### Type Safety (TypeScript)

**Benefits:**
- Compile-time error checking
- Type inference for Firebase documents
- Autocomplete for API methods
- Prevents runtime errors

---

## Performance Optimizations

### 1. Code Splitting
```typescript
// AdminDashboard only loads when accessed
const AdminDashboard = React.lazy(() => import("./admin/AdminDashboard"));
```

### 2. Efficient Database Queries
- Indexed fields for faster searches
- Pagination for large datasets
- Selective field queries

### 3. Real-time Synchronization
- Firestore listeners (WebSocket)
- Automatic updates without polling
- Reduces bandwidth

### 4. Build Optimization
- Vite for fast dev server
- CSS modules for scoped styles
- Tree shaking for unused code removal

---

## Error Handling Strategy

### Global Error Boundary
```typescript
// src/ErrorBoundary.tsx
// Catches React component errors
// Prevents entire app from crashing
```

### Service Layer Error Handling
```typescript
// src/services/firestoreService.ts
try {
  // Database operations
} catch (error) {
  console.error("Operation failed:", error);
  throw new Error("User-friendly message");
}
```

### Component-Level Error Handling
```typescript
// Components catch Firestore errors
// Display user-friendly messages
// Don't leave user stuck
```

---

## Scalability Considerations

### Firebase Advantages
- **Automatic scaling** - Handles load automatically
- **Global CDN** - Fast delivery worldwide
- **No server management** - Fully managed service

### Database Optimization
- Denormalization for read performance
- Proper indexing for common queries
- Data archiving for old records

### Future Growth Areas
- Add Cloud Functions for complex logic
- Implement caching layer
- Add real-time notifications (Cloud Messaging)
- Implement analytics tracking

---

## Key Design Patterns

### 1. Container vs Presentational Components

**Containers** (Pages)
- Connected to state
- Handle data fetching
- Pass data to presentational components

**Presentational** (ProductCard, etc.)
- Pure functions
- Accept props
- No state or Firestore calls

### 2. Service Injection
```typescript
// Services passed as modules
import { getProducts } from "@services/firestoreService"
```

### 3. Error First Callbacks
```typescript
// KHQR payment: handle errors gracefully
.catch(error => handlePaymentError(error))
```

---

## Development Workflow

### Feature Development Steps

1. **Create component** in `src/components/` or `src/[role]/`
2. **Add TypeScript types** in `src/types.ts`
3. **Use services** from `src/services/`
4. **Test locally** with `npm run dev`
5. **Build for production** with `npm run build`

### Code Organization Principles

1. **Single Responsibility** - Each component does one thing
2. **DRY** - Don't Repeat Yourself, extract reusable components
3. **Clear Naming** - File and function names describe purpose
4. **Co-locate Code** - Keep related code together

---

## Deployment Architecture

```
Local Development
    ↓
Firebase Hosting
    ↓
Firestore (same project)
    ↓
Firebase Auth (same project)
    ↓
Cloud Storage (same project)
```

**All services use same Firebase project**, making deployment simple.

---

## Summary

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Type-safe development
- ✅ Scalable infrastructure
- ✅ Real-time features
- ✅ Secure authentication
- ✅ Role-based access control
- ✅ Good performance
- ✅ Easy maintenance

Perfect for a production e-commerce platform!
