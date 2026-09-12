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

## Node.js Backend Rewrite (2026-06)
- Replaced Python/FastAPI backend with Node.js/Express.js (`api/index.js`)
- All routes preserved: WooCommerce proxy, auth, settings, admin, Cloudinary uploads, customizable products
- Serverless-compatible: MongoDB connection cached, multer uses memoryStorage (no filesystem writes)
- Root `package.json` created with all Node.js dependencies (express, mongodb, bcryptjs, jsonwebtoken, cloudinary, multer, axios, uuid, cors, dotenv)
- `vercel.json` simplified to `framework:null + buildCommand + outputDirectory + rewrites` (no Python services model)
- `api/index.py` and `api/requirements.txt` (Python) removed
- `DEPLOYMENT.md` updated with Node.js deployment steps + Railway.app alternative

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


## Vercel Deployment Fix (2026-07)
- Root cause of deployment failures: `vercel.json` used the experimental "Vercel Services" beta schema (`services` block + `{type:"service"}` rewrite destinations), which requires special dashboard setup and was fragile.
- Rewrote `vercel.json` to the standard, zero-dashboard-config approach: `installCommand: npm install`, `buildCommand: cd frontend && yarn install --frozen-lockfile && yarn build`, `outputDirectory: frontend/build`, `functions.api/index.js.maxDuration: 30`, and ordered rewrites (`/api/(.*) -> /api`, then `/(.*) -> /index.html` SPA fallback).
- Removed stray `mongodb` dependency from `frontend/package.json` (browser build should not include a DB driver).
- Added `engines.node: 20.x` to root `package.json`; standardized root on npm (package-lock.json, removed stray yarn.lock).
- Added `.vercelignore` to exclude the legacy Python backend, tests, reports, and non-Vercel artifacts from the deploy.
- Verified: frontend `yarn build` succeeds, `--frozen-lockfile` in sync, Node API (`api/index.js`) boots and serves `/api` routes.

## Homepage Customization Feature (2026-07)
- Replaced the "hello! welcome home" welcome block with a FULLSCREEN background video (/frontend/public/customize.mp4, served statically), a centered message, and a right-aligned transparent customization form.
- Form fields: Name, Email, Phone (inputs), Product Type/Size/Color/Material (dependent dropdowns sourced from the existing customizable_products admin table; size/color/material comma-split), plus optional "Your Design Idea" (multi-file upload -> Cloudinary resource_type auto) and "Additional Design Instructions" (textarea). All fields required except the two optional ones.
- New backend endpoints in api/index.js: GET /api/customizable-products (public), POST /api/customized-orders (public, multipart w/ upload.array design_files), GET /api/admin/customized-orders (admin), DELETE /api/admin/customized-orders/:id (admin). Stored in customized_orders collection.
- Admin: new "Customized Orders" tab lists all submissions (incl. instructions + clickable Cloudinary design-file links) with per-row delete.
- Verified: backend 20/20 + multipart upload; frontend 12/12 via testing agent.

## Order Confirmation Emails (2026-07)
- Added SMTP email via Nodemailer using the customer's Hostinger mailbox (smtp.hostinger.com:465, hello@sojaru.co.in).
- On a NORMAL order (POST /api/orders) and a CUSTOMIZATION order (POST /api/customized-orders), a confirmation email is sent TO the customer, FROM hello@sojaru.co.in, with hello@sojaru.co.in CC'd (so the store is notified).
- Emails are AWAITED before the HTTP response (required for Vercel serverless reliability), with connection/socket timeouts and error-swallowing so a mail failure never breaks an order.
- Env vars (in /app/.env locally; MUST also be added in Vercel dashboard): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
- Verified: SMTP verify OK, real test email accepted by Hostinger, customization-order endpoint triggers email (logged). Normal-order path shares the same verified sendMail helper (not live-tested to avoid creating real WooCommerce orders).

## Branded Email Templates (2026-07)
- Redesigned order + customization emails: table-based, inline-styled (email-client safe), with the Sojaru logo (hosted on Cloudinary: sojaru/brand/logo), brand palette (cream #FAF9F6, ink #1A1715, accent #E8DFD0, soft #F4EDE3, oat #F0E9DF), a dark footer wordmark, and a "Continue Shopping" / "Explore The Shop" button.
- Shop-again button links to SITE_URL env var (falls back to WC_STORE_URL). Set SITE_URL to the storefront domain on Vercel for the button to point to the live shop.
- Verified by sending real branded order + customization emails to hello@sojaru.co.in.

## Worlds Section — For You / For Your Pet (2026-07)
- Added a 2-part "Worlds" section on the homepage below the "Durga Pujor Collections" (Festive) card.
- Two cards: "For You" (routes to /shop/for-you) and "For Your Pet" (routes to /shop/for-your-pet), each with distinct imagery and a "Shop Now" button.
- FINALIZED and approved by user (2026-07). No further changes requested.

## UPI/Wallets Trust Line (2026-06)
- Added "Pay via UPI, cards & wallets" line under "Secured by Razorpay" in the checkout order summary (data-testid payment-methods-note).

## Delivery Fee Config + Admin Mobile Fix (2026-06)
- New admin tab "Delivery Fee" (DeliveryManager) with two configurable fields: "Free delivery above (₹)" (free-shipping threshold) and "Delivery fee (₹)" (charged below threshold). Saved to settings.delivery via PUT /api/admin/settings; exposed in GET /api/settings + publicSettings (defaults 1499/99).
- StoreContext now exposes `delivery` {free_above, fee}. CheckoutPage shipping calc and CartDrawer free-ship progress read from it instead of hardcoded 1499/99. Razorpay charge reflects the configured shipping via WooCommerce shipping_lines.
- Coupon codes intentionally NOT added — WooCommerce coupons remain the source (user decision).
- Fixed admin mobile bug: removed the helper description paragraphs in every manager (Hero, Moving Text, Festive, Hero Text, Category Images, Customizable Products, Customized Orders) that overlapped the wrapped tab row and blocked taps. Tabs are now cleanly accessible.
- Verified: backend GET/PUT delivery persists; admin Delivery Fee tab renders + prefills; frontend compiles clean.
- Replaced the WooCommerce hosted "order-pay" checkout with a native Razorpay Checkout popup on the checkout page.
- Flow: checkout form → POST /api/orders creates an UNPAID WooCommerce order + a Razorpay order (amount = WC total in paise, INR) → frontend opens Razorpay popup (checkout.js loaded dynamically) → on success POST /api/payments/verify does HMAC-SHA256 signature verification (order_id|payment_id with RAZORPAY_KEY_SECRET) → marks the WC order set_paid=true, status=processing, transaction_id=razorpay_payment_id → sends branded confirmation email → shows confirmation screen.
- Order confirmation email now fires AFTER successful payment (moved out of order creation), so only paid orders get the email.
- Backend: `razorpay` npm pkg, getRazorpay() lazy client, endpoints POST /api/orders (returns razorpay_order_id/key_id/amount) and POST /api/payments/verify. Frontend: orders.verifyPayment() in api.js, loadRazorpayScript() + rzp.open() in CheckoutPage.jsx. Removed the old WooCommerce "Complete Payment" fallback button.
- Env vars: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (in /app/.env locally; MUST also be added in Vercel dashboard for prod). Currently using LIVE keys (rzp_live_).
- Verified: Razorpay order creation works against live account (no charge); signature verify passes for valid sig and rejects invalid; WC order flips to paid/processing; confirmation email sent; checkout UI renders "Pay securely" / "Secured by Razorpay". NOTE: full popup-to-card payment NOT live-tested (live keys = real charge).
