#!/bin/bash
# Sarasota Automotive – single-command deploy to VPS
#
# Usage (run from project root):
#   ./deploy.sh              incremental deploy (keep app + DB as-is)
#   ./deploy.sh --clean      clean app + full deploy, CONSERVE DATABASE
#   ./deploy.sh --clean-all  clean app + DROP DATABASE + full deploy
#
# Same as: ./deploy-sarasota-187.sh [--clean|--clean-all]
# Target: root@187.124.225.101 – Node + PM2 + MongoDB + Nginx (no Docker)

set -euo pipefail

APP_NAME="sarasota-automotive"
VPS_IP="187.124.225.101"
VPS_USER="root"
REMOTE_DIR="/var/www/sarasota_automotive"
MONGO_DB="sarasota_automotive"
ENV_FILE=".env.deploy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SSH_OPTS="-o StrictHostKeyChecking=accept-new"
CLEAN=""
CLEAN_ALL=""
for arg in "$@"; do
  [ "$arg" = "--clean" ]     && CLEAN=1
  [ "$arg" = "--conserve-db" ] && CLEAN=1
  [ "$arg" = "--clean-all" ] && CLEAN=1 && CLEAN_ALL=1
done

echo "=============================================="
echo "  Sarasota Automotive – Deploy to VPS"
echo "=============================================="
echo "  Target: $VPS_USER@$VPS_IP"
echo "  App dir: $REMOTE_DIR"
if [ -n "$CLEAN_ALL" ]; then
  echo "  Mode:    CLEAN ALL (app + database wiped, then deploy)"
elif [ -n "$CLEAN" ]; then
  echo "  Mode:    CLEAN APP (conserve database)"
else
  echo "  Mode:    Incremental deploy"
fi
echo "=============================================="
echo ""

# Optional: clean VPS (app dir + PM2; optionally drop DB)
if [ -n "$CLEAN" ]; then
  echo "[0/4] Cleaning VPS..."
  if [ -n "$CLEAN_ALL" ]; then
    echo "        Stopping app, removing app dir, DROPPING MongoDB database '$MONGO_DB'..."
    ssh $SSH_OPTS "$VPS_USER@$VPS_IP" "export PATH=\"/usr/local/bin:/usr/local/lib/nodejs/bin:/usr/bin:/bin:\$PATH\"; pm2 delete $APP_NAME 2>/dev/null || true; pm2 save 2>/dev/null || true; rm -rf $REMOTE_DIR; mkdir -p $REMOTE_DIR; (mongosh --quiet $MONGO_DB --eval 'db.dropDatabase()' 2>/dev/null || mongo --quiet $MONGO_DB --eval 'db.dropDatabase()' 2>/dev/null) || true"
  else
    echo "        Stopping app, removing app dir (database preserved)."
    ssh $SSH_OPTS "$VPS_USER@$VPS_IP" "export PATH=\"/usr/local/bin:/usr/local/lib/nodejs/bin:/usr/bin:/bin:\$PATH\"; pm2 delete $APP_NAME 2>/dev/null || true; pm2 save 2>/dev/null || true; rm -rf $REMOTE_DIR; mkdir -p $REMOTE_DIR"
  fi
  echo "        Clean done."
  echo ""
fi

# 1. Check prereqs and bundle
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Missing $ENV_FILE. Create it from .env.example with production values."
  exit 1
fi
if [ ! -f "package.json" ]; then
  echo "ERROR: Run this script from the project root."
  exit 1
fi

echo "[1/4] Preparing bundle..."
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT
rsync -a \
  --exclude 'node_modules' --exclude '.git' --exclude '.venv' --exclude '*.log' \
  --exclude '.env' --exclude '.env.local' --exclude '.env.production' --exclude '.env.deploy' \
  --exclude 'public/uploads' --exclude '.DS_Store' --exclude 'logs' --exclude 'tmp' \
  ./ "$TEMP_DIR/"
cp "$ENV_FILE" "$TEMP_DIR/.env.production"
cp "$ENV_FILE" "$TEMP_DIR/.env"
chmod 600 "$TEMP_DIR/.env.production" "$TEMP_DIR/.env"

echo "[2/4] Uploading to VPS..."
ssh $SSH_OPTS "$VPS_USER@$VPS_IP" "mkdir -p $REMOTE_DIR /var/backups/${APP_NAME}"
ssh $SSH_OPTS "$VPS_USER@$VPS_IP" "if [ -d '$REMOTE_DIR' ] && [ \"\$(ls -A $REMOTE_DIR 2>/dev/null)\" ]; then tar -czf /var/backups/${APP_NAME}/backup_${TIMESTAMP}.tar.gz -C $REMOTE_DIR . 2>/dev/null; fi" || true
rsync -avz --delete --exclude 'public/uploads' -e "ssh $SSH_OPTS" "$TEMP_DIR"/ "$VPS_USER@$VPS_IP:$REMOTE_DIR/"

echo "[3/4] Remote setup (Node, MongoDB, deps, PM2, Nginx)..."
ssh $SSH_OPTS "$VPS_USER@$VPS_IP" "REMOTE_DIR='$REMOTE_DIR' APP_NAME='$APP_NAME' VPS_USER='$VPS_USER' VPS_IP='$VPS_IP'" <<'REMOTE'
set -e
export PATH="/usr/local/bin:/usr/local/lib/nodejs/bin:/usr/bin:/bin:$PATH"
[ -s /root/.nvm/nvm.sh ] && . /root/.nvm/nvm.sh
cd "$REMOTE_DIR"
mkdir -p public/uploads

# Use deployed env (from .env.deploy) so SMTP and other vars are applied
if [ -f .env.production ]; then cp .env.production .env; chmod 600 .env; fi

# Node.js
if ! command -v node >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq && apt-get install -y curl
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v && npm -v

# MongoDB
if ! command -v mongod >/dev/null 2>&1; then
  apt-get install -y gnupg curl
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list
  apt-get update -qq && apt-get install -y mongodb-org
  systemctl enable mongod
fi
systemctl start mongod 2>/dev/null || systemctl start mongodb 2>/dev/null || true
systemctl enable mongod 2>/dev/null || systemctl enable mongodb 2>/dev/null || true
sleep 2

# Dependencies
npm ci --omit=dev 2>/dev/null || npm install --production

# PM2
command -v pm2 >/dev/null 2>&1 || npm install -g pm2
PM2_BIN=$(command -v pm2)
"$PM2_BIN" delete "$APP_NAME" 2>/dev/null || true
"$PM2_BIN" start server.js --name "$APP_NAME" --cwd "$REMOTE_DIR" --env production
"$PM2_BIN" save
"$PM2_BIN" startup systemd -u "$VPS_USER" --hp /root 2>/dev/null | tail -1 || true

# Nginx
command -v nginx >/dev/null 2>&1 || (apt-get update -qq && apt-get install -y nginx)
cat >/etc/nginx/sites-available/"$APP_NAME".conf <<'NGX'
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /health { return 200 "healthy\n"; add_header Content-Type text/plain; }
    client_max_body_size 50M;
}
NGX
ln -sf /etc/nginx/sites-available/"$APP_NAME".conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t 2>/dev/null || true
systemctl enable nginx 2>/dev/null || true
systemctl restart nginx 2>/dev/null || true

"$PM2_BIN" restart "$APP_NAME" --update-env 2>/dev/null || true
"$PM2_BIN" save
sleep 1
echo "Remote setup done."
"$PM2_BIN" status
REMOTE

echo "[4/4] Done."
echo ""
echo "  App URL:  http://$VPS_IP"
echo "  Health:   http://$VPS_IP/health"
echo "  SSH:      ssh $VPS_USER@$VPS_IP"
echo "  Logs:     ssh $VPS_USER@$VPS_IP 'pm2 logs $APP_NAME'"
if [ -n "$CLEAN_ALL" ]; then
  echo ""
  echo "  (Database was reset. Admin user is created on first app start from .env.deploy."
  echo "   If needed, run init-admin on the server or log in with ADMIN_USERNAME/ADMIN_PASSWORD from .env.deploy.)"
fi
echo ""
