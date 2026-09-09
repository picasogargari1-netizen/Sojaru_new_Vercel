# Sojaru — Headless WooCommerce Storefront (PRD)

## Original Problem
Build "Sojaru", a custom headless storefront on top of a live WordPress + WooCommerce backend (store: sojaru.co.in). WooCommerce is the source of truth for products, categories, variations, inventory, orders, customers, coupons. Frontend is fully custom (React), never default WooCommerce theme. Two worlds: "For You" (people) and "For Your Pet" (pets). Brand messaging: "for you and your best friend." Reference (inspiration only, not copy): franklywearing.com.

## Architecture
- Frontend: React (CRA + craco), Tailwind, shadcn/ui, react-router. Design system: Fraunces (display) + Plus Jakarta Sans (body), warm cream/ink/terracotta/matcha palette.
- Backend: FastAPI proxy to WooCommerce REST API v3 (httpx, basic auth). Consumer key/secret stored server-side in backend/.env only — never exposed to frontend.
- Auth: Custom JWT (bcrypt) users in MongoDB, mapped to WooCommerce customer_id (created on register) for order history.
- MongoDB: users collection only (WooCommerce is source of truth for commerce data).

## Core Requirements (static)
- Dynamic products/categories from WooCommerce; adding a product in wp-admin auto-appears on site.
- Mega-menu nav (For You / For Your Pet), search, cart drawer, checkout, customer account, SEO, mobile-first.
- Never expose WC secrets client-side.

## Implemented (2026-06)
- Backend proxy endpoints: /store/config, /categories, /products (filters: category, on_sale, featured, search, price, stock, sort, pagination), /products/{id}, /products/slug/{slug}, /products/{id}/variations, /related, /coupons/validate, /orders (create + get), auth (register/login/me), /account/orders, /account/profile. In-memory TTL cache for public reads.
- Seeded 14 demo products across all subcategories (incl. 3 variable products with Size/Color) with AI-generated brand imagery.
- Storefront: Home (hero, two worlds, shop-by-category, featured/new/sale/best-seller rows, editorial banner), World pages, Category pages (filters/sort/load-more), Product detail (gallery, variations, qty, add/buy, accordions, related, JSON-LD), Search (dialog + results page), Cart drawer (free-ship progress, coupon at checkout), Checkout (order creation -> WooCommerce hosted payment link), Account (orders/profile/addresses), Login/Register, About/Contact/FAQ/Shipping/Privacy/Terms, 404.
- SEO meta/OG/canonical per page, product structured data.

## Category Image Management (2026-09)
- Dynamic sub-categories: All WooCommerce sub-categories automatically appear on homepage bento grid and in admin
- Admin "Category Images" tab: 4-column portrait grid of all sub-categories. Hover shows Upload/Replace/Replace/Remove
- Custom image upload per category slug → stored in Emergent Object Storage → served via /api/media/
- Homepage CategoryRow uses priority: admin-uploaded > WooCommerce > hardcoded fallback
- Fixed: app.include_router(api) was missing (all 22 routes restored)
- Fixed: EMERGENT_LLM_KEY added to backend/.env (storage now initializes correctly)

## Homepage Redesign (2026-09) — hyppy.in match
- Marquee rolling ticker above header (admin-configurable from MongoDB)
- Hero image slider (admin-uploadable)
- Warm italic "welcome home ✿ come on in ✿ stay a while" marquee below hero
- "hello! welcome home :)" welcome section with brand message
- Festive Collections section (admin-configured category, title, enabled toggle)
- Sub-categories BENTO GRID: 5-column grid on desktop with varying spans [2,2,1 / 2,1,2 / 2,3 pattern], landscape (4:3) images, white DM Serif text OVERLAID on images with subtle bottom gradient — matches hyppy.in reference exactly. 2-col on mobile.
- "your favorites are back.." section (products from featured-collection WooCommerce category)
- "Our Best Sellers" section (products from best-sellers category)
- "Sheer Joy" section (products from on-sale category, terracotta heading)
- "Our Story" section with AI-generated Indian brother-sister cartoon illustration

## Payment note
Checkout creates a pending WooCommerce order via REST, then hands off to the store's WooCommerce hosted "order-pay" URL for actual payment (uses whatever gateways the owner configured). No card data touches this app.

## Cloudinary + Vercel Migration (2026-06)
- Replaced Emergent object storage with Cloudinary for all image uploads (hero + category)
- Hero/category image upload endpoints now store Cloudinary CDN URLs (`https://res.cloudinary.com/...`) in MongoDB
- Delete endpoints also clean up Cloudinary assets by public_id
- Removed `/api/media/{path}` proxy endpoint (no longer needed — images served directly from Cloudinary CDN)
- `public_settings()` updated to only return records with `url` field (old `storage_path` records silently skipped)
- Created `api/index.py` as Vercel Python serverless ASGI entry point
- Created `vercel.json` with `@vercel/python` + `@vercel/static-build` builders and route config
- Created `api/requirements.txt` (lean production deps for Vercel function)
- Fixed `frontend/src/lib/api.js`: `BACKEND_URL` defaults to `""` (relative API calls work on Vercel same-domain), `mediaUrl()` now handles full URLs (Cloudinary) without prepending BACKEND_URL
- Updated `DEPLOYMENT.md` with full Vercel + GitHub deployment guide

## Backlog / Future (P1/P2)
- WooCommerce Store API cart/checkout for fully inline payment.
- Webhook-based cache invalidation on product update.
- Wishlist persistence, product reviews submission, gift-message field passthrough.
- Global attribute taxonomies for server-side size/color filtering (currently client-side).
