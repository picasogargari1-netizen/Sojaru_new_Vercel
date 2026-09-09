# Sojaru — Vercel Deployment Guide

This guide deploys the full Sojaru app (React frontend + Node.js/Express API) to Vercel from GitHub.
The backend is a Node.js serverless function — no Python, no separate server needed.

---

## Architecture on Vercel

| Layer | Where |
|-------|-------|
| React frontend | Vercel static build (`frontend/build`) |
| API backend | Vercel serverless Node.js function (`api/index.js`) |
| Database | MongoDB Atlas (external) |
| Products | WooCommerce REST API (external) |
| Image uploads | Cloudinary (external CDN) |

All `/api/*` requests are routed to the Node.js function; everything else serves the React app.

---

## Step 1 — Push to GitHub

1. In the Emergent editor, click **"Save to GitHub"** in the chat input toolbar to push your code.
2. Make sure the repo is on GitHub (public or private).

> **Security reminder**: Before your first push, rotate these secrets:
> - MongoDB Atlas database password
> - `JWT_SECRET` (generate a new 64-char hex string)
> - `ADMIN_PASSWORD`
> - WooCommerce Consumer Key + Secret (WP Admin → WooCommerce → Settings → Advanced → REST API)

---

## Step 2 — Create a Vercel Project

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Leave all settings as auto-detected (Vercel reads `vercel.json` automatically)
4. **Do not deploy yet** — add env vars first (Step 3)

---

## Step 3 — Add Environment Variables

In your Vercel project → **Settings → Environment Variables**, add these:

| Variable | Value |
|----------|-------|
| `MONGO_URL` | Your MongoDB Atlas connection string |
| `DB_NAME` | `Sojaru` |
| `WC_STORE_URL` | `https://developer.sojaru.co.in` |
| `WC_CONSUMER_KEY` | Your WooCommerce consumer key |
| `WC_CONSUMER_SECRET` | Your WooCommerce consumer secret |
| `JWT_SECRET` | A long random string (64+ chars) |
| `ADMIN_EMAIL` | Your admin login email |
| `ADMIN_PASSWORD` | Your admin password |
| `CORS_ORIGINS` | `https://your-project.vercel.app` (update after first deploy) |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |
| `REACT_APP_BACKEND_URL` | *(leave empty — same-domain API calls work automatically)* |

> Set all variables for **Production**, **Preview**, and **Development** environments.

---

## Step 4 — Deploy

1. Click **Deploy** in Vercel
2. Vercel runs `npm install` (installs backend deps), then `cd frontend && yarn install && yarn build`
3. Your site goes live at `https://your-project.vercel.app`

---

## Step 5 — After Deploy

1. **Update CORS**: Set `CORS_ORIGINS` to your actual Vercel URL (e.g. `https://sojaru.vercel.app`) and redeploy
2. **Update MongoDB Atlas Network Access**: Allow `0.0.0.0/0` (all IPs) since Vercel IPs are dynamic
   - cloud.mongodb.com → Network Access → + ADD IP ADDRESS → Allow Access from Anywhere

---

## Alternative: Hostinger Shared + Railway

If you want the frontend on Hostinger Shared hosting:

1. Build frontend locally: `cd frontend && yarn build`
2. Upload `frontend/build/` contents to Hostinger `public_html/` via FTP
3. Deploy the API backend separately:
   - Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
   - Set **Root Directory** to `/` and **Start Command** to `node api/index.js`
   - Add the same environment variables as above
4. Copy the Railway URL, set `REACT_APP_BACKEND_URL` to it in Hostinger's `public_html/.env` or rebuild

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| API returns 500 on first request | Check Vercel Function Logs for missing env vars |
| MongoDB connection timeout | Add `0.0.0.0/0` to Atlas Network Access |
| WooCommerce 404 errors | Go to WP Admin → Settings → Permalinks → Save |
| React routes show 404 | The `vercel.json` rewrites handle this automatically |
| Image uploads fail | Verify `CLOUDINARY_*` env vars are set correctly |
| CORS errors | Set `CORS_ORIGINS` to your exact Vercel domain |

---

## Local Development

```bash
# Node.js API backend (port 3001)
npm install
node api/index.js

# React frontend (port 3000, in another terminal)
cd frontend && yarn install
REACT_APP_BACKEND_URL=http://localhost:3001 yarn start
```
