# Mgobal 🛒
### Kenya's Premier Full-Stack E-Commerce Platform

> Built with **Django REST Framework** (backend) + **React + Vite** (frontend)
> M-Pesa payments · Pickup stations across 47 counties · Push notifications · JWT auth

---

## 📁 Full Project Structure

```
mgobal/
│
├── README.md                          # This file
│
├── backend/                           # Django Backend
│   │
│   ├── requirements.txt               # Python dependencies
│   │
│   ├── mgobal/                        # Django project config
│   │   ├── __init__.py
│   │   ├── settings.py                # Settings: JWT, CORS, M-Pesa, FCM, DB
│   │   ├── urls.py                    # Root URL dispatcher
│   │   ├── wsgi.py
│   │   └── asgi.py
│   │
│   └── core/                          # Single core app (all e-commerce logic)
│       ├── __init__.py
│       ├── apps.py                    # App config
│       ├── admin.py                   # Django admin registrations
│       ├── models.py                  # All database models (16 models)
│       ├── serializers.py             # DRF serializers (20+ serializers)
│       ├── views.py                   # ViewSets, API views, M-Pesa STK push
│       └── urls.py                    # App URL router (DRF DefaultRouter)
│
└── frontend/                          # React Frontend (Vite)
    │
    ├── index.html                     # Entry HTML: Bootstrap Icons CDN, full SEO meta,
    │                                  # Open Graph, Twitter Card, JSON-LD structured data
    ├── package.json                   # NPM dependencies (React 18, React Router 6)
    ├── vite.config.js                 # Vite config + /api proxy to Django :8000
    │
    └── src/
        │
        ├── main.jsx                   # ReactDOM.createRoot entry point
        │
        ├── App.jsx                    # BrowserRouter, all routes, AppContext provider:
        │                              #   - user, login(), logout()
        │                              #   - cart state + refreshCart()
        │                              #   - wishlist state
        │                              #   - notifications + unread count
        │                              #   - toast() alert system
        │                              #   - PrivateRoute wrapper
        │
        ├── services/
        │   └── api.js                 # Centralised API layer:
        │                              #   authAPI    — register, login
        │                              #   profileAPI — me, update, updateFcm
        │                              #   productAPI — list, detail, featured,
        │                              #                flashSale, search, reviews
        │                              #   categoryAPI — list, detail, all
        │                              #   brandAPI    — list
        │                              #   cartAPI     — get, add, update, remove, clear
        │                              #   wishlistAPI — list, toggle
        │                              #   locationAPI — counties, pickupStations
        │                              #   addressAPI  — list, create, update, delete
        │                              #   orderAPI    — list, detail, create, cancel
        │                              #   couponAPI   — validate
        │                              #   notifAPI    — list, markRead, unreadCount
        │                              #   bannerAPI   — list
        │                              # + auto JWT refresh on 401
        │
        ├── styles/
        │   └── main.css               # Full CSS design system (1000+ lines):
        │                              #   CSS custom properties (colors, spacing, shadows)
        │                              #   Topbar, Navbar, Category bar
        │                              #   Hero slider, Flash sale banner + countdown
        │                              #   Product grid (2→3→4→5→6 col responsive)
        │                              #   Product card with hover effects
        │                              #   Product detail gallery
        │                              #   Cart layout, Order summary
        │                              #   Checkout steps, Pickup station cards
        │                              #   Payment method cards
        │                              #   Auth pages (login/register)
        │                              #   Profile sidebar + menu
        │                              #   Order status badges + tracking bar
        │                              #   Notification panel
        │                              #   Toast/alert animations
        │                              #   Footer, Mobile bottom nav
        │                              #   Pagination, Breadcrumb
        │                              #   Utility classes
        │
        ├── components/
        │   ├── Layout.jsx             # App shell wrapper (used by all pages):
        │   │                          #   - Topbar (contact, login links)
        │   │                          #   - Sticky navbar (logo, search, cart, bell)
        │   │                          #   - Mobile search bar
        │   │                          #   - Category scrollable bar
        │   │                          #   - Notification slide-in panel
        │   │                          #   - Footer (4-column grid)
        │   │                          #   - Mobile bottom navigation bar
        │   │                          #   - <Outlet /> for page content
        │   │
        │   ├── ProductCard.jsx        # Reusable product card component:
        │   │                          #   - Lazy-loaded image with placeholder
        │   │                          #   - Discount % badge, Flash sale badge
        │   │                          #   - Wishlist heart toggle
        │   │                          #   - Star rating display
        │   │                          #   - Current / compare price
        │   │                          #   - Hover "Add to Cart" button
        │   │                          #   - Out of stock indicator
        │   │                          #   exports: default ProductCard, Stars
        │   │
        │   └── Alerts.jsx             # Toast notification renderer:
        │                              #   - Reads toasts[] from AppContext
        │                              #   - Fixed top-right position
        │                              #   - Types: success, error, warning, info
        │                              #   - Slide-in/out CSS animation
        │
        └── pages/
            │
            ├── index.jsx              # HOME PAGE
            │                          #   - Auto-sliding hero banner (3 slides, 5s interval)
            │                          #   - 2-column hero grid (slider + 2 side cards)
            │                          #   - Category icon grid (colour-coded, hover lift)
            │                          #   - Flash Sale section with live countdown timer
            │                          #   - Horizontal scrollable product rail
            │                          #   - Featured Products grid
            │                          #   - 3-column promo banners (Sell / M-Pesa / Delivery)
            │                          #   - "Just for You" full product grid
            │
            ├── Login.jsx              # LOGIN PAGE
            │                          #   - Email + password fields with icons
            │                          #   - Show/hide password toggle
            │                          #   - Forgot password link
            │                          #   - Inline error messages
            │                          #   - JWT login → AppContext
            │                          #   - Redirect to intended page after login
            │                          #   - Link to Register
            │
            ├── Register.jsx           # REGISTER PAGE
            │                          #   - Step 1: first name, last name, email, phone
            │                          #   - Step 2: username, password, confirm password
            │                          #   - Visual 2-step progress indicator
            │                          #   - Kenyan phone number validation (0712345678)
            │                          #   - Auto-generate username suggestion
            │                          #   - Terms of service checkbox
            │                          #   - Show/hide password toggle
            │
            ├── ProductList.jsx        # ALL PRODUCTS PAGE
            │                          #   - Left filter sidebar (desktop) / toggle (mobile):
            │                          #       Category radio buttons
            │                          #       Price range (min/max KSh)
            │                          #       Brand radio buttons
            │                          #       Featured toggle
            │                          #   - Sort dropdown (newest/price/popular)
            │                          #   - Active filter chips with × remove
            │                          #   - Responsive product grid
            │                          #   - Pagination with ellipsis
            │                          #   - Empty state with "Clear Filters"
            │
            ├── ProductDetail.jsx      # PRODUCT DETAIL PAGE
            │                          #   - Breadcrumb navigation
            │                          #   - 3-column grid: gallery | info | delivery panel
            │                          #   - Image gallery with thumbnail strip
            │                          #   - Brand link, SKU, stock count, view count
            │                          #   - Price / compare price / savings display
            │                          #   - Variant selector (color/size chips)
            │                          #   - Quantity +/- selector
            │                          #   - "Add to Cart" + "Buy Now" + Wishlist buttons
            │                          #   - Trust badges (genuine / returns / delivery / mpesa)
            │                          #   - Delivery & Returns info card
            │                          #   - Sold count urgency label
            │                          #   - Tab panel:
            │                          #       Description tab
            │                          #       Specifications table (key-value)
            │                          #       Reviews tab: rating distribution bar chart,
            │                          #                    review list with verified badge,
            │                          #                    write review form (star picker)
            │                          #   - Related products horizontal scroll
            │
            ├── Cart.jsx               # CART PAGE
            │                          #   - Cart items list:
            │                          #       Product image + name + variant
            │                          #       Quantity +/- with loading state
            │                          #       Remove button
            │                          #       Line subtotal
            │                          #   - Coupon code input + validate
            │                          #   - Applied coupon display with remove
            │                          #   - Order summary sidebar:
            │                          #       Subtotal, delivery (calculated at checkout)
            │                          #       Discount row (if coupon applied)
            │                          #       Grand total
            │                          #   - "Proceed to Checkout" CTA
            │                          #   - Payment method icons
            │                          #   - "Why shop with us" trust panel
            │                          #   - Guest / empty state
            │
            ├── Checkout.jsx           # CHECKOUT PAGE (3 steps + success screen)
            │                          #
            │                          #   Step 1 — DELIVERY METHOD
            │                          #     Tab: Pickup Station
            │                          #       → Select County dropdown (all 47 counties)
            │                          #       → Shows 3–4 pickup stations for that county
            │                          #       → Each station: name, address, hours,
            │                          #                       phone, fee (unique per station)
            │                          #       → Radio select with card highlight
            │                          #     Tab: Home Delivery
            │                          #       → Flat KSh 350 fee notice
            │                          #       → Saved addresses list (radio select)
            │                          #       → "Add New Address" inline form:
            │                          #           full name, phone, county, town,
            │                          #           estate, landmark
            │                          #
            │                          #   Step 2 — PAYMENT METHOD
            │                          #     → M-Pesa (phone number input, STK push)
            │                          #     → Credit/Debit Card
            │                          #     → Cash on Delivery
            │                          #     → Coupon code input
            │                          #     → Order notes textarea
            │                          #
            │                          #   Step 3 — REVIEW ORDER
            │                          #     → Items list with images
            │                          #     → "Place Order — KSh X,XXX" button
            │                          #
            │                          #   Step 4 — SUCCESS SCREEN
            │                          #     → Animated checkmark
            │                          #     → Order number, payment status, total
            │                          #     → Pickup station details (if applicable)
            │                          #     → M-Pesa phone prompt reminder
            │                          #     → "Track Order" + "Continue Shopping"
            │                          #
            │                          #   Sticky order summary sidebar throughout
            │
            ├── Orders.jsx             # ORDERS LIST PAGE
            │                          #   - Status tab bar (All/Pending/Confirmed/
            │                          #                     Processing/Delivered/Cancelled)
            │                          #   - Order cards:
            │                          #       Order number + status badge
            │                          #       Product image thumbnails (max 3 + overflow)
            │                          #       Product name, delivery type, payment info
            │                          #       Total amount
            │                          #       "View Details" link
            │                          #   - Empty state per tab
            │
            ├── OrderDetail.jsx        # ORDER DETAIL PAGE
            │                          #   - Breadcrumb
            │                          #   - Order number + placed date header
            │                          #   - Cancel Order button (pending/confirmed only)
            │                          #   - Visual order tracking bar:
            │                          #       Placed → Confirmed → Processing →
            │                          #       Shipped → Out for Delivery → Delivered
            │                          #   - Cancelled/Returned alert banner
            │                          #   - Payment summary card (subtotal/fee/discount/total)
            │                          #   - Delivery info card (station or address details)
            │                          #   - Order items list (image, name, SKU, qty, price)
            │                          #   - Back to Orders + Continue Shopping links
            │
            ├── Profile.jsx            # PROFILE PAGE (inside Account layout)
            │                          #   - Avatar initials display
            │                          #   - Edit form: first/last name, email, phone, username
            │                          #   - Save Changes with loading state
            │                          #   - Stats cards: Orders / Wishlist / Reviews / Addresses
            │                          #   - Quick action buttons
            │
            ├── Account.jsx            # ACCOUNT SHELL PAGE
            │                          #   - Left sidebar with:
            │                          #       Avatar + name + email header
            │                          #       Navigation menu (Profile/Orders/Wishlist/
            │                          #                        Addresses/Notifications/Security)
            │                          #       Unread notification badge
            │                          #       Sign Out button
            │                          #   - Right <Outlet /> for sub-pages
            │
            ├── Category.jsx           # CATEGORY PAGE
            │                          #   - Breadcrumb
            │                          #   - Category hero banner (gradient by category name)
            │                          #     with icon, name, description, product count
            │                          #   - Sub-category pill chips
            │                          #   - Left filter sidebar (sort + price range)
            │                          #   - Product grid with sort toolbar
            │                          #   - Pagination
            │                          #   - Empty state
            │
            └── SearchResults.jsx      # SEARCH RESULTS PAGE
                                       #   - "Results for: {query}" header
                                       #   - Sort dropdown
                                       #   - Inline min/max price filter
                                       #   - Product count summary
                                       #   - Responsive product grid
                                       #   - Pagination
                                       #   - No results state with Popular Searches chips
                                       #   - Empty query state with Popular Searches
```

---

## 🗄️ Database Models (`core/models.py`) — 16 Models

| Model | Fields | Notes |
|-------|--------|-------|
| `User` | username, email, phone, avatar, fcm_token | Extends AbstractUser |
| `Address` | full_name, phone, county, town, estate, landmark, is_default | Per user, default flag |
| `County` | name, slug | Kenya's 47 counties |
| `PickupStation` | county, name, address, phone, **fee**, working_hours | Per-station unique fee |
| `Category` | name, slug, parent, image, icon, meta fields | Self-referential hierarchy |
| `Brand` | name, slug, logo | — |
| `Product` | name, slug, **sku**, price, compare_price, stock, flash_sale fields, meta fields | UUID pk, SEO slugs |
| `ProductImage` | product, image, alt_text, is_primary | Multiple per product |
| `ProductVariant` | product, name, value, price_adjustment, stock | Size/color/etc |
| `ProductSpecification` | product, key, value | Key-value table |
| `Review` | product, user, rating, title, body, is_verified_purchase | Unique per user+product |
| `Wishlist` | user, product | Unique per user+product |
| `Cart` | user, session_key | Guest + logged-in support |
| `CartItem` | cart, product, variant, quantity | Unique per cart+product+variant |
| `Coupon` | code, discount_type, discount_value, minimum_order, valid_from/to | Percent or fixed |
| `Order` | order_number, status, delivery_type, pickup_station, delivery_address, payment fields | Auto-generated MGB# |
| `OrderItem` | order, product snapshot (name/sku/price) | Immutable snapshot |
| `Notification` | user, type, title, message, is_read | order_update/promo/flash_sale/system |
| `Banner` | title, subtitle, image, link | Homepage banners |

---

## 🔌 Full API Reference

### Authentication
```
POST   /api/auth/register/          Register → returns {user, access, refresh}
POST   /api/auth/login/             Login   → returns {user, access, refresh}
POST   /api/token/refresh/          Refresh access token
```

### Products
```
GET    /api/products/               List (filter: category__slug, brand__slug,
                                         is_featured, is_flash_sale, min_price,
                                         max_price; search: name/desc/brand/cat;
                                         ordering: price/-price/-created_at/-sold_count)
GET    /api/products/{slug}/        Detail (auto-increments view count)
GET    /api/products/featured/      Featured products (max 12)
GET    /api/products/flash-sale/    Active flash sale (end time not passed)
GET    /api/products/search/?q=     Full-text search across name/desc/brand/cat
GET    /api/products/{slug}/reviews/   Get reviews
POST   /api/products/{slug}/reviews/   Post review (auth required)
```

### Categories & Brands
```
GET    /api/categories/             Root categories with children
GET    /api/categories/{slug}/      Category detail with children
GET    /api/categories/all/         Flat list of all active categories
GET    /api/brands/                 All brands
GET    /api/brands/{slug}/          Brand detail
```

### Locations
```
GET    /api/counties/               All counties + their pickup stations
GET    /api/counties/{slug}/        Single county + stations
GET    /api/pickup-stations/        All stations (filter: ?county=ID, ?county__slug=)
```

### Cart (auth required)
```
GET    /api/cart/                   Current cart with items + total
POST   /api/cart/add/               {product_id, quantity, variant_id?}
PATCH  /api/cart/update_item/       {item_id, quantity} (qty=0 removes)
DELETE /api/cart/remove_item/?item_id=   Remove single item
DELETE /api/cart/clear/             Remove all items
```

### Wishlist (auth required)
```
GET    /api/wishlist/               User's wishlist
POST   /api/wishlist/toggle/        {product_id} → {action: "added"|"removed"}
```

### Addresses (auth required)
```
GET    /api/addresses/              User's addresses
POST   /api/addresses/              Create address
PATCH  /api/addresses/{id}/         Update address
DELETE /api/addresses/{id}/         Delete address
```

### Orders (auth required)
```
GET    /api/orders/                 User's order history (newest first)
GET    /api/orders/{id}/            Order detail with items
POST   /api/orders/create_order/    Place order:
                                      {delivery_type, pickup_station_id?,
                                       delivery_address_id?, payment_method,
                                       mpesa_phone?, coupon_code?, notes?}
POST   /api/orders/{id}/cancel/     Cancel order (pending/confirmed only)
```

### Payments
```
POST   /api/coupon/validate/        {code, total} → {discount_amount, ...}
POST   /api/mpesa/callback/         Safaricom STK callback (public, no auth)
```

### Profile & Notifications (auth required)
```
GET    /api/profile/me/             Get own profile
PATCH  /api/profile/me/             Update profile fields
POST   /api/profile/update_fcm/     {fcm_token} — update Firebase push token
GET    /api/notifications/          Last 50 notifications
POST   /api/notifications/mark_read/  {ids: []} — empty = mark all read
GET    /api/notifications/unread_count/  → {count: N}
GET    /api/banners/                Homepage banners
```

---

## ⚙️ Setup & Installation

### Backend

```bash
cd mgobal/backend

python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

pip install -r requirements.txt

python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
# API → http://localhost:8000/api/
# Admin → http://localhost:8000/admin/
```

### Frontend

```bash
cd mgobal/frontend

npm install
npm run dev
# App → http://localhost:5173/
```

### Seed Counties & Pickup Stations

```python
# python manage.py shell
from core.models import County, PickupStation

counties_data = {
    'Nairobi': [
        ('CBD Station', 'Tom Mboya Street, CBD', '0700000001', 99),
        ('Westlands', 'Sarit Centre, Westlands', '0700000002', 149),
        ('Karen', "The Hub Karen, Lang'ata Rd", '0700000003', 199),
        ('Eastleigh', 'Eastleigh, 1st Avenue', '0700000004', 129),
    ],
    'Mombasa': [
        ('CBD', 'Moi Avenue, Mombasa', '0711000001', 149),
        ('Nyali', 'Nyali Centre, Links Rd', '0711000002', 179),
        ('Likoni', 'Likoni Shopping Centre', '0711000003', 169),
    ],
    "Murang'a": [
        ('Town Centre', "Murang'a Main Street", '0744000001', 159),
        ('Kenol', 'Kenol Town, Thika Rd', '0744000002', 179),
        ('Kangema', 'Kangema Town Centre', '0744000003', 169),
    ],
}

for name, stations in counties_data.items():
    county, _ = County.objects.get_or_create(name=name)
    for s_name, s_addr, s_phone, s_fee in stations:
        PickupStation.objects.get_or_create(
            county=county, name=s_name,
            defaults={'address': s_addr, 'phone': s_phone, 'fee': s_fee}
        )
print("Seeded!")
```

---

## 💳 M-Pesa (Safaricom Daraja)

| Mode | Behaviour |
|------|-----------|
| `DEBUG = True` | M-Pesa bypassed. Orders auto-marked `paid`. No real API calls. |
| `DEBUG = False` | Real STK Push to customer's phone. Callback updates order. |

**Required env vars (production):**
```env
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=...
MPESA_PASSKEY=...
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback/
```

---

## 🔔 Push Notifications

```env
FCM_SERVER_KEY=your_firebase_server_key
```

Auto-triggered on: order placed · payment confirmed · order cancelled

---

## 🎨 Design System

- **Colors:** Deep Navy `#0a2463` + Amber Gold `#f7b731`
- **Fonts:** `Syne` (headings) + `Plus Jakarta Sans` (body) — Google Fonts
- **Icons:** Bootstrap Icons 1.11 via CDN
- **No UI library** — all custom CSS with CSS variables

---

> Built with ❤️ in Kenya 🇰🇪