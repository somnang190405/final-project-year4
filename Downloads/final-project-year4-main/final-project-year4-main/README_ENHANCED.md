# TinhMe E-Commerce Platform

**Final Year Project - Year 4 Defense**

## 📋 Project Overview

TinhMe is a **full-stack e-commerce web application** designed for product sales with real-time inventory management, user authentication, and payment processing. The platform supports both customer and administrator roles with specialized features for each.

### Key Statistics
- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Firebase (Firestore, Auth, Storage)
- **Payment Gateway:** ABA Pay KHQR integration
- **Lines of Code:** 3000+ (TypeScript)
- **Components:** 15+
- **Supported Roles:** Admin, Customer, Guest

---

## 🏗️ Architecture Overview

### Technology Stack

```
┌─────────────────────────────────────────────┐
│         CLIENT LAYER (React TypeScript)     │
│  ┌────────────────────────────────────────┐ │
│  │ Admin Dashboard | Customer Portal      │ │
│  │ (Components + Pages)                   │ │
│  └────────────────────────────────────────┘ │
│           ↓ (HTTP/WebSocket)                │
├─────────────────────────────────────────────┤
│      FIREBASE SERVICE LAYER (TypeScript)    │
│  ┌────────────────────────────────────────┐ │
│  │ Firebase SDK Integration               │ │
│  │ - Authentication                       │ │
│  │ - Firestore Queries                    │ │
│  │ - Cloud Storage                        │ │
│  └────────────────────────────────────────┘ │
│           ↓ (REST API)                      │
├─────────────────────────────────────────────┤
│       BACKEND (Firebase Services)           │
│  ┌────────────────────────────────────────┐ │
│  │ ✓ Firestore (NoSQL Database)           │ │
│  │ ✓ Firebase Auth                        │ │
│  │ ✓ Cloud Storage                        │ │
│  │ ✓ Security Rules (Firestore & Storage) │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## 📁 Folder Structure

```
final-project-year4/
├── src/                          # PRIMARY SOURCE DIRECTORY
│   ├── admin/                    # Admin dashboard pages
│   │   ├── AdminDashboard.tsx   # Overview dashboard
│   │   ├── UserManagement.tsx   # Manage users
│   │   ├── OrderManagement.tsx  # Order processing
│   │   └── SalesReports.tsx     # Analytics & reports
│   │
│   ├── customer/                 # Customer-facing pages
│   │   ├── CustomerHome.tsx     # Main customer page
│   │   ├── LandingPage.tsx      # Landing page
│   │   ├── Shop.tsx             # Product listing
│   │   ├── ProductDetails.tsx   # Individual product page
│   │   ├── Cart.tsx             # Shopping cart
│   │   ├── Wishlist.tsx         # Saved items
│   │   ├── OrdersPage.tsx       # Order history
│   │   ├── PaymentPage.tsx      # Checkout & payment
│   │   ├── ProfilePage.tsx      # User profile
│   │   └── SearchPage.tsx       # Search results
│   │
│   ├── components/               # Reusable components
│   │   ├── AuthModal.tsx        # Login/Register modal
│   │   ├── CategoryDropdown.tsx # Category filter
│   │   ├── ProductFormModal.tsx # Product CRUD form
│   │   ├── BackHomeButton.tsx   # Navigation
│   │   └── customer/
│   │       ├── Cart.tsx         # Cart component
│   │       ├── CartContext.tsx  # Cart state management
│   │       ├── Home.tsx         # Customer home
│   │       ├── ProductCard.tsx  # Product display card
│   │       ├── Profile.tsx      # Profile component
│   │       ├── Shop.tsx         # Shop display
│   │       └── Wishlist.tsx     # Wishlist component
│   │
│   ├── services/                 # Business logic & APIs
│   │   ├── firebase.ts          # Firebase config & initialization
│   │   ├── firestoreService.ts  # Firestore CRUD operations
│   │   ├── abaKhqr.ts           # ABA KHQR payment integration
│   │   ├── emvQr.ts             # EMV QR code format
│   │   ├── paymentConfig.ts     # Payment settings
│   │   ├── pricing.ts           # Pricing utilities
│   │   └── mockBackend.ts       # Mock data for testing
│   │
│   ├── main.tsx                 # Application entry point
│   ├── App.tsx                  # Main component with routing
│   ├── ErrorBoundary.tsx        # Error handling wrapper
│   ├── types.ts                 # TypeScript interface definitions
│   ├── index.css                # Global styles
│   └── *.css                    # Component-specific styles
│
├── public/                       # Static assets (images, fonts)
├── scripts/                      # Utility scripts
├── dist/                        # Production build output
│
├── Configuration Files:
├── vite.config.ts               # Vite build configuration
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.cjs          # Tailwind CSS configuration
├── postcss.config.cjs           # PostCSS configuration
├── package.json                 # Dependencies & scripts
├── firebase.json                # Firebase hosting config
├── firestore.rules              # Database security rules
├── storage.rules                # File storage security rules
├── .env                         # Environment variables (local only)
├── .env.example                 # Environment template
│
├── Documentation:
├── README.md                    # Project overview (this file)
├── PROJECT_ANALYSIS.md          # Detailed tech analysis
├── ARCHITECTURE.md              # Architecture details
├── FIREBASE_SETUP.md            # Firebase configuration guide
├── DEFENSE_CHECKLIST.md         # Pre-defense verification
└── DEPLOYMENT.md                # Production deployment guide
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Firebase account

### Installation

1. **Clone the repository**
   ```bash
   cd final-project-year4
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase** (see FIREBASE_SETUP.md)
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase credentials
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   Open browser to `http://localhost:3000`

### Build for Production
```bash
npm run build
npm run preview
```

---

## 👥 User Roles & Features

### Customer Features
- ✅ User registration and authentication
- ✅ Browse products by category
- ✅ Search products by name
- ✅ View product details
- ✅ Add/remove items from cart
- ✅ Manage wishlist
- ✅ Checkout and payment (ABA KHQR)
- ✅ View order history
- ✅ Track order status

### Admin Features
- ✅ User management and analytics
- ✅ Product management (Create, Read, Update, Delete)
- ✅ Inventory tracking
- ✅ Order processing and status updates
- ✅ Sales reports with charts
- ✅ Category management

---

## 🗄️ Database Schema (Firestore)

### Collections

**users**
```typescript
{
  id: string,
  name: string,
  email: string,
  password: hashed (handled by Firebase Auth),
  role: "ADMIN" | "CUSTOMER" | "GUEST",
  avatar?: string,
  wishlist: string[], // Product IDs
  address?: string,
  phoneNumber?: string,
  location?: string,
  county?: string,
  city?: string
}
```

**products**
```typescript
{
  id: string,
  name: string,
  price: number,
  promotionPercent?: number,
  category: string, // e.g., "Men", "Women"
  subcategory: string, // e.g., "Shirts", "Pants"
  image: string, // Firebase Storage URL
  description: string,
  stock: number,
  rating: number,
  isNewArrival?: boolean,
  colors?: string[],
  sizes?: string[]
}
```

**orders**
```typescript
{
  id: string,
  userId: string,
  items: Array<{productId, quantity, price}>,
  totalAmount: number,
  status: "Pending" | "Shipped" | "Delivered" | "Cancelled",
  createdAt: timestamp,
  updatedAt: timestamp,
  shippingAddress: string,
  paymentStatus: "Pending" | "Completed"
}
```

**categories**
```typescript
{
  id: string,
  name: string,
  image?: string
}
```

---

## 🔐 Security Features

### Firebase Security Rules
- **Firestore Rules:** Prevent unauthorized access to user data
- **Storage Rules:** Only authenticated users can access files
- **Authentication:** Email/password auth with secure password storage

### Best Practices Implemented
- ✅ TypeScript for type safety
- ✅ Error boundaries for crash prevention
- ✅ Environment variables for sensitive config
- ✅ HTTPS enforcement
- ✅ Role-based access control (Admin/Customer)

---

## 💳 Payment Integration

### ABA Pay KHQR
- Generates QR codes for payment
- KHQR (Khmer Quick Response) format for Cambodia
- Real-time payment tracking
- Order confirmation on transaction

**Setup Required:**
1. Get KHQR payload from ABA Pay
2. Add to `.env` as `VITE_ABA_KHQR_BASE_PAYLOAD`
3. Restart dev server

---

## 📊 Key Technologies

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend | React | 18.2.0 | UI Framework |
| Language | TypeScript | 5.9.3 | Type Safety |
| Build | Vite | 6.2.0 | Fast Development |
| Styling | Tailwind CSS | 4.1.18 | Utility CSS |
| Routing | React Router | 7.10.1 | SPA Navigation |
| State | Context API | - | State Management |
| Backend | Firebase | 12.6.0 | BaaS Platform |
| Auth | Firebase Auth | - | User Authentication |
| Database | Firestore | - | NoSQL Database |
| Storage | Cloud Storage | - | File Storage |
| Charts | Recharts | 3.5.1 | Data Visualization |
| Icons | Lucide React | 0.557.0 | UI Icons |
| QR Codes | qrcode | 1.5.4 | Payment QR Generation |

---

## 📝 Project Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🎯 Development Highlights

### Component Architecture
- Separated admin and customer components
- Reusable UI components
- Context-based state management
- Lazy loading for performance

### Database Design
- Normalized schema for efficiency
- Indexed queries for fast searches
- Real-time listeners for live updates

### Error Handling
- Global error boundary
- Try-catch in async operations
- User-friendly error messages

---

## 📚 Additional Documentation

For more detailed information, see:
- **[PROJECT_ANALYSIS.md](PROJECT_ANALYSIS.md)** - Technology stack & analysis
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Detailed architecture explanation
- **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** - Firebase configuration guide
- **[DEFENSE_CHECKLIST.md](DEFENSE_CHECKLIST.md)** - Pre-defense verification
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide

---

## 🛠️ Troubleshooting

### Server won't start
```bash
npm install
npm run dev
```

### Firebase auth errors
- Check `.env` file has correct Firebase credentials
- Verify Firebase project is active
- Check firestore.rules are deployed

### Styles not showing
- Restart dev server
- Check Tailwind CSS is configured in `tailwind.config.cjs`

### Build fails
```bash
rm -rf node_modules dist
npm install
npm run build
```

---

## 👨‍💼 Defense Tips

1. **Explain the architecture** - Show this diagram during presentation
2. **Demonstrate live features** - Have demo accounts ready
3. **Discuss security** - Explain Firebase rules and TypeScript advantages
4. **Show code organization** - Structure is clean and scalable
5. **Explain payment integration** - KHQR for Cambodian context
6. **Discuss scalability** - Firebase handles load automatically
7. **Mention best practices** - Error boundaries, lazy loading, etc.

---

## 📞 Support

For questions about the project structure or setup, refer to the documentation files listed above.

---

**Last Updated:** April 23, 2026  
**Project Status:** Ready for Defense ✅
