// Load .env from backend/ folder (local dev). Vercel injects env vars directly.
require("dotenv").config({
  path: require("path").join(__dirname, "..", "backend", ".env"),
  override: false,
});

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
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
app.use(express.json());

// Multer — memory storage only (Vercel has no writable filesystem)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

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
  const cached = cacheGet("categories");
  if (cached) return res.json(cached);
  const r = await wc("GET", "products/categories", { per_page: 100, orderby: "name", hide_empty: false });
  const cats = r.data.filter((c) => c.slug !== "uncategorized").map((c) => ({ id: c.id, name: c.name, slug: c.slug, parent: c.parent, count: c.count || 0, description: c.description || "", image: c.image?.src || null }));
  cacheSet("categories", cats, 300); res.json(cats);
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

// Create order
app.post("/api/orders", wrap(async (req, res) => {
  let user = null; try { user = await getCurrentUser(req); } catch {}
  const b = req.body;
  const payload = { payment_method: b.payment_method || "cod", payment_method_title: b.payment_method_title || "Cash on Delivery", set_paid: false, billing: b.billing, shipping: b.shipping || b.billing, line_items: b.line_items, coupon_lines: b.coupon_lines || [], shipping_lines: b.shipping_lines || [], customer_note: b.customer_note || "" };
  if (user?.wc_customer_id) payload.customer_id = user.wc_customer_id;
  const r = await wc("POST", "orders", null, payload);
  const o = r.data;
  res.json({ id: o.id, status: o.status, total: o.total, currency: o.currency, order_key: o.order_key, payment_url: `${WC_STORE_URL}/checkout/order-pay/${o.id}/?pay_for_order=true&key=${o.order_key || ""}`, line_items: o.line_items || [] });
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
  const { marquee_texts, festive, hero } = req.body;
  const db = await getDb(); const upd = {};
  if (marquee_texts) upd.marquee_texts = marquee_texts.filter((t) => t?.trim()).map((t) => t.trim());
  if (hero) { const pick = (k, fb) => typeof hero[k] === "string" && hero[k].trim() ? hero[k].trim() : fb; upd.hero = { subtitle: pick("subtitle", DEFAULT_HERO.subtitle), primary_label: pick("primary_label", DEFAULT_HERO.primary_label), primary_link: pick("primary_link", DEFAULT_HERO.primary_link), secondary_label: pick("secondary_label", DEFAULT_HERO.secondary_label), secondary_link: pick("secondary_link", DEFAULT_HERO.secondary_link) }; }
  if (festive) {
    let catId = FESTIVE_FALLBACK_ID;
    try { const r = await wc("GET", "products/categories", { slug: FESTIVE_SLUG }); if (r.data.length) catId = r.data[0].id; } catch {}
    upd.festive = { title: (festive.title || "Festive Collection").trim(), category_id: catId, enabled: !!festive.enabled };
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
  let result;
  try { result = await cloudinaryUpload(req.file.buffer, `sojaru/hero/${uuidv4()}`); }
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
  let result;
  try { result = await cloudinaryUpload(req.file.buffer, `sojaru/categories/${req.params.slug}-${uuidv4()}`); }
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

// ─── Export for Vercel serverless ─────────────────────────────────────────────
module.exports = app;

// Local standalone mode
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Sojaru API (Node.js) running on http://0.0.0.0:${PORT}`));
}
