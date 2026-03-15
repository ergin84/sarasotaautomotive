# Sarasota Automotive – How To (commands & deploy)

Run all commands from the **project root** unless noted.

---

## Deploy to VPS (187.124.225.101)

**Normal deploy (code only, database unchanged):**
```bash
./deploy.sh
# or
./deploy-sarasota-187.sh
```

**Clean app and redeploy, keep database:**
```bash
./deploy.sh --clean
# or
./deploy-sarasota-187.sh --clean
```

**Clean app and database, then deploy (fresh DB):**
```bash
./deploy.sh --clean-all
# or
./deploy-sarasota-187.sh --clean-all
```

**Requirements:** `.env.deploy` must exist with production values (e.g. `MONGODB_URI`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`). You may be prompted for the SSH password (or use SSH keys).

---

## Deploy to Aruba VPS (5.249.148.18)

```bash
./deploy-sarasota-aruba.sh
```

Uses the same strategy (Node + PM2 + MongoDB + Nginx). Ensure `.env.deploy` is set for that environment if it differs.

---

## Emergency repair on VPS (187)

Only if the app is broken (e.g. PM2 stopped, `node_modules` missing, Node/Mongo/Nginx not running). Normal deploy is `./deploy.sh`.

```bash
ssh root@187.124.225.101 'bash -s' < scripts/fix-vps-services.sh
```

---

## Database backup (nightly at 2 AM)

**One-time setup (install backup script + cron on VPS):**
```bash
./scripts/setup-backup-cron.sh
```

**Location on VPS:** `/var/backups/sarasota-automotive/db/`  
**Retention:** Latest 7 backups only.  
**Log:** `/var/log/sarasota-backup.log` on the VPS.

---

## Email notifications (Gmail: automotivesarasota@gmail.com)

The app sends mail for rental/sale requests, contact form, password reset, and accepted-request confirmations. To use **automotivesarasota@gmail.com**:

### 1. Google Account – App Password (required)

Gmail requires an **App Password** when 2-Step Verification is on (recommended).

1. Sign in at [Google Account](https://myaccount.google.com/) with **automotivesarasota@gmail.com**.
2. Go to **Security** → **2-Step Verification** and turn it **On** if it isn’t already.
3. Go to **Security** → **App passwords** (or search “App passwords” in the account).
4. Choose **Mail** and **Other (Custom name)** → e.g. “Sarasota Automotive” → **Generate**.
5. Copy the **16-character password** (e.g. `abcd efgh ijkl mnop`). You’ll use it as `SMTP_PASS` (spaces optional).

### 2. Set environment variables

**Production (VPS):** edit `.env.deploy` in the project root, then redeploy so the VPS gets the new values.

```env
# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=automotivesarasota@gmail.com
SMTP_PASS=your-16-char-app-password

# Where to receive notifications (can be same or different)
ADMIN_EMAIL=automotivesarasota@gmail.com

# Optional: “From” address (defaults to SMTP_USER)
NOTIFY_FROM=automotivesarasota@gmail.com
```

**Local:** put the same block in `.env` in the project root (and keep `SMTP_PASS` secret; do not commit `.env`).

### 3. Deploy so the VPS uses the new settings

```bash
./deploy.sh
```

The app reads SMTP only at startup, so after changing `.env.deploy` you must redeploy (or restart PM2 on the server) for mail to use the new address and App Password.

### Troubleshooting

- **“Invalid login”** – Use the App Password, not the normal Gmail password.
- **“Less secure app”** – Use 2-Step Verification + App Password; “less secure apps” is no longer the right method.
- **No mail received** – Check server logs: `ssh root@187.124.225.101 'pm2 logs sarasota-automotive --lines 50 --nostream'`. If you see **“Mail (SMTP): not configured”** or **“Contact email skipped: SMTP credentials not configured”**, then `SMTP_USER` and `SMTP_PASS` are not loaded on the server. Fix: set them in `.env.deploy` (no spaces around `=`), then run `./deploy.sh` so the server gets a fresh `.env`. To confirm on the server: `ssh root@187.124.225.101 'grep -E "^SMTP_USER|^SMTP_PASS" /var/www/sarasota_automotive/.env'` (values will show; run only if you’re OK with that).
- **“Cannot find module '../encodings'”** – Redeploy with a clean install so dependencies (e.g. iconv-lite) are correct: `./deploy.sh --clean`.

---

## Useful SSH commands (VPS 187)

**Log in:**
```bash
ssh root@187.124.225.101
```

**PM2 (app):**
```bash
ssh root@187.124.225.101 'pm2 status'
ssh root@187.124.225.101 'pm2 logs sarasota-automotive --lines 50'
ssh root@187.124.225.101 'pm2 restart sarasota-automotive'
```

**Services:**
```bash
ssh root@187.124.225.101 'systemctl status nginx mongod'
```

---

## Local (no deploy)

**Run with Docker:**
```bash
docker compose up -d --build
# App: http://localhost:3000
```

**Create admin user (Docker):**
```bash
docker compose exec app node init-admin.js
```

**Run without Docker (Node + local MongoDB):**
```bash
npm install
# Ensure MongoDB running and .env has MONGODB_URI
npm start
```

---

## Scripts reference

| Script | Purpose |
|--------|--------|
| `deploy.sh` | Main deploy to 187.124.225.101 (options: `--clean`, `--clean-all`) |
| `deploy-sarasota-187.sh` | Same as `deploy.sh` (wrapper) |
| `deploy-sarasota-aruba.sh` | Deploy to Aruba VPS 5.249.148.18 |
| `scripts/fix-vps-services.sh` | Repair on VPS (Node/Mongo/Nginx/PM2/deps) – use only when needed |
| `scripts/backup-mongodb-vps.sh` | MongoDB backup (runs on VPS via cron) |
| `scripts/setup-backup-cron.sh` | One-time: install backup script + 2 AM cron on VPS |

---

## URLs

- **Production (187):** http://187.124.225.101  
- **Health:** http://187.124.225.101/health  
- **Local (Docker):** http://localhost:3000  
