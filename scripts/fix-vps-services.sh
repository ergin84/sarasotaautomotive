#!/bin/bash
# EMERGENCY/REPAIR ONLY: fix services on VPS when app is broken (e.g. PM2 stopped, node_modules missing).
# For normal deploy use ONE command:  ./deploy.sh   or   ./deploy-sarasota-187.sh
#
# Run on VPS:  ssh root@187.124.225.101 'bash -s' < scripts/fix-vps-services.sh

set -e
# Ensure Node/npm are on PATH (tarball, NodeSource, nvm)
export PATH="/usr/local/bin:/usr/local/lib/nodejs/bin:/usr/bin:/bin:$PATH"
[ -s "/root/.nvm/nvm.sh" ] && . "/root/.nvm/nvm.sh"
for p in /root/.nvm/versions/node/*/bin; do [ -d "$p" ] && PATH="$p:$PATH"; done

APP_DIR="${APP_DIR:-/var/www/sarasota_automotive}"
APP_NAME="${APP_NAME:-sarasota-automotive}"

cd "$APP_DIR"

echo "Ensuring MongoDB is installed and running..."
if ! command -v mongod >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y gnupg curl
  if [ ! -f /usr/share/keyrings/mongodb-server-7.0.gpg ]; then
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
  fi
  if [ ! -f /etc/apt/sources.list.d/mongodb-org-7.0.list ]; then
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list
  fi
  apt-get update -qq
  apt-get install -y mongodb-org
  systemctl enable mongod
fi
systemctl start mongod 2>/dev/null || systemctl start mongodb 2>/dev/null || true
systemctl enable mongod 2>/dev/null || systemctl enable mongodb 2>/dev/null || true
sleep 2

echo "Installing Node.js if needed..."
if ! command -v npm >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y curl
  if curl -fsSL https://deb.nodesource.com/setup_22.x | bash - 2>/dev/null; then
    apt-get install -y nodejs
  else
    echo "NodeSource failed; installing from official tarball..."
    NODE_VERSION="v22.12.0"
    cd /usr/local/src 2>/dev/null || (mkdir -p /usr/local/src && cd /usr/local/src)
    curl -fsSLO "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.xz"
    tar -xf "node-${NODE_VERSION}-linux-x64.tar.xz"
    rm -rf /usr/local/lib/nodejs
    mv "node-${NODE_VERSION}-linux-x64" /usr/local/lib/nodejs
    ln -sf /usr/local/lib/nodejs/bin/node /usr/local/bin/node
    ln -sf /usr/local/lib/nodejs/bin/npm /usr/local/bin/npm
    ln -sf /usr/local/lib/nodejs/bin/npx /usr/local/bin/npx
    cd "$APP_DIR"
  fi
  export PATH="/usr/local/bin:/usr/local/lib/nodejs/bin:$PATH"
fi
node --version
npm --version

echo "Installing PM2 if needed..."
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi
PM2_BIN=$(command -v pm2)

echo "Checking .env..."
if [ ! -f "$APP_DIR/.env" ]; then
  echo "WARNING: $APP_DIR/.env missing. Copy .env.deploy to server as .env or redeploy."
fi
[ -f "$APP_DIR/.env" ] && grep -q MONGODB_URI "$APP_DIR/.env" && grep -q JWT_SECRET "$APP_DIR/.env" || echo "WARNING: .env should contain MONGODB_URI and JWT_SECRET"

echo "Installing production dependencies (node_modules)..."
cd "$APP_DIR"
npm ci --omit=dev 2>/dev/null || npm install --production

echo "Starting app with PM2 (cwd=$APP_DIR)..."
"$PM2_BIN" delete "$APP_NAME" 2>/dev/null || true
cd "$APP_DIR"
"$PM2_BIN" start server.js --name "$APP_NAME" --cwd "$APP_DIR" --env production
"$PM2_BIN" save
"$PM2_BIN" startup systemd -u root --hp /root 2>/dev/null | tail -1 || true

echo "Ensuring Nginx is installed and running..."
if ! command -v nginx >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y nginx
fi
# Write Nginx config for the app
cat >/etc/nginx/sites-available/sarasota-automotive.conf <<'NGINX_CONF'
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
NGINX_CONF
ln -sf /etc/nginx/sites-available/sarasota-automotive.conf /etc/nginx/sites-enabled/sarasota-automotive.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t 2>/dev/null || true
systemctl enable nginx 2>/dev/null || true
systemctl start nginx 2>/dev/null || true
systemctl restart nginx 2>/dev/null || true

echo "Restarting app so it connects to MongoDB..."
"$PM2_BIN" restart "$APP_NAME" --update-env 2>/dev/null || (cd "$APP_DIR" && "$PM2_BIN" start server.js --name "$APP_NAME" --cwd "$APP_DIR" --env production)
"$PM2_BIN" save
sleep 2

echo "Done. PM2 status:"
"$PM2_BIN" status
echo ""
echo "Services: nginx=$(systemctl is-active nginx 2>/dev/null || echo '?'); mongod=$(systemctl is-active mongod 2>/dev/null || systemctl is-active mongodb 2>/dev/null || echo '?')"
echo "If app status is 'stopped', run: ssh root@187.124.225.101 'pm2 logs sarasota-automotive --lines 30'"
