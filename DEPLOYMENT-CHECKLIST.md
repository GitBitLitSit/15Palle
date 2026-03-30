# Deployment checklist (AWS + Amplify + Raspberry Pi)

This project uses **two** delivery paths:

| Part | Tool | What it deploys |
|------|------|-----------------|
| **Backend** | **SST** (`sst deploy`) | API Gateway HTTP API, Lambdas, **two** WebSocket APIs (dashboard + kiosk), permissions |
| **Frontend** | **AWS Amplify** (`amplify.yml`, app root `frontend/`) | Next.js app (includes `/kiosk` middleware, env vars) |

---

## 1. One-time: machine that runs `sst deploy`

From the repo root (same folder as `sst.config.ts`):

### Prerequisites

- Node.js and `npm ci` at repo root (optional; SST bundles as needed).
- **AWS credentials** with permission to create/update Lambda, API Gateway, IAM, etc.
- Optional: `AWS_PROFILE` or `PROFILE_AWS` if you do not use the default profile.

### Environment variables (shell or `.env` loaded before deploy)

These are read **at deploy time** and baked into Lambdas (see `sst.config.ts`):

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET_KEY` | JWT signing |
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_DB_NAME` | Database name |
| `ADMIN_USERNAME` | Admin login |
| `ADMIN_PASSWORD` | Admin login |
| `SES_SENDER_EMAIL` | Email sender |
| `MAIL_API_KEY` | Mail provider / SES |
| `RASPBERRY_PI_API_KEY` | `x-api-key` for `POST /check-in` from the Pi |
| `CORS_ALLOWED_ORIGINS` | Optional comma-separated extra CORS origins |

Optional:

| Variable | Purpose |
|----------|---------|
| `LAMBDA_NAME_SUFFIX` | Defaults in config; only change if you know your naming |
| `PROFILE_AWS` / `AWS_PROFILE` | AWS CLI profile name |

### Command

Use the project script (prunes conflicting kiosk CloudWatch log groups when needed, then deploys):

```bash
cd /path/to/15Palle
npm ci
npm run deploy:prod
```

Requires **AWS credentials** the same way as the AWS CLI (e.g. `aws sts get-caller-identity` works). Optional: `SST_SKIP_KIOSK_LOG_PRUNE=1` skips only the log-group cleanup step.

Plain `npx sst deploy --stage production` skips the prereq and may fail with duplicate kiosk **LogGroup** errors until those groups are removed once.

### After a successful deploy

The CLI prints outputs similar to:

- `api` → base URL of the **HTTP API** (use for `NEXT_PUBLIC_API_URL`).
- `websocket` → **dashboard** WebSocket URL → `NEXT_PUBLIC_WEBSOCKET_API_URL`.
- `kioskWebsocket` → **kiosk** WebSocket URL → `NEXT_PUBLIC_KIOSK_WEBSOCKET_API_URL`.

**Important:** If API or WebSocket URLs **change** after a deploy, update Amplify env vars and **redeploy the frontend** so the site and kiosk use the new endpoints.

---

## 2. AWS Amplify (Next.js frontend)

In the Amplify console: **App settings → Environment variables** (for the branch you deploy, e.g. `main`).

### Required for the app to talk to your API

| Variable | Example / source |
|----------|------------------|
| `NEXT_PUBLIC_API_URL` | `{api output}/` — often append nothing extra; your client should call paths like `/check-in` relative to this base (see `frontend/lib/api.ts`). Use the **full** API URL SST prints (no trailing slash issues — match what already works). |
| `NEXT_PUBLIC_WEBSOCKET_API_URL` | Value of `websocket` from `sst deploy` |
| `NEXT_PUBLIC_KIOSK_WEBSOCKET_API_URL` | Value of `kioskWebsocket` from `sst deploy` |
| `NEXT_PUBLIC_SITE_URL` | `https://15palle.com` (canonical site; used for SEO/sitemap) |

### Kiosk gate (middleware)

| Variable | Purpose |
|----------|---------|
| `KIOSK_ACCESS_SECRET` | Long random string. Protects `/kiosk` and `/counter`. **Unset** = routes stay public (dev/legacy). **Set** = browser must open once with `?token=SECRET` or send `Authorization: Bearer SECRET`. |

Generate a secret, e.g.:

```bash
openssl rand -hex 32
```

Use the **same** value in the Raspberry Pi `KIOSK_URL` query parameter (see below).

### Deploy frontend

Push to the connected branch or trigger **Build** in Amplify so a new build runs with the env vars.

---

## 3. Raspberry Pi (`15PalleRaspberry`)

On the Pi, in the repo directory, a single **`.env`** file (chmod `600`) is used by both the scanner and the kiosk script.

| Variable | Where it comes from | Purpose |
|----------|---------------------|---------|
| `API_URL` | Full URL to **`POST /check-in`** on your SST API, e.g. `https://xxxxx.execute-api.eu-west-1.amazonaws.com/check-in` or your custom domain if mapped | `scanner.py` |
| `API_KEY` | Same value as **`RASPBERRY_PI_API_KEY`** in SST | `x-api-key` header |
| `KIOSK_URL` | Your public site + path + token, e.g. `https://15palle.com/kiosk?token=<KIOSK_ACCESS_SECRET>` | `kiosk-display.sh` (Chromium) |

Optional one-time autostart (desktop session):

```bash
chmod +x kiosk-display.sh install-kiosk-autostart.sh
./install-kiosk-autostart.sh
```

See `15PalleRaspberry/README.md` for scanner systemd, HDMI, etc.

---

## 4. Order of operations (smooth rollout)

1. Set all **SST** secrets on the deploy machine → run **`npx sst deploy --stage production`**.
2. Copy **`api`**, **`websocket`**, **`kioskWebsocket`** into **Amplify** env vars (`NEXT_PUBLIC_*`).
3. Set **`KIOSK_ACCESS_SECRET`** in Amplify (same string you will put in `KIOSK_URL` on the Pi).
4. **Build** Amplify.
5. When the Pi is ready: set **`API_URL`**, **`API_KEY`**, **`KIOSK_URL`** on the Pi and enable autostart if needed.

**If you enable `KIOSK_ACCESS_SECRET` before the Pi uses the token URL**, the kiosk page returns **403** until `KIOSK_URL` includes `?token=...`.

---

## 5. Custom domain (optional)

If the API is not on `execute-api.amazonaws.com` and you use a custom domain, put that domain in **`NEXT_PUBLIC_API_URL`** and ensure **`API_URL`** on the Pi matches that **check-in** URL.

---

## 6. Quick reference — who must match what

| Secret | SST (backend) | Amplify | Raspberry Pi |
|--------|-----------------|---------|--------------|
| Pi → API auth | `RASPBERRY_PI_API_KEY` | — | `API_KEY` in `.env` |
| Kiosk browser gate | — | `KIOSK_ACCESS_SECRET` | same token inside `KIOSK_URL` |
| Realtime URLs | emitted by deploy | `NEXT_PUBLIC_WEBSOCKET_*` | — |

---

## 7. Troubleshooting: `ResourceAlreadyExistsException` on CloudWatch log groups

`npm run deploy:prod` runs `scripts/delete-kiosk-log-groups.cjs` first to remove the two kiosk Lambda log groups if they already exist (harmless if they do not). If deploy still fails, ensure the **AWS CLI** can call `logs:DeleteLogGroup` for `eu-west-1`, or delete those groups manually in the CloudWatch console, then run `npm run deploy:prod` again.

---

*Last updated: matches `sst.config.ts` + `frontend/middleware.ts` + `15PalleRaspberry` scripts.*
