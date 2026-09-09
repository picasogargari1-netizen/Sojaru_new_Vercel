# Sojaru — Vercel Deployment Guide

This guide deploys the full Sojaru app (React frontend + FastAPI backend) to Vercel from GitHub.

---

## Architecture on Vercel

| Layer | Where |
|-------|-------|
| React frontend | Vercel static build (`frontend/build`) |
| FastAPI backend | Vercel Python serverless function (`api/index.py`) |
| Database | MongoDB Atlas (external) |
| Products | WooCommerce REST API (external) |
| Image uploads | Cloudinary (external CDN) |

All API routes (`/api/*`) are routed to the Python function; everything else serves the React app.

---

## Step 1 — Push to GitHub

1. In the Emergent editor, click **"Save to GitHub"** in the chat input toolbar to commit and push your code.
2. Make sure the repo is on GitHub (public or private).

> **Security reminder**: Before your first push, rotate these secrets:
> - MongoDB Atlas database password
> - `JWT_SECRET` (generate a new 64-char hex string)
> - `ADMIN_PASSWORD`
> - WooCommerce Consumer Key + Secret (regenerate in WP Admin → WooCommerce → Settings → Advanced → REST API)

---

## Step 2 — Create a Vercel Project

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Vercel will auto-detect the `vercel.json` at the root. Leave all framework settings as detected.
4. **Do not deploy yet** — add env vars first (Step 3)

---

## Step 3 — Add Environment Variables in Vercel

In your Vercel project → **Settings → Environment Variables**, add these:

| Variable | Value |
|----------|-------|
| `MONGO_URL` | Your MongoDB Atlas connection string |
| `DB_NAME` | `Sojaru` |
| `WC_STORE_URL` | `https://developer.sojaru.co.in` (or your live store) |
| `WC_CONSUMER_KEY` | Your WooCommerce consumer key |
| `WC_CONSUMER_SECRET` | Your WooCommerce consumer secret |
| `JWT_SECRET` | A long random hex string (64+ chars) |
| `ADMIN_EMAIL` | Your admin login email |
| `ADMIN_PASSWORD` | Your admin password (strong, rotated) |
| `CORS_ORIGINS` | `https://yourdomain.vercel.app` (update after first deploy) |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |
| `REACT_APP_BACKEND_URL` | *(leave empty — same-domain API calls are automatic)* |

> Set all variables for **Production**, **Preview**, and **Development** environments.

---

## Step 4 — Deploy

1. Click **Deploy** in Vercel
2. The build runs: React frontend is built with `yarn build`, Python function is deployed
3. Your site will be live at `https://your-project.vercel.app`

---

## Step 5 — After Deploy

1. **Update CORS**: Set `CORS_ORIGINS` to your actual Vercel URL and redeploy
2. **Update MongoDB Atlas Network Access**: Allow Vercel's IP ranges (or use `0.0.0.0/0` if you have strong DB credentials)
3. **Test admin panel**: Visit `/admin` and log in

---

## MongoDB Atlas — Network Access

Vercel's serverless functions can come from any IP. Add `0.0.0.0/0` temporarily to test, then restrict once you know Vercel's IPs:

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → **Network Access**
2. Click **+ ADD IP ADDRESS** → **Allow Access from Anywhere** (`0.0.0.0/0`)
3. Click **Confirm** → wait 60 seconds

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| API returns 500 on first request | Check Vercel Function Logs for missing env vars |
| MongoDB connection timeout | Add `0.0.0.0/0` to Atlas Network Access |
| WooCommerce 404 errors | Go to WP Admin → Settings → Permalinks → Save |
| React routes show 404 | The `vercel.json` routes handle this automatically |
| Image uploads fail | Verify CLOUDINARY_* env vars are set correctly |
| CORS errors | Set CORS_ORIGINS to your exact Vercel domain |

---

## Local Development

```bash
# Backend
cd backend && pip install -r requirements.txt
python server.py   # runs on http://localhost:8001

# Frontend (in another terminal)
cd frontend && yarn install
REACT_APP_BACKEND_URL=http://localhost:8001 yarn start
```
