// Load .env for local dev only. On Vercel, env vars come from the dashboard.
const envPath = require("path").join(__dirname, "..", ".env");
require("dotenv").config({ path: envPath, override: false });

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");

// ─── Config ──────────────────────────────────────────────────────────────────
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME;
const WC_BASE = `${(process.env.WC_STORE_URL || "").replace(/\/$/, "")}/wp-json/wc/v3`;
const WC_AUTH = { username: process.env.WC_CONSUMER_KEY, password: process.env.WC_CONSUMER_SECRET };
const WC_STORE_URL = (process.env.WC_STORE_URL || "").replace(/\/$/, "");
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "hello@sojaru.co.in").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ─── Email (SMTP via nodemailer) ──────────────────────────────────────────────
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

let _transporter = null;
function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // 465 = implicit SSL; 587 = STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return _transporter;
}

// ─── Razorpay ─────────────────────────────────────────────────────────────────
const Razorpay = require("razorpay");
const crypto = require("crypto");
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
let _razorpay = null;
function getRazorpay() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return null;
  if (!_razorpay) _razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
  return _razorpay;
}

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const money = (amt, cur) => `${!cur || cur === "INR" ? "₹" : cur + " "}${amt}`;

// Brand assets
const LOGO_URL = "https://res.cloudinary.com/gmek0njq/image/upload/v1789165310/sojaru/brand/logo.png";
const SITE_URL = (process.env.SITE_URL || WC_STORE_URL || "").replace(/\/$/, "");
const BRAND = { cream: "#FAF9F6", ink: "#1A1715", accent: "#E8DFD0", soft: "#F4EDE3", oat: "#F0E9DF" };

function shopButton(label) {
  if (!SITE_URL) return "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 4px;"><tr><td style="border-radius:0;background:${BRAND.ink};">
    <a href="${SITE_URL}" style="display:inline-block;padding:15px 40px;color:${BRAND.cream};text-decoration:none;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">${esc(label || "Continue Shopping")}</a>
  </td></tr></table>`;
}

// Branded, email-client-friendly (table-based, inline styles) shell
function emailShell(inner, buttonLabel) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:${BRAND.oat};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.oat};padding:28px 12px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${BRAND.cream};border:1px solid ${BRAND.accent};">
          <tr><td align="center" style="background:${BRAND.soft};padding:26px 24px;border-bottom:1px solid ${BRAND.accent};">
            <img src="${LOGO_URL}" alt="Sojaru" height="42" style="height:42px;width:auto;display:block;border:0;" />
          </td></tr>
          <tr><td style="padding:34px 36px;font-family:Arial,Helvetica,sans-serif;color:${BRAND.ink};">
            ${inner}
            <div align="center">${shopButton(buttonLabel)}</div>
          </td></tr>
          <tr><td style="background:${BRAND.ink};padding:22px 36px;font-family:Arial,Helvetica,sans-serif;">
            <p style="margin:0 0 4px;color:${BRAND.cream};font-size:14px;font-weight:bold;letter-spacing:3px;">SOJARU</p>
            <p style="margin:0;color:#b9b2aa;font-size:11px;line-height:1.6;">A little imperfect, a little expressive, full of heart.<br/>This email was sent from hello@sojaru.co.in — just reply if you need anything. 🐾</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

// Temporary password email (forgot-password flow)
function tempPasswordEmailHtml({ name, tempPassword }) {
  return emailShell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:bold;color:${BRAND.ink};">Your temporary password${name ? ", " + esc(name) : ""} 🔑</h1>
    <p style="margin:0 0 22px;color:#6b6560;font-size:14px;line-height:1.6;">We received a request to reset your Sojaru password. Use the temporary password below to sign in, then change it from your account for security.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr><td align="center" style="padding:18px;background:${BRAND.soft};border:1px dashed ${BRAND.accent};">
        <span style="font-family:'Courier New',monospace;font-size:22px;font-weight:bold;letter-spacing:2px;color:${BRAND.ink};">${esc(tempPassword)}</span>
      </td></tr>
    </table>
    <p style="margin:18px 0 0;color:#6b6560;font-size:13px;line-height:1.6;">If you didn't request this, you can safely ignore this email — but consider changing your password if you're concerned.</p>
  `, "Sign In");
}

// Contact form message → forwarded to the store owner (reply-to = the visitor)
function contactEmailHtml({ name, email, message }) {
  const line = (label, val) => `<tr>
      <td style="padding:9px 4px;border-bottom:1px solid ${BRAND.accent};font-size:12px;color:#8a837c;text-transform:uppercase;letter-spacing:1px;width:110px;vertical-align:top;">${label}</td>
      <td style="padding:9px 4px;border-bottom:1px solid ${BRAND.accent};font-size:14px;color:${BRAND.ink};">${esc(val)}</td>
    </tr>`;
  return emailShell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:bold;color:${BRAND.ink};">New message from ${esc(name)} 💌</h1>
    <p style="margin:0 0 22px;color:#6b6560;font-size:14px;line-height:1.6;">Someone reached out via the Contact Us page on sojaru.co.in. Hit reply to respond to them directly.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${line("Name", name)}
      ${line("Email", email)}
      ${line("Message", message)}
    </table>
  `, "Visit Store");
}

function adminOrderEmailHtml({ order, paymentId }) {
  const b = order.billing || {};
  const s = order.shipping || {};
  const addr = (x) => [x.address_1, x.address_2, x.city, x.state, x.postcode, x.country].filter(Boolean).join(", ");
  const rows = (order.line_items || []).map((li) => `<tr>
      <td style="padding:9px 4px;border-bottom:1px solid ${BRAND.accent};font-size:14px;color:${BRAND.ink};">${esc(li.name)} <span style="color:#999;">&times; ${esc(li.quantity)}</span></td>
      <td style="padding:9px 4px;border-bottom:1px solid ${BRAND.accent};font-size:14px;color:${BRAND.ink};text-align:right;white-space:nowrap;">${money(li.total, order.currency)}</td>
    </tr>`).join("");
  const line = (label, val) => val ? `<tr>
      <td style="padding:9px 4px;border-bottom:1px solid ${BRAND.accent};font-size:12px;color:#8a837c;text-transform:uppercase;letter-spacing:1px;width:130px;vertical-align:top;">${label}</td>
      <td style="padding:9px 4px;border-bottom:1px solid ${BRAND.accent};font-size:14px;color:${BRAND.ink};">${esc(val)}</td>
    </tr>` : "";
  return emailShell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:bold;color:${BRAND.ink};">New paid order received 🎉</h1>
    <p style="margin:0 0 22px;color:#6b6560;font-size:14px;line-height:1.6;">Order <strong style="color:${BRAND.ink};">#${esc(order.id)}</strong> has been paid via Razorpay and is now <strong style="color:${BRAND.ink};text-transform:capitalize;">${esc(order.status || "processing")}</strong>.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}
      <tr>
        <td style="padding:14px 4px 0;font-size:15px;font-weight:bold;color:${BRAND.ink};">Total</td>
        <td style="padding:14px 4px 0;font-size:15px;font-weight:bold;color:${BRAND.ink};text-align:right;">${money(order.total, order.currency)}</td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:22px;">
      ${line("Customer", [b.first_name, b.last_name].filter(Boolean).join(" "))}
      ${line("Email", b.email)}
      ${line("Phone", b.phone)}
      ${line("Ship To", addr(s))}
      ${line("Payment ID", paymentId)}
      ${line("Note", order.customer_note)}
    </table>
  `, "View Store");
}

function orderEmailHtml({ name, orderId, total, currency, items, status }) {
  const rows = (items || []).map((li) => `<tr>
      <td style="padding:10px 4px;border-bottom:1px solid ${BRAND.accent};font-size:14px;color:${BRAND.ink};">${esc(li.name)} <span style="color:#999;">&times; ${esc(li.quantity)}</span></td>
      <td style="padding:10px 4px;border-bottom:1px solid ${BRAND.accent};font-size:14px;color:${BRAND.ink};text-align:right;white-space:nowrap;">${money(li.total, currency)}</td>
    </tr>`).join("");
  return emailShell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:bold;color:${BRAND.ink};">Thank you for your order${name ? ", " + esc(name) : ""}! 🐾</h1>
    <p style="margin:0 0 22px;color:#6b6560;font-size:14px;line-height:1.6;">We've received order <strong style="color:${BRAND.ink};">#${esc(orderId)}</strong> and it's now being processed. Here's a summary:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}
      <tr>
        <td style="padding:14px 4px 0;font-size:15px;font-weight:bold;color:${BRAND.ink};">Total</td>
        <td style="padding:14px 4px 0;font-size:15px;font-weight:bold;color:${BRAND.ink};text-align:right;">${money(total, currency)}</td>
      </tr>
    </table>
    <p style="margin:18px 0 0;color:#6b6560;font-size:13px;">Order status: <strong style="color:${BRAND.ink};text-transform:capitalize;">${esc(status || "processing")}</strong></p>
  `, "Continue Shopping");
}

function customizationEmailHtml({ name, product_type, size, color, material, additional_instructions, fileCount }) {
  const line = (label, val) => val ? `<tr>
      <td style="padding:9px 4px;border-bottom:1px solid ${BRAND.accent};font-size:12px;color:#8a837c;text-transform:uppercase;letter-spacing:1px;width:150px;vertical-align:top;">${label}</td>
      <td style="padding:9px 4px;border-bottom:1px solid ${BRAND.accent};font-size:14px;color:${BRAND.ink};">${esc(val)}</td>
    </tr>` : "";
  return emailShell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:bold;color:${BRAND.ink};">We got your customization request${name ? ", " + esc(name) : ""}! 🐾</h1>
    <p style="margin:0 0 22px;color:#6b6560;font-size:14px;line-height:1.6;">Our team will review the details below and reach out to you shortly.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${line("Product Type", product_type)}
      ${line("Size", size)}
      ${line("Color", color)}
      ${line("Material", material)}
      ${line("Instructions", additional_instructions)}
      ${fileCount ? line("Attachments", fileCount + " file(s) received") : ""}
    </table>
  `, "Explore The Shop");
}

// Awaitable + never-throws. Must be awaited before sending the HTTP response so it
// reliably runs on Vercel serverless (functions can freeze right after the response).
// By default CCs the owner (SMTP_FROM); pass cc: null to skip the CC.
// replyTo defaults to the owner; pass the sender's address so the owner can reply directly.
function sendMail({ to, subject, html, cc, replyTo }) {
  const t = getTransporter();
  if (!t || !to) { if (!t) console.warn("SMTP not configured; skipping email to", to); return Promise.resolve(); }
  const msg = { from: `Sojaru <${SMTP_FROM}>`, to, replyTo: replyTo || SMTP_FROM, subject, html };
  if (cc !== null) msg.cc = cc || SMTP_FROM;
  return t.sendMail(msg)
    .then((info) => console.log("Email sent:", info.messageId, "->", to))
    .catch((err) => console.error("Email send failed:", err.message));
}

// ─── MongoDB (cached for serverless cold starts) ──────────────────────────────
let _db = null;
async function getDb() {
  if (_db) return _db;
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  _db = client.db(DB_NAME);
  await _seedAdmin(_db);
  return _db;
}

// ─── Express ─────────────────────────────────────────────────────────────────
const app = express();
const corsOrigins = process.env.CORS_ORIGINS || "*";
app.use(cors({
  origin: corsOrigins === "*" ? "*" : corsOrigins.split(","),
  credentials: true,
}));
// Razorpay webhook needs the RAW body for signature verification — must be
// registered before express.json() (body-parser skips already-parsed requests).
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

// Multer v2 — no storage engine; file data read from stream
const upload = multer({ limits: { fileSize: 8 * 1024 * 1024 } });

// Read file buffer from multer v2 stream (or v1 buffer fallback)
function fileBuffer(file) {
  if (file.buffer) return Promise.resolve(file.buffer);
  return new Promise((resolve, reject) => {
    const chunks = [];
    file.stream.on("data", (c) => chunks.push(c));
    file.stream.on("end", () => resolve(Buffer.concat(chunks)));
    file.stream.on("error", reject);
  });
}

// ─── In-memory TTL cache ──────────────────────────────────────────────────────
const _cache = {};
const cacheGet = (k) => { const h = _cache[k]; return h && h.exp > Date.now() ? h.val : null; };
const cacheSet = (k, v, ttl = 120) => { _cache[k] = { val: v, exp: Date.now() + ttl * 1000 }; };

// ─── WooCommerce helper ───────────────────────────────────────────────────────
async function wc(method, path, params, data) {
  try {
    return await axios({ method, url: `${WC_BASE}/${path.replace(/^\//, "")}`, params, data, auth: WC_AUTH, timeout: 30000 });
  } catch (err) {
    if (err.response) { const e = new Error("Store request failed."); e.status = err.response.status >= 500 ? 502 : err.response.status; throw e; }
    const e = new Error("Unable to reach store. Please try again."); e.status = 502; throw e;
  }
}

// ─── Product serializer ───────────────────────────────────────────────────────
const serializeProduct = (p) => ({
  id: p.id, name: p.name, slug: p.slug, type: p.type, permalink: p.permalink, sku: p.sku,
  price: p.price, regular_price: p.regular_price, sale_price: p.sale_price, on_sale: p.on_sale,
  price_html: p.price_html, featured: p.featured, description: p.description,
  short_description: p.short_description, stock_status: p.stock_status,
  stock_quantity: p.stock_quantity, total_sales: p.total_sales, average_rating: p.average_rating,
  rating_count: p.rating_count, date_created: p.date_created,
  images: (p.images || []).map((i) => ({ id: i.id, src: i.src, alt: i.alt || p.name })),
  categories: (p.categories || []).map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
  tags: (p.tags || []).map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
  attributes: (p.attributes || []).map((a) => ({ id: a.id, name: a.name, variation: a.variation, options: a.options })),
  variations: p.variations || [], related_ids: p.related_ids || [],
});

// ─── Auth helpers ─────────────────────────────────────────────────────────────
const hashPw = (pw) => bcrypt.hash(pw, 12);
const checkPw = (pw, hash) => bcrypt.compare(pw, hash);
const makeToken = (id, email) => jwt.sign({ sub: id, email, type: "access" }, JWT_SECRET, { expiresIn: "7d" });

async function getCurrentUser(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) { const e = new Error("Not authenticated"); e.status = 401; throw e; }
  let payload;
  try { payload = jwt.verify(token, JWT_SECRET); }
  catch (e) {
    const err = new Error(e.name === "TokenExpiredError" ? "Session expired. Please log in again." : "Invalid session");
    err.status = 401; throw err;
  }
  const db = await getDb();
  const user = await db.collection("users").findOne(
    { _id: new ObjectId(payload.sub) },
    { projection: { email: 1, first_name: 1, last_name: 1, wc_customer_id: 1, is_admin: 1 } }
  );
  if (!user) { const e = new Error("User not found"); e.status = 401; throw e; }
  return { id: user._id.toString(), email: user.email, first_name: user.first_name || "", last_name: user.last_name || "", wc_customer_id: user.wc_customer_id, is_admin: !!user.is_admin };
}

async function requireAdmin(req) {
  const user = await getCurrentUser(req);
  if (!user.is_admin) { const e = new Error("Admin access required"); e.status = 403; throw e; }
  return user;
}

// ─── Settings helpers ─────────────────────────────────────────────────────────
const DEFAULT_MARQUEE = ["Free shipping over ₹1,499", "Curated for you & your best friend", "New season, new arrivals", "Handmade pet tags, engraved with love", "Made in India, with love"];
const DEFAULT_HERO = { subtitle: "Boldly designed everyday goods — for the humans who love hard and the pets who love harder. Made in India, for both of you.", primary_label: "Shop Now", primary_link: "/shop/for-you", secondary_label: "Shop For Your Pet", secondary_link: "/shop/for-your-pet" };
const FESTIVE_SLUG = "festive-collections";
const FESTIVE_FALLBACK_ID = 33;
const DEFAULT_DELIVERY = { free_above: 1499, fee: 99 };

async function getSettings() {
  const db = await getDb();
  let doc = await db.collection("settings").findOne({ _id: "site" });
  if (!doc) {
    doc = { _id: "site", hero_images: [], marquee_texts: DEFAULT_MARQUEE, festive: { title: "Festive Collection", category_id: 33, enabled: true } };
    await db.collection("settings").insertOne(doc);
  }
  return doc;
}

function publicSettings(doc) {
  const festive = doc.festive || {};
  const heroImages = (doc.hero_images || []).filter((h) => h.url).map((h) => ({ id: h.id, url: h.url, alt: h.alt || "Sojaru" }));
  const catImages = {};
  for (const [slug, v] of Object.entries(doc.category_images || {})) { if (v.url) catImages[slug] = v.url; }
  return {
    hero_images: heroImages,
    hero: { ...DEFAULT_HERO, ...(doc.hero || {}) },
    marquee_texts: doc.marquee_texts || DEFAULT_MARQUEE,
    festive: { title: festive.title || "Festive Collection", category_id: festive.category_id || FESTIVE_FALLBACK_ID, category_slug: FESTIVE_SLUG, enabled: festive.enabled !== false },
    category_images: catImages,
    delivery: {
      free_above: Number(doc.delivery?.free_above ?? DEFAULT_DELIVERY.free_above),
      fee: Number(doc.delivery?.fee ?? DEFAULT_DELIVERY.fee),
    },
  };
}

// ─── Cloudinary helpers ───────────────────────────────────────────────────────
function cloudinaryUpload(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: "image", overwrite: true, invalidate: true },
      (err, result) => err ? reject(err) : resolve({ url: result.secure_url, public_id: result.public_id })
    );
    stream.end(buffer);
  });
}
const cloudinaryDelete = (publicId) => cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });

// Upload arbitrary documents/images (auto-detect type) for customization design files
function cloudinaryUploadAuto(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: "auto", overwrite: true, invalidate: true },
      (err, result) => err ? reject(err) : resolve({ url: result.secure_url, public_id: result.public_id })
    );
    stream.end(buffer);
  });
}

// ─── Admin seed ───────────────────────────────────────────────────────────────
async function _seedAdmin(db) {
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  const existing = await db.collection("users").findOne({ email: ADMIN_EMAIL }, { projection: { password_hash: 1, is_admin: 1 } });
  if (!existing) {
    await db.collection("users").insertOne({ email: ADMIN_EMAIL, password_hash: await hashPw(ADMIN_PASSWORD), first_name: "Sojaru", last_name: "Admin", is_admin: true, wc_customer_id: null, created_at: new Date().toISOString() });
  } else {
    const upd = { is_admin: true };
    if (!(await checkPw(ADMIN_PASSWORD, existing.password_hash))) upd.password_hash = await hashPw(ADMIN_PASSWORD);
    await db.collection("users").updateOne({ email: ADMIN_EMAIL }, { $set: upd });
  }
}

// ─── Error-handling wrapper ───────────────────────────────────────────────────
const wrap = (fn) => async (req, res) => {
  try { await fn(req, res); }
  catch (err) { res.status(err.status || 500).json({ detail: err.message || "Internal server error" }); }
};

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get("/api", (req, res) => res.json({ brand: "Sojaru", status: "ok" }));

// Store config
app.get("/api/store/config", wrap(async (req, res) => {
  const cached = cacheGet("store_config");
  if (cached) return res.json(cached);
  try {
    const r = await wc("GET", "data/currencies/current");
    const data = { currency_code: r.data.code || "USD", currency_symbol: r.data.symbol || "$" };
    cacheSet("store_config", data, 3600); return res.json(data);
  } catch { return res.json({ currency_code: "USD", currency_symbol: "$" }); }
}));

// Categories
app.get("/api/categories", wrap(async (req, res) => {
  res.set("Cache-Control", "no-store"); // never let browsers/CDNs serve stale category data
  const cached = cacheGet("categories");
  if (cached) return res.json(cached);
  const r = await wc("GET", "products/categories", { per_page: 100, orderby: "name", hide_empty: false });
  const cats = r.data.filter((c) => c.slug !== "uncategorized").map((c) => ({ id: c.id, name: c.name, slug: c.slug, parent: c.parent, count: c.count || 0, description: c.description || "", image: c.image?.src || null }));
  // Short 60s TTL: category renames/additions in wp-admin propagate within a minute
  cacheSet("categories", cats, 60); res.json(cats);
}));

// Products list
app.get("/api/products", wrap(async (req, res) => {
  const { page = 1, per_page = 12, category, on_sale, featured, search, tag, orderby = "date", order = "desc", min_price, max_price, stock_status, attribute, attribute_term } = req.query;
  const params = { page, per_page, orderby, order, status: "publish" };
  if (category) params.category = category;
  if (on_sale !== undefined) params.on_sale = on_sale;
  if (featured !== undefined) params.featured = featured;
  if (search) params.search = search;
  if (tag) params.tag = tag;
  if (min_price) params.min_price = min_price;
  if (max_price) params.max_price = max_price;
  if (stock_status) params.stock_status = stock_status;
  if (attribute) params.attribute = attribute;
  if (attribute_term) params.attribute_term = attribute_term;
  const ck = "products:" + JSON.stringify(params);
  const cached = cacheGet(ck);
  if (cached) return res.json(cached);
  const r = await wc("GET", "products", params);
  const result = { items: r.data.map(serializeProduct), total: parseInt(r.headers["x-wp-total"] || 0), pages: parseInt(r.headers["x-wp-totalpages"] || 1), page: parseInt(page) };
  cacheSet(ck, result, 90); res.json(result);
}));

// Product by slug — MUST be before /:id
app.get("/api/products/slug/:slug", wrap(async (req, res) => {
  const r = await wc("GET", "products", { slug: req.params.slug, status: "publish" });
  if (!r.data.length) { const e = new Error("Product not found"); e.status = 404; throw e; }
  res.json(serializeProduct(r.data[0]));
}));

// Product by ID
app.get("/api/products/:id", wrap(async (req, res) => {
  const r = await wc("GET", `products/${req.params.id}`); res.json(serializeProduct(r.data));
}));

// Variations
app.get("/api/products/:id/variations", wrap(async (req, res) => {
  const ck = `variations:${req.params.id}`;
  const cached = cacheGet(ck); if (cached) return res.json(cached);
  const r = await wc("GET", `products/${req.params.id}/variations`, { per_page: 100 });
  const data = r.data.map((v) => ({ id: v.id, sku: v.sku, price: v.price, regular_price: v.regular_price, sale_price: v.sale_price, on_sale: v.on_sale, stock_status: v.stock_status, stock_quantity: v.stock_quantity, image: v.image?.src || null, attributes: v.attributes || [] }));
  cacheSet(ck, data, 90); res.json(data);
}));

// Related products
app.get("/api/related/:id", wrap(async (req, res) => {
  const r = await wc("GET", `products/${req.params.id}`);
  const ids = (r.data.related_ids || []).slice(0, 8);
  if (!ids.length) {
    const cats = (r.data.categories || []).map((c) => c.id);
    if (cats.length) { const rr = await wc("GET", "products", { category: cats[0], per_page: 8, exclude: req.params.id }); return res.json(rr.data.map(serializeProduct)); }
    return res.json([]);
  }
  const rr = await wc("GET", "products", { include: ids.join(","), per_page: 8 }); res.json(rr.data.map(serializeProduct));
}));

// Coupon validate
app.get("/api/coupons/validate", wrap(async (req, res) => {
  const r = await wc("GET", "coupons", { code: req.query.code, per_page: 1 });
  if (!r.data.length) { const e = new Error("Invalid coupon code"); e.status = 404; throw e; }
  const c = r.data[0]; res.json({ code: c.code, discount_type: c.discount_type, amount: c.amount, description: c.description || "" });
}));

// Create order (creates unpaid WooCommerce order + a Razorpay order to collect payment)
app.post("/api/orders", wrap(async (req, res) => {
  let user = null; try { user = await getCurrentUser(req); } catch {}
  const b = req.body;
  const payload = { payment_method: "razorpay", payment_method_title: "Razorpay", set_paid: false, billing: b.billing, shipping: b.shipping || b.billing, line_items: b.line_items, coupon_lines: b.coupon_lines || [], shipping_lines: b.shipping_lines || [], customer_note: b.customer_note || "" };
  if (user?.wc_customer_id) payload.customer_id = user.wc_customer_id;
  const r = await wc("POST", "orders", null, payload);
  const o = r.data;

  // Create a Razorpay order for the WooCommerce order total (authoritative amount).
  // If Razorpay order creation fails, still return the (unpaid) WC order so the
  // frontend can show a clear "payment gateway unavailable" state instead of a
  // generic order failure — the WC order already exists at this point.
  const rzp = getRazorpay();
  let razorpay_order_id = null, razorpay_amount = null;
  if (rzp) {
    try {
      const amountPaise = Math.round(Number(o.total) * 100);
      const rzpOrder = await rzp.orders.create({
        amount: amountPaise,
        currency: o.currency || "INR",
        receipt: `wc_${o.id}`,
        notes: { wc_order_id: String(o.id), customer_email: (b.billing && b.billing.email) || "" },
      });
      razorpay_order_id = rzpOrder.id;
      razorpay_amount = rzpOrder.amount;
    } catch (rzpErr) {
      console.error("Razorpay order creation failed for WC order", o.id, ":", rzpErr.message);
    }
  } else {
    console.error("Razorpay not configured — WC order", o.id, "created without a payment order");
  }

  res.json({
    id: o.id, status: o.status, total: o.total, currency: o.currency, order_key: o.order_key,
    line_items: o.line_items || [],
    razorpay_order_id, razorpay_key_id: RAZORPAY_KEY_ID || null, razorpay_amount,
  });
}));

// ─── Payment confirmation (shared by checkout verify + Razorpay webhook) ─────
// Sends BOTH the customer confirmation and the owner notification email.
async function sendOrderEmails(o, paymentId) {
  // Customer confirmation
  const billingEmail = o.billing && o.billing.email ? String(o.billing.email).trim() : "";
  const billingName = o.billing ? [o.billing.first_name, o.billing.last_name].filter(Boolean).join(" ") : "";
  if (billingEmail) {
    await sendMail({
      to: billingEmail,
      cc: null, // owner gets a dedicated notification below (no CC needed here)
      subject: `Your Sojaru order #${o.id} is confirmed 🐾`,
      html: orderEmailHtml({ name: billingName, orderId: o.id, total: o.total, currency: o.currency, items: o.line_items, status: o.status }),
    });
  }
  // Owner/admin notification — independent of the customer email
  const ownerEmail = (process.env.ADMIN_EMAIL || SMTP_FROM || "").trim();
  if (ownerEmail) {
    await sendMail({
      to: ownerEmail,
      cc: null,
      subject: `New paid order #${o.id} — ${money(o.total, o.currency)}`,
      html: adminOrderEmailHtml({ order: o, paymentId }),
    });
  }
}

// Idempotently mark a WC order paid and send notification emails exactly once.
// A `paid_orders` marker doc (keyed by wc order id) dedupes the checkout verify
// call and the Razorpay webhook so the customer/owner never get duplicate emails.
async function confirmPaidOrder({ wcOrderId, paymentId, source }) {
  const db = await getDb();
  let already = false;
  try {
    await db.collection("paid_orders").insertOne({
      _id: `wc_${wcOrderId}`, wc_order_id: String(wcOrderId),
      payment_id: paymentId || "", source: source || "unknown",
      confirmed_at: new Date().toISOString(),
    });
  } catch (e) {
    if (e && e.code === 11000) already = true; else throw e;
  }
  // PUT is idempotent — always run it (self-heals if a previous attempt died mid-way)
  const upd = await wc("PUT", `orders/${wcOrderId}`, null, {
    set_paid: true, status: "processing", transaction_id: paymentId || "",
  });
  const o = upd.data;
  if (!already) await sendOrderEmails(o, paymentId);
  return { order: o, already };
}

// Verify a Razorpay payment and mark the WooCommerce order as paid
app.post("/api/payments/verify", wrap(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, wc_order_id } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !wc_order_id) {
    const e = new Error("Missing payment verification fields"); e.status = 400; throw e;
  }
  if (!RAZORPAY_KEY_SECRET) { const e = new Error("Payment gateway not configured"); e.status = 500; throw e; }

  const expected = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
  if (expected !== razorpay_signature) {
    const e = new Error("Payment verification failed"); e.status = 400; throw e;
  }

  const { order: o } = await confirmPaidOrder({ wcOrderId: wc_order_id, paymentId: razorpay_payment_id, source: "checkout" });
  res.json({ id: o.id, status: o.status, total: o.total, currency: o.currency, paid: true });
}));

// Razorpay webhook — safety net that confirms payment even if the customer's
// browser closes (or network drops) before the frontend calls /api/payments/verify.
// Setup: Razorpay Dashboard → Webhooks → URL: https://<backend>/api/payments/webhook,
// event: payment.captured, and put the webhook secret in RAZORPAY_WEBHOOK_SECRET.
app.post("/api/payments/webhook", wrap(async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) { const e = new Error("Webhook not configured"); e.status = 500; throw e; }
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
  const signature = String(req.headers["x-razorpay-signature"] || "");
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected), bBuf = Buffer.from(signature);
  if (a.length !== bBuf.length || !crypto.timingSafeEqual(a, bBuf)) {
    const e = new Error("Invalid webhook signature"); e.status = 400; throw e;
  }

  const event = JSON.parse(rawBody.toString("utf8"));
  if (event.event !== "payment.captured") return res.json({ ok: true, ignored: event.event || "unknown" });

  const payment = event.payload && event.payload.payment && event.payload.payment.entity;
  if (!payment) return res.json({ ok: true, ignored: "no-payment-entity" });

  // The WC order id lives on the Razorpay ORDER notes (set at order creation)
  let wcOrderId = payment.notes && payment.notes.wc_order_id;
  const rzp = getRazorpay();
  if (!wcOrderId && rzp && payment.order_id) {
    const rzpOrder = await rzp.orders.fetch(payment.order_id);
    wcOrderId = rzpOrder.notes && rzpOrder.notes.wc_order_id;
  }
  if (!wcOrderId) return res.json({ ok: true, ignored: "no-wc-order-id" });

  const { order: o, already } = await confirmPaidOrder({ wcOrderId, paymentId: payment.id, source: "webhook" });
  res.json({ ok: true, wc_order_id: o.id, status: o.status, already_confirmed: already });
}));

// Get order
app.get("/api/orders/:id", wrap(async (req, res) => {
  const r = await wc("GET", `orders/${req.params.id}`); res.json(r.data);
}));

// Register
app.post("/api/auth/register", wrap(async (req, res) => {
  const { email, password, first_name = "", last_name = "" } = req.body;
  if (!email || !password || password.length < 6) { const e = new Error("Email and password (min 6 chars) required"); e.status = 400; throw e; }
  const db = await getDb();
  if (await db.collection("users").findOne({ email: email.toLowerCase() }, { projection: { _id: 1 } })) { const e = new Error("An account with this email already exists"); e.status = 400; throw e; }
  let wc_customer_id = null;
  try { const r = await wc("POST", "customers", null, { email: email.toLowerCase(), first_name, last_name }); wc_customer_id = r.data.id; } catch {}
  const result = await db.collection("users").insertOne({ email: email.toLowerCase(), password_hash: await hashPw(password), first_name, last_name, wc_customer_id, created_at: new Date().toISOString() });
  const uid = result.insertedId.toString();
  res.json({ token: makeToken(uid, email.toLowerCase()), user: { id: uid, email: email.toLowerCase(), first_name, last_name, wc_customer_id, is_admin: false } });
}));

// Login
app.post("/api/auth/login", wrap(async (req, res) => {
  const { email, password } = req.body;
  const db = await getDb();
  const user = await db.collection("users").findOne({ email: email.toLowerCase() }, { projection: { _id: 1, email: 1, password_hash: 1, first_name: 1, last_name: 1, wc_customer_id: 1, is_admin: 1 } });
  if (!user || !(await checkPw(password, user.password_hash))) { const e = new Error("Invalid email or password"); e.status = 401; throw e; }
  const uid = user._id.toString();
  res.json({ token: makeToken(uid, user.email), user: { id: uid, email: user.email, first_name: user.first_name || "", last_name: user.last_name || "", wc_customer_id: user.wc_customer_id, is_admin: !!user.is_admin } });
}));

// Me
app.get("/api/auth/me", wrap(async (req, res) => { res.json(await getCurrentUser(req)); }));

// Change password (authenticated)
app.post("/api/auth/change-password", wrap(async (req, res) => {
  const user = await getCurrentUser(req);
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) { const e = new Error("Current and new password are required"); e.status = 400; throw e; }
  if (String(new_password).length < 6) { const e = new Error("New password must be at least 6 characters"); e.status = 400; throw e; }
  const db = await getDb();
  const row = await db.collection("users").findOne({ _id: new ObjectId(user.id) }, { projection: { password_hash: 1 } });
  if (!row || !(await checkPw(current_password, row.password_hash))) { const e = new Error("Your current password is incorrect"); e.status = 400; throw e; }
  await db.collection("users").updateOne({ _id: new ObjectId(user.id) }, { $set: { password_hash: await hashPw(new_password) } });
  res.json({ ok: true });
}));

// Forgot password (public) — emails a temporary password if the account exists.
// Always returns the same generic message so email addresses can't be probed.
app.post("/api/auth/forgot-password", wrap(async (req, res) => {
  const email = String((req.body && req.body.email) || "").trim().toLowerCase();
  const generic = { ok: true, message: "If an account with that email exists, a temporary password has been sent to it." };
  if (!email) { const e = new Error("Email is required"); e.status = 400; throw e; }
  const db = await getDb();
  const user = await db.collection("users").findOne({ email }, { projection: { _id: 1, first_name: 1 } });
  if (!user) return res.json(generic); // don't reveal non-existence

  // Generate a readable temporary password and set it as the account password
  const tempPassword = `Sojaru-${crypto.randomBytes(4).toString("hex")}`;
  await db.collection("users").updateOne({ _id: user._id }, { $set: { password_hash: await hashPw(tempPassword) } });

  await sendMail({
    to: email,
    cc: null,
    subject: "Your Sojaru temporary password 🔑",
    html: tempPasswordEmailHtml({ name: user.first_name || "", tempPassword }),
  });
  res.json(generic);
}));

// Contact form (public) — forwards the visitor's message to the store owner.
// From: hello@sojaru.co.in, To: hello@sojaru.co.in, Reply-To: the visitor's email.
app.post("/api/contact", wrap(async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !String(name).trim() || !email || !String(email).trim() || !message || !String(message).trim()) {
    const e = new Error("Name, email and message are required"); e.status = 400; throw e;
  }
  if (!/.+@.+\..+/.test(String(email).trim())) { const e = new Error("Please enter a valid email address"); e.status = 400; throw e; }
  if (!SMTP_FROM) { const e = new Error("Contact form is not configured"); e.status = 500; throw e; }
  await sendMail({
    to: SMTP_FROM,
    cc: null, // already going to the owner — no CC needed
    replyTo: String(email).trim(),
    subject: `New contact message from ${String(name).trim()} — Sojaru`,
    html: contactEmailHtml({ name: String(name).trim(), email: String(email).trim(), message: String(message).trim() }),
  });
  res.json({ ok: true });
}));

// Update profile
app.put("/api/account/profile", wrap(async (req, res) => {
  const user = await getCurrentUser(req);
  const db = await getDb();
  const { first_name, last_name, billing, shipping } = req.body;
  const upd = {};
  if (first_name !== undefined) upd.first_name = first_name;
  if (last_name !== undefined) upd.last_name = last_name;
  if (billing !== undefined) upd.billing = billing;
  if (shipping !== undefined) upd.shipping = shipping;
  if (Object.keys(upd).length) await db.collection("users").updateOne({ _id: new ObjectId(user.id) }, { $set: upd });
  if (user.wc_customer_id) {
    const wcP = {}; if (first_name !== undefined) wcP.first_name = first_name; if (last_name !== undefined) wcP.last_name = last_name; if (billing) wcP.billing = billing; if (shipping) wcP.shipping = shipping;
    if (Object.keys(wcP).length) try { await wc("PUT", `customers/${user.wc_customer_id}`, null, wcP); } catch {}
  }
  const updated = await db.collection("users").findOne({ _id: new ObjectId(user.id) }, { projection: { password_hash: 0 } });
  res.json({ ...updated, id: updated._id.toString(), _id: undefined });
}));

// Account orders
app.get("/api/account/orders", wrap(async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user.wc_customer_id) return res.json([]);
  const r = await wc("GET", "orders", { customer: user.wc_customer_id, per_page: 50, orderby: "date" });
  res.json(r.data.map((o) => ({ id: o.id, number: o.number, status: o.status, total: o.total, currency: o.currency, date_created: o.date_created, line_items: (o.line_items || []).map((li) => ({ name: li.name, quantity: li.quantity, total: li.total, image: li.image?.src || null })) })));
}));

// Public settings
app.get("/api/settings", wrap(async (req, res) => {
  const doc = await getSettings();
  const data = publicSettings(doc);
  try { const r = await wc("GET", "products/categories", { slug: FESTIVE_SLUG }); if (r.data.length) data.festive.category_id = r.data[0].id; } catch {}
  res.json(data);
}));

// Admin: update settings
app.put("/api/admin/settings", wrap(async (req, res) => {
  await requireAdmin(req);
  const { marquee_texts, festive, hero, delivery } = req.body;
  const db = await getDb(); const upd = {};
  if (marquee_texts) upd.marquee_texts = marquee_texts.filter((t) => t?.trim()).map((t) => t.trim());
  if (hero) { const pick = (k, fb) => typeof hero[k] === "string" && hero[k].trim() ? hero[k].trim() : fb; upd.hero = { subtitle: pick("subtitle", DEFAULT_HERO.subtitle), primary_label: pick("primary_label", DEFAULT_HERO.primary_label), primary_link: pick("primary_link", DEFAULT_HERO.primary_link), secondary_label: pick("secondary_label", DEFAULT_HERO.secondary_label), secondary_link: pick("secondary_link", DEFAULT_HERO.secondary_link) }; }
  if (festive) {
    let catId = FESTIVE_FALLBACK_ID;
    try { const r = await wc("GET", "products/categories", { slug: FESTIVE_SLUG }); if (r.data.length) catId = r.data[0].id; } catch {}
    upd.festive = { title: (festive.title || "Festive Collection").trim(), category_id: catId, enabled: !!festive.enabled };
  }
  if (delivery) {
    const freeAbove = Number(delivery.free_above);
    const fee = Number(delivery.fee);
    upd.delivery = {
      free_above: Number.isFinite(freeAbove) && freeAbove >= 0 ? freeAbove : DEFAULT_DELIVERY.free_above,
      fee: Number.isFinite(fee) && fee >= 0 ? fee : DEFAULT_DELIVERY.fee,
    };
  }
  if (Object.keys(upd).length) await db.collection("settings").updateOne({ _id: "site" }, { $set: upd }, { upsert: true });
  res.json(publicSettings(await getSettings()));
}));

// Admin: upload hero image
app.post("/api/admin/hero-images", upload.single("file"), wrap(async (req, res) => {
  await requireAdmin(req);
  const doc = await getSettings();
  if ((doc.hero_images || []).length >= 5) { const e = new Error("Maximum 5 hero images. Delete one first."); e.status = 400; throw e; }
  if (!req.file) { const e = new Error("No file uploaded"); e.status = 400; throw e; }
  const buffer = await fileBuffer(req.file);
  let result;
  try { result = await cloudinaryUpload(buffer, `sojaru/hero/${uuidv4()}`); }
  catch (e) { console.error("Hero upload failed:", e); const err = new Error("Upload failed. Please try again."); err.status = 502; throw err; }
  const db = await getDb();
  await db.collection("settings").updateOne({ _id: "site" }, { $push: { hero_images: { id: uuidv4(), url: result.url, public_id: result.public_id, alt: "Sojaru" } } }, { upsert: true });
  res.json(publicSettings(await getSettings()));
}));

// Admin: delete hero image
app.delete("/api/admin/hero-images/:id", wrap(async (req, res) => {
  await requireAdmin(req);
  const doc = await getSettings();
  const record = (doc.hero_images || []).find((h) => h.id === req.params.id);
  const db = await getDb();
  await db.collection("settings").updateOne({ _id: "site" }, { $pull: { hero_images: { id: req.params.id } } });
  if (record?.public_id) try { await cloudinaryDelete(record.public_id); } catch (e) { console.warn("Cloudinary delete:", e.message); }
  res.json(publicSettings(await getSettings()));
}));

// Admin: upload category image
app.post("/api/admin/category-images/:slug", upload.single("file"), wrap(async (req, res) => {
  await requireAdmin(req);
  if (!req.file) { const e = new Error("No file uploaded"); e.status = 400; throw e; }
  const buffer = await fileBuffer(req.file);
  let result;
  try { result = await cloudinaryUpload(buffer, `sojaru/categories/${req.params.slug}-${uuidv4()}`); }
  catch (e) { console.error("Category upload failed:", e); const err = new Error("Upload failed. Please try again."); err.status = 502; throw err; }
  const db = await getDb();
  await db.collection("settings").updateOne({ _id: "site" }, { $set: { [`category_images.${req.params.slug}`]: { url: result.url, public_id: result.public_id, id: uuidv4() } } }, { upsert: true });
  res.json(publicSettings(await getSettings()));
}));

// Admin: delete category image
app.delete("/api/admin/category-images/:slug", wrap(async (req, res) => {
  await requireAdmin(req);
  const doc = await getSettings();
  const record = (doc.category_images || {})[req.params.slug];
  const db = await getDb();
  await db.collection("settings").updateOne({ _id: "site" }, { $unset: { [`category_images.${req.params.slug}`]: "" } });
  if (record?.public_id) try { await cloudinaryDelete(record.public_id); } catch (e) { console.warn("Cloudinary delete:", e.message); }
  res.json(publicSettings(await getSettings()));
}));

// Admin: customizable products
app.get("/api/admin/customizable-products", wrap(async (req, res) => {
  await requireAdmin(req);
  const db = await getDb();
  const docs = await db.collection("customizable_products").find({}).sort({ _id: 1 }).toArray();
  res.json(docs.map((d) => ({ id: d._id.toString(), product_type: d.product_type || "", size: d.size || "", color: d.color || "", material: d.material || "" })));
}));

app.post("/api/admin/customizable-products", wrap(async (req, res) => {
  await requireAdmin(req);
  const db = await getDb();
  const doc = { product_type: (req.body.product_type || "").trim(), size: (req.body.size || "").trim(), color: (req.body.color || "").trim(), material: (req.body.material || "").trim() };
  const result = await db.collection("customizable_products").insertOne(doc);
  res.json({ id: result.insertedId.toString(), ...doc });
}));

app.put("/api/admin/customizable-products/:id", wrap(async (req, res) => {
  await requireAdmin(req);
  const db = await getDb();
  const upd = { product_type: (req.body.product_type || "").trim(), size: (req.body.size || "").trim(), color: (req.body.color || "").trim(), material: (req.body.material || "").trim() };
  const result = await db.collection("customizable_products").findOneAndUpdate({ _id: new ObjectId(req.params.id) }, { $set: upd }, { returnDocument: "after" });
  if (!result) { const e = new Error("Not found"); e.status = 404; throw e; }
  res.json({ id: result._id.toString(), ...upd });
}));

app.delete("/api/admin/customizable-products/:id", wrap(async (req, res) => {
  await requireAdmin(req);
  const db = await getDb();
  const result = await db.collection("customizable_products").deleteOne({ _id: new ObjectId(req.params.id) });
  if (!result.deletedCount) { const e = new Error("Not found"); e.status = 404; throw e; }
  res.json({ ok: true });
}));

// ─── Customization form (public) + Customized Orders (admin) ──────────────────
// Public: list customizable products used to build the homepage form dropdowns
app.get("/api/customizable-products", wrap(async (req, res) => {
  const db = await getDb();
  const docs = await db.collection("customizable_products").find({}).sort({ _id: 1 }).toArray();
  res.json(docs.map((d) => ({ id: d._id.toString(), product_type: d.product_type || "", size: d.size || "", color: d.color || "", material: d.material || "" })));
}));

// Public: submit a customization order request (accepts optional design file attachments)
app.post("/api/customized-orders", upload.array("design_files", 5), wrap(async (req, res) => {
  const db = await getDb();
  const b = req.body || {};
  const name = (b.name || "").trim();
  const email = (b.email || "").trim();
  const phone = (b.phone || "").trim();
  const product_type = (b.product_type || "").trim();
  const size = (b.size || "").trim();
  const color = (b.color || "").trim();
  const material = (b.material || "").trim();
  const additional_instructions = (b.additional_instructions || "").trim();
  // All fields required except design files + additional instructions
  if (!name || !email || !phone || !product_type || !size || !color || !material) {
    const e = new Error("Please fill in all required fields.");
    e.status = 400;
    throw e;
  }
  // Upload any attached documents to Cloudinary (optional)
  const design_files = [];
  for (const file of req.files || []) {
    try {
      const buffer = await fileBuffer(file);
      const up = await cloudinaryUploadAuto(buffer, `sojaru/customization/${uuidv4()}`);
      design_files.push({ url: up.url, public_id: up.public_id, name: file.originalname || "attachment" });
    } catch (e) {
      console.error("Design file upload failed:", e.message);
      const err = new Error("File upload failed. Please try a smaller file.");
      err.status = 502;
      throw err;
    }
  }
  const doc = {
    name, email, phone, product_type, size, color, material,
    additional_instructions,
    design_files,
    created_at: new Date(),
  };
  const result = await db.collection("customized_orders").insertOne(doc);
  // Send confirmation email to the customer (CC hello@sojaru.co.in) — awaited for Vercel reliability
  await sendMail({
    to: email,
    subject: "We received your Sojaru customization request 🐾",
    html: customizationEmailHtml({ name, product_type, size, color, material, additional_instructions, fileCount: design_files.length }),
  });
  res.json({ id: result.insertedId.toString(), ok: true });
}));

// Admin: list customized orders (newest first)
app.get("/api/admin/customized-orders", wrap(async (req, res) => {
  await requireAdmin(req);
  const db = await getDb();
  const docs = await db.collection("customized_orders").find({}).sort({ created_at: -1 }).toArray();
  res.json(docs.map((d) => ({
    id: d._id.toString(),
    name: d.name || "",
    email: d.email || "",
    phone: d.phone || "",
    product_type: d.product_type || "",
    size: d.size || "",
    color: d.color || "",
    material: d.material || "",
    additional_instructions: d.additional_instructions || "",
    design_files: Array.isArray(d.design_files) ? d.design_files : [],
    created_at: d.created_at || null,
  })));
}));

// Admin: delete a customized order
app.delete("/api/admin/customized-orders/:id", wrap(async (req, res) => {
  await requireAdmin(req);
  const db = await getDb();
  const result = await db.collection("customized_orders").deleteOne({ _id: new ObjectId(req.params.id) });
  if (!result.deletedCount) { const e = new Error("Not found"); e.status = 404; throw e; }
  res.json({ ok: true });
}));

// ─── Export for Vercel serverless ─────────────────────────────────────────────
module.exports = app;

// Local standalone mode
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Sojaru API (Node.js) running on http://0.0.0.0:${PORT}`));
}
