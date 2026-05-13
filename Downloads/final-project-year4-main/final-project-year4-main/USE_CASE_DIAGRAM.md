# TinhMe E-Commerce Use Case Diagram

## SYSTEM OVERVIEW
- **System Name**: TinhMe - Modern Fashion E-Commerce Platform
- **Actors**: Customer, Admin, System
- **Date**: March 2026

---

## 1. CUSTOMER USE CASES

### 1.1 Browse Products
```
Actor: Customer
Use Case: Browse Products
Flow:
  1. Customer opens home page
  2. Customer views featured products and new arrivals
  3. Customer can use search bar to find products
  4. Customer can filter by:
     - Category (Men, Women, Boys, Girls)
     - Subcategory (T-Shirts, Dresses, Shoes, etc.)
     - Price range
  5. System displays matching products
  6. Customer views product details (name, price, images, colors, rating, stock)
  7. Use case ends
```

### 1.2 View Product Details
```
Actor: Customer
Use Case: View Product Details
Precondition: Product must exist in system
Flow:
  1. Customer clicks on a product
  2. System displays:
     - Product name and description
     - Price and discount (if applicable)
     - Available colors
     - Stock status
     - Customer ratings and reviews
     - Related products
  3. Customer can see multiple product images
  4. Customer can select:
     - Color preference
     - Quantity desired
  5. Use case ends
```

### 1.3 Add to Cart
```
Actor: Customer
Use Case: Add Product to Cart
Precondition: Product must be in stock
Flow:
  1. Customer views product details
  2. Customer selects color (optional)
  3. Customer enters quantity
  4. Customer clicks "Add to Cart"
  5. System validates:
     - Product availability
     - Stock quantity
  6. System adds item to cart
  7. System displays notification "Product added successfully"
  8. Cart count updates in navbar
  9. Use case ends
Alternate:
  - If out of stock: System shows "Out of Stock" badge
  - Customer cannot proceed
```

### 1.4 Manage Cart
```
Actor: Customer
Use Case: Manage Shopping Cart
Precondition: Customer has items in cart
Flow:
  1. Customer navigates to Cart page
  2. System displays:
     - All cart items
     - Product details (name, color, quantity, price)
     - Subtotal and total price
     - Discount information
  3. Customer can:
     - Increase/decrease item quantity
     - Remove items from cart
     - Apply coupon code (if available)
     - Continue shopping
     - Proceed to checkout
  4. System updates cart total in real-time
  5. Use case ends
```

### 1.5 Add to Wishlist
```
Actor: Customer
Use Case: Add Product to Wishlist
Precondition: Customer must be logged in
Flow:
  1. Customer views product
  2. Customer clicks heart/wishlist icon
  3. System adds product to wishlist
  4. System updates wishlist count in navbar
  5. Heart icon becomes filled
  6. System displays notification "Added to Wishlist"
  7. Use case ends
Alternate:
  - If product already in wishlist: Remove from wishlist
  - Heart icon becomes unfilled
```

### 1.6 View Wishlist
```
Actor: Customer
Use Case: View Wishlist
Precondition: Customer must be logged in
Flow:
  1. Customer clicks wishlist icon in navbar
  2. System displays all wishlist items
  3. For each item, customer can:
     - View product details
     - Add to cart
     - Remove from wishlist
     - See if product is in stock
     - Check current price
  4. Customer can sort/filter wishlist items
  5. Use case ends
```

### 1.7 User Authentication
```
Actor: Customer
Use Case: Sign Up / Log In
Flow A - Sign Up:
  1. Customer clicks "Sign In" button
  2. System displays auth modal
  3. Customer enters email and password
  4. System validates:
     - Email format is valid
     - Email is not already registered
     - Password meets requirements
  5. System creates account
  6. Customer is logged in
  7. Use case ends

Flow B - Log In:
  1. Customer clicks "Sign In" button
  2. Customer enters email and password
  3. System validates credentials
  4. If valid: Customer is logged in
  5. If invalid: Display error message
  6. Use case ends
```

### 1.8 View User Profile
```
Actor: Customer
Use Case: View/Edit Profile
Precondition: Customer must be logged in
Flow:
  1. Customer clicks on user account menu
  2. Customer selects "View Profile"
  3. System displays:
     - User name and email
     - Account type (Customer/Admin)
     - Profile information
  4. Customer can:
     - View account details
     - Log out
     - Access admin dashboard (if admin role)
  5. Use case ends
```

### 1.9 Checkout & Payment
```
Actor: Customer, Payment System
Use Case: Complete Purchase
Precondition: Customer has items in cart, must be logged in
Flow:
  1. Customer clicks "Checkout"
  2. System displays order summary
  3. System shows total price with tax/discount
  4. Customer reviews order details
  5. System offers payment options:
     - Credit/Debit Card
     - ABA khqr (Cambodia payment)
     - EMV QR
  6. Customer selects payment method
  7. Customer completes payment
  8. Payment system processes transaction
  9. System creates order in database
  10. System sends confirmation email
  11. Cart is cleared
  12. Use case ends
Alternate:
  - If payment fails: Display error, allow retry
  - Customer remains on payment page
```

### 1.10 View Order History
```
Actor: Customer
Use Case: View Orders
Precondition: Customer must be logged in
Flow:
  1. Customer clicks package icon / "My Orders"
  2. System displays all customer orders:
     - Order ID
     - Order date
     - Items purchased
     - Total amount paid
     - Order status (Pending, Shipped, Delivered, Cancelled)
  3. Customer can click on order to see details:
     - Item list with prices
     - Shipping information
     - Delivery address
     - Tracking status
  4. Use case ends
```

### 1.11 Search Products
```
Actor: Customer
Use Case: Search for Products
Flow:
  1. Customer enters search term in search bar
  2. Customer presses Enter
  3. System searches by:
     - Product name
     - Category
     - Description keywords
  4. System displays matching products
  5. Results show:
     - Product name
     - Price with discount
     - Product image
     - Stock status
     - Rating
  6. Customer can click result to view details
  7. Use case ends
```

---

## 2. ADMIN USE CASES

### 2.1 Manage Products
```
Actor: Admin
Use Case: Create Product
Precondition: Admin must be logged in
Flow:
  1. Admin opens Admin Dashboard
  2. Admin selects "Products" section
  3. Admin clicks "+ Add Product"
  4. System displays category selection modal:
     - Admin selects main category (Men, Women, Boys, Girls)
     - Admin selects one or more subcategories
     - Admin clicks "Continue"
  5. System displays product form with fields:
     - Product Name (required)
     - Price (required)
     - Promotion % (0-100)
     - Colors:
       * Quick-select: Black, White buttons
       * Custom: Input hex color codes
       * Visual color preview
     - Stock quantity (required)
     - Category (pre-filled)
     - Product Image:
       * Option A: Image URL
       * Option B: Upload File (drag & drop)
     - Mark as New Arrival (checkbox)
     - Description (textarea)
  6. Admin enters all required information
  7. For image upload:
     - Admin uploads JPG/PNG/WEBP (max 5MB)
     - System optimizes image (downscale to 1280px)
     - System shows upload progress
     - Image is uploaded to Firebase Storage
  8. Admin clicks "Add Product"
  9. System validates all fields
  10. System creates product in Firestore database
  11. System displays success message
  12. Admin can add another product or return to list
  13. Use case ends
```

### 2.2 Edit Product
```
Actor: Admin
Use Case: Update Product
Precondition: Admin must be logged in, product exists
Flow:
  1. Admin navigates to Products section
  2. Admin clicks edit icon on product row
  3. System displays product form with existing data pre-filled
  4. Admin can modify:
     - Product name
     - Price
     - Promotion percentage
     - Colors
     - Stock quantity
     - Category
     - Product image (URL or upload)
     - New Arrival status
     - Description
  5. Admin clicks "Save Changes"
  6. System validates changes
  7. System updates product in database
  8. System displays success notification
  9. Use case ends
```

### 2.3 Delete Product
```
Actor: Admin
Use Case: Delete Product
Precondition: Admin logged in, product exists
Flow:
  1. Admin navigates to Products section
  2. Admin finds product in list
  3. Admin clicks delete/trash icon
  4. System displays confirmation dialog:
     "Are you sure you want to delete this product?"
  5. Admin confirms deletion
  6. System removes product from database
  7. System displays success message
  8. Product list is updated
  9. Use case ends
Alternate:
  - Admin cancels: Product remains unchanged
```

### 2.4 View Product List
```
Actor: Admin
Use Case: View All Products
Precondition: Admin must be logged in
Flow:
  1. Admin navigates to Products section
  2. System displays table of all products:
     - Product name
     - Price
     - Stock quantity
     - Category
     - Action buttons (Edit, Delete)
  3. Admin can:
     - Sort by name, price, stock
     - Search for specific product
     - View product details
  4. Use case ends
```

### 2.5 Manage Orders
```
Actor: Admin
Use Case: View and Manage Orders
Precondition: Admin must be logged in
Flow:
  1. Admin navigates to "Orders" section
  2. System displays all customer orders:
     - Order ID
     - Customer name
     - Order date
     - Total amount
     - Order status
  3. Admin can click on order to see:
     - Customer details
     - Items ordered with quantities and prices
     - Delivery address
     - Payment status
     - Order timeline
  4. Admin can update order status:
     - Pending → Processing
     - Processing → Shipped
     - Shipped → Delivered
     - Any → Cancelled
  5. System sends status update email to customer
  6. Use case ends
```

### 2.6 View Sales Reports
```
Actor: Admin
Use Case: View Sales Analytics
Precondition: Admin must be logged in
Flow:
  1. Admin navigates to "Sales Reports" section
  2. System displays dashboard with:
     - Total revenue
     - Total orders count
     - Average order value
     - Sales by category (bar chart)
     - Low stock alerts
     - Recent orders
  3. Admin can:
     - View reports by date range
     - Export reports
     - Analyze sales trends
  4. Use case ends
```

### 2.7 Manage Users
```
Actor: Admin
Use Case: View and Manage Users
Precondition: Admin must be logged in
Flow:
  1. Admin navigates to "Users" section
  2. System displays list of all users:
     - User name
     - Email
     - Account type (Customer/Admin)
     - Creation date
  3. Admin can:
     - Search for users
     - View user details
     - View user order history
     - Manage user roles (if applicable)
  4. Use case ends
```

### 2.8 Reindex Search
```
Actor: Admin
Use Case: Optimize Search Index
Precondition: Admin must be logged in
Flow:
  1. Admin navigates to Products section
  2. Admin clicks "Reindex Search" button
  3. System displays confirmation:
     "Reindex search for all products? This will update existing products 
      so search like 'shirt' works better."
  4. Admin confirms action
  5. System processes all products and updates search fields
  6. System displays progress
  7. System shows completion message with product count
  8. Use case ends
```

### 2.9 Admin Dashboard Overview
```
Actor: Admin
Use Case: View Dashboard
Precondition: Admin must be logged in
Flow:
  1. Admin logs in and navigates to admin dashboard
  2. System displays:
     - Navigation sidebar with sections:
       * Dashboard (overview)
       * Products (manage)
       * Orders (manage)
       * Users (view)
       * Sales Reports (analytics)
  3. Admin can:
     - Switch between different sections
     - View overview statistics
     - Access all admin functions
  4. Use case ends
```

### 2.10 Admin Login
```
Actor: Admin
Use Case: Admin Authentication
Precondition: Admin account exists
Flow:
  1. Admin visits website
  2. Admin clicks "Sign In"
  3. Admin enters email and password
  4. System validates credentials against admin accounts
  5. If valid:
     - Admin is logged in
     - Dashboard redirect with admin role
  6. If invalid:
     - Error message displayed
     - Admin can retry
  7. Use case ends
```

---

## 3. SYSTEM USE CASES

### 3.1 Product Image Upload to Storage
```
Actor: System
Use Case: Handle Image Upload
Precondition: Image file selected or URL provided
Flow:
  1. System receives image (file or URL)
  2. If file upload:
     a. System validates file type (JPG, PNG, WEBP)
     b. System compresses/optimizes image:
        - Resize to max 1280px
        - Reduce quality if needed
        - Target max 1.5MB
     c. System uploads to Firebase Storage
     d. System displays progress (0-100%)
     e. System retrieves download URL
  3. If URL:
     a. System validates URL format
     b. System tests image accessibility
     c. System stores URL directly
  4. System saves image URL to product record
  5. Use case ends
```

### 3.2 Cart Persistence
```
Actor: System
Use Case: Sync Cart Data
Precondition: Customer has cart items
Flow:
  1. Customer adds/removes items from cart
  2. System updates local cart state
  3. System syncs cart to Firestore (if logged in)
  4. System displays updated cart count
  5. Data persists across sessions
  6. Use case ends
```

### 3.3 Order Processing
```
Actor: System, Payment Gateway
Use Case: Process Order
Precondition: Cart has items, payment successful
Flow:
  1. System receives payment confirmation
  2. System creates order record with:
     - Order ID
     - Customer ID
     - Order timestamp
     - Items list
     - Total amount
     - Delivery address
     - Order status (Pending)
  3. System deducts stock from products
  4. System clears customer's cart
  5. System sends confirmation email
  6. System displays order confirmation page
  7. Use case ends
```

### 3.4 Category Management
```
Actor: System
Use Case: Maintain Category Structure
Flow:
  1. System initializes with main categories:
     - Men
     - Women
     - Boys
     - Girls
  2. Each category has subcategories:
     Men:
       - T-Shirts, Shirts, Hoodies & Jackets, Jeans, Trousers, Shorts
       - Sneakers, Sandals, Formal Shoes
       - Bags, Caps & Hats, Belts, Socks
     Women:
       - Tops, Dresses, Hoodies & Jackets, Jeans, Skirts, Shorts
       - Heels, Flats, Sneakers, Sandals
       - Bags, Jewelry, Hats, Sunglasses
     Boys:
       - T-Shirts, Shirts, Jackets, Jeans, Shorts
       - Sneakers, Sandals
       - Caps, Backpacks, Socks
     Girls:
       - Dresses, Tops, Jackets, Jeans, Skirts
       - Flats, Sneakers, Sandals
       - Bags, Hair Accessories, Hats
  3. Admin can add custom categories
  4. Use case ends
```

---

## 4. ACTOR INTERACTIONS

### Customer Interaction Flow
```
Customer Journey:
1. Lands on homepage → Browse products
2. Uses navbar dropdown → Filter by category
3. Searches → Find specific product
4. Views details → Selects color & quantity
5. Adds to cart → Updates cart count
6. Can add to wishlist → Saves for later
7. Proceeds to checkout → Reviews order
8. Completes payment → Gets confirmation
9. Checks order status → Tracks delivery
10. Accesses profile → Manages account
```

### Admin Interaction Flow
```
Admin Management:
1. Logs in → Views dashboard
2. Creates products → Selects category + colors
3. Uploads images → Optimizes & stores
4. Manages inventory → Updates stock
5. Edits products → Updates details
6. Deletes old products
7. Reviews orders → Updates status
8. Views sales reports → Analyzes metrics
9. Manages users → Oversees accounts
10. Reindexes search → Optimizes system
```

---

## 5. KEY SYSTEM FEATURES

### Features by Section:

**Homepage**
- Hero carousel with new arrivals
- Featured product grid
- Product search
- Category navigation

**Shop Page**
- Product listing grid
- Search functionality
- Price range filter
- Sidebar filters
- Product cards with ratings

**Product Details**
- Full product information
- Image gallery
- Color selection
- Stock status
- Add to cart/wishlist
- Related products

**Cart**
- Item management
- Quantity adjustment
- Price calculation
- Checkout button

**Checkout & Payment**
- Order review
- Payment methods
- Order confirmation

**Orders**
- Order history
- Order tracking
- Order details

**Admin Dashboard**
- Products management (CRUD)
- Order management
- User management
- Sales analytics
- Search optimization

---

## 6. DATA FLOW SUMMARY

```
User Registration
↓
Browse Products → Search/Filter/Categories
↓
View Details → Add to Cart/Wishlist
↓
Review Cart → Checkout
↓
Payment Processing
↓
Order Created
↓
Admin Reviews Order → Updates Status
↓
Customer Tracks Order
↓
Delivery Complete

Admin Flow:
Login → Dashboard → Add/Edit/Delete Products → Manage Orders → View Analytics
```

