# Requirements Document

## 1. Application Overview

**Application Name**: Infotech Internet Services

**Description**: A web-based platform for purchasing mobile data bundles, SMS offers, and minutes offers. The application provides a seamless purchase experience for customers without requiring registration or login, while offering comprehensive management capabilities for administrators.

## 2. Users and Usage Scenarios

**Target Users**:
- Customers: Mobile users seeking to purchase data bundles, SMS, and minutes
- Administrators: Platform operators managing bundles, orders, and system settings

**Core Usage Scenarios**:
- Customers browse and purchase bundles using embedded payment interface
- Customers track order status and payment confirmation
- Administrators manage bundle inventory and monitor business performance
- Administrators handle customer orders and system configuration

## 3. Page Structure and Functionality

### Page Hierarchy

```
Customer Pages
├── Home Page (/)
├── Track Order Page (/track-order)
├── Payment Success Page (/payment-success)
└── 404 Page (/404)

Admin Pages
├── Admin Login Page (/admin/login)
└── Admin Dashboard (/admin/dashboard)
    ├── Dashboard Overview
    ├── Bundles Management
    ├── Categories Management
    ├── Orders Management
    ├── Website Settings
    ├── Analytics
    └── Audit Logs
```

### 3.1 Customer Pages

#### 3.1.1 Home Page (/)

**Hero Section**:
- Display site name and logo
- Show tagline or welcome message
- Display gradient background with glassmorphism effects

**Bundle Categories Section**:
- Display category tabs: Data Bundles, Buy Many Times, SMS Offers, Minutes Offers
- Allow customers to switch between categories

**Bundle Cards Section**:
- Display all active bundles grouped by selected category
- Show bundle details on premium cards: bundle name, price (KES), validity period, data/SMS/minutes amount
- Provide Buy button on each card
- Apply hover animations and soft shadows

**How It Works Section**:
- Display step-by-step purchase process
- Show icons and brief descriptions

**Track Order Section**:
- Provide input field for phone number or order reference
- Show Track Order button

**Contact Support Section**:
- Display WhatsApp number
- Display support email address
- Show footer text

#### 3.1.2 Checkout Modal (Embedded)
- Display when customer clicks Buy button
- Show selected bundle details: name, price, validity
- Provide input field for Safaricom phone number
- Show total amount to pay
- Display Pay Now button
- When Pay Now is clicked:
  + Create order record in Supabase with pending status
  + Generate unique order reference
  + Open GiftedPay payment page (https://pay.gifted.co.ke/pay/infotechservices) inside embedded modal/iframe
- Payment interface remains within the website (no external redirects)
- After payment completion, automatically close modal and redirect to payment success page
- Update order payment status in Supabase

#### 3.1.3 Track Order Page (/track-order)
- Provide input field for order reference or phone number
- Display order details: bundle name, amount, phone number, order date, order reference
- Show payment status: pending, successful, failed
- Display order status updates

#### 3.1.4 Payment Success Page (/payment-success)
- Display payment confirmation message
- Show order details: order reference, bundle name, amount paid
- Provide option to track order
- Show contact support information

#### 3.1.5 404 Page (/404)
- Display error message for invalid URLs
- Provide navigation back to home page

### 3.2 Admin Pages

#### 3.2.1 Admin Login Page (/admin/login)
- Provide username and password input fields
- Authenticate admin credentials against custom admin_users table in Supabase
- Passwords stored securely using hashing
- Default admin credentials: username=admin, password=Admin@123
- Redirect to admin dashboard upon successful login
- No public registration allowed

#### 3.2.2 Admin Dashboard (/admin/dashboard)

**Access Control**:
- Only authenticated admins can access /admin routes
- Unauthenticated users are redirected to /admin/login

**Dashboard Overview**:
- Display total revenue
- Show total orders count
- Display pending payments count
- Show successful payments count
- Display failed payments count
- Show recent orders list

**Bundles Management**:
- List all bundles with details: name, category, price, validity, status
- Add new bundle: input name, select category, set price, set validity period, set data/SMS/minutes amount
- Edit existing bundle: modify any bundle details
- Delete bundle: remove bundle from system
- Activate bundle: make bundle available for purchase
- Deactivate bundle: hide bundle from customer view

**Categories Management**:
- List all categories
- Add new category: input category name
- Edit category: modify category name
- Delete category: remove category (only if no bundles assigned)

**Orders Management**:
- Display all orders with details: order reference, customer phone, bundle name, amount, payment status, order date
- Search orders by order reference, phone number, or bundle name
- Filter orders by payment status, date range, or bundle category
- View detailed order information
- Export orders data to CSV file

**Website Settings**:
- Edit site name
- Upload and update logo
- Set WhatsApp number for customer support
- Set support email address
- Edit footer text

**Analytics**:
- Display daily revenue chart
- Show weekly revenue summary
- Display monthly revenue trends
- List most purchased bundles with purchase counts
- Show revenue breakdown by bundle category

**Audit Logs**:
- Display all admin actions with timestamps
- Show action type: bundle added, bundle edited, bundle deleted, category modified, settings updated
- Display admin user who performed action
- Filter logs by date range or action type

## 4. Business Rules and Logic

### 4.1 Customer Purchase Flow
1. Customer views all bundles immediately on home page
2. Customer clicks Buy button on selected bundle
3. System opens checkout modal with selected bundle details
4. Customer enters Safaricom phone number
5. Customer clicks Pay Now button
6. System creates order record in Supabase with pending status
7. System generates unique order reference
8. System opens GiftedPay payment page (https://pay.gifted.co.ke/pay/infotechservices) inside embedded modal/iframe within the website
9. Customer completes payment within embedded interface
10. System receives payment confirmation
11. System updates order status to successful in Supabase
12. System automatically closes modal and redirects customer to payment success page

### 4.2 Payment Processing
- Payment link: https://pay.gifted.co.ke/pay/infotechservices
- Payment interface embedded within website using modal/iframe
- No external redirects to new tabs or windows
- Payment confirmation processed automatically
- Order status updated in Supabase based on payment result
- Payment logs created for all payment attempts

### 4.3 Order Tracking
- Customers can track orders using order reference or phone number
- Order status includes: pending payment, payment successful, payment failed
- Order details remain accessible after completion

### 4.4 Bundle Management
- Only active bundles are visible to customers
- Deactivated bundles remain in system but hidden from customer view
- Bundle deletion is permanent and irreversible
- Bundle prices and details can be modified at any time

### 4.5 Category Management
- Categories organize bundles for easier browsing
- Default categories are preloaded: Data Bundles, Buy Many Times, SMS Offers, Minutes Offers
- Categories cannot be deleted if bundles are assigned to them

### 4.6 Admin Access Control
- Admin authentication uses custom admin_users table in Supabase (NOT Supabase Auth)
- Username and password authentication
- Passwords stored securely using hashing
- Default admin: username=admin, password=Admin@123
- Only authenticated admin users can access /admin routes
- Unauthenticated users redirected to /admin/login
- Admin sessions expire after period of inactivity
- All admin actions are logged in audit logs
- No public registration allowed

### 4.7 Data Preloading
System includes preloaded bundles:

**Data Bundles**:
- KES 20 - 250MB (24 Hours)
- KES 19 - 1GB (1 Hour)
- KES 50 - 1.5GB (3 Hours)
- KES 55 - 1.25GB (Till Midnight)
- KES 99 - 1GB (24 Hours)
- KES 49 - 350MB (7 Days)
- KES 300 - 2.5GB (7 Days)

**Buy Many Times**:
- KES 110 - 2GB (24 Hours)
- KES 22 - 1GB (1 Hour)
- KES 52 - 1.5GB (3 Hours)

**SMS Offers**:
- KES 5 - 20 SMS
- KES 10 - 200 SMS
- KES 30 - 1000 SMS

**Minutes Offers**:
- KES 21 - 45 Minutes
- KES 51 - 50 Minutes
- KES 54 - Credo 200
- KES 200 - 250 Minutes

### 4.8 UI/UX Design Principles
- Premium modern design aesthetic
- Primary colors: Emerald Green, Lime Green, White, Dark Gray
- Glassmorphism effects on cards and sections
- Soft shadows for depth
- Hover animations on interactive elements
- Smooth transitions between states
- Modern typography
- Mobile-first responsive design
- Premium card layouts for bundles
- Gradient hero section

## 5. Exceptions and Edge Cases

| Scenario | Handling |
|----------|----------|
| Customer enters invalid phone number | Display error message, prevent order creation |
| Payment interface fails to load | Display error message, allow customer to retry |
| Payment confirmation not received | Order remains in pending status, customer can track status |
| Customer closes modal during payment | Order persists in system, customer can track using order reference |
| Admin attempts to delete category with bundles | Display error message, prevent deletion |
| Admin attempts to deactivate last active bundle in category | Allow deactivation, category remains visible |
| Multiple admins edit same bundle simultaneously | Last save overwrites previous changes |
| Admin login with incorrect credentials | Display error message, prevent access |
| Order tracking with non-existent order reference | Display \"order not found\" message |
| Embedded payment iframe fails to load | Display error message with retry option |
| Admin attempts to access /admin routes without authentication | Redirect to /admin/login |

## 6. Acceptance Criteria

1. Customer navigates to home page and immediately sees all available bundles organized by categories
2. Customer clicks Buy button on selected bundle
3. System opens checkout modal with bundle details and phone number input
4. Customer enters phone number and clicks Pay Now
5. System creates order in Supabase and opens GiftedPay payment interface inside embedded modal within the website
6. Customer completes payment within embedded interface
7. System receives payment confirmation and updates order status in Supabase
8. System automatically redirects customer to payment success page showing order confirmation
9. Customer can track order status using order reference or phone number

## 7. Out of Scope for Current Release

- Customer registration and login system
- Customer account management
- Order history for returning customers
- Saved payment methods
- Promotional codes or discounts
- Bundle recommendations based on purchase history
- Email notifications for order updates
- SMS notifications for payment confirmation
- Multi-language support
- Currency conversion
- Refund processing
- Customer reviews or ratings for bundles
- Social media integration
- Mobile application version
- Bulk bundle purchases
- Subscription or recurring payments
- Gift card functionality
- Loyalty or rewards program
- Advanced analytics dashboards with custom date ranges
- Role-based admin permissions (multiple admin roles)
- Two-factor authentication for admin login
- API access for third-party integrations
- Automated bundle activation based on inventory
- Customer support ticket system
- Live chat functionality
- Payment method alternatives beyond GiftedPay
- Multi-vendor or reseller capabilities