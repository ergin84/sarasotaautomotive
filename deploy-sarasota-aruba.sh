#!/bin/bash

# Sarasota Automotive - Deployment Script for Aruba VPS
# Target VPS: 5.249.148.18
# Usage: ./deploy-sarasota-aruba.sh

set -euo pipefail

APP_NAME="sarasota-automotive"
VPS_IP="5.249.148.18"
VPS_USER="root"
REMOTE_DIR="/var/www/sarasota_automotive"
ENV_FILE=".env.deploy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Starting deploy of ${APP_NAME} to Aruba VPS (${VPS_IP})..."

# Ensure deploy env file exists
if [ ! -f "$ENV_FILE" ]; then
  cat <<'EOF'
⚠️  Missing .env.deploy file!
    - Duplicate .env.deploy.example (or create one) as .env.deploy
    - Fill it with production values (Mongo URI, JWT secret, admin creds, etc.)
    - Re-run this script
EOF
  exit 1
fi

echo "📝 Loading environment variables from ${ENV_FILE}..."
set -a
source "$ENV_FILE"
set +a
echo "   ✅ Environment loaded"

# Basic sanity check
if [ ! -f "package.json" ]; then
  echo "❌ package.json not found. Run this script from the project root."
  exit 1
fi

echo "🏗️  Installing local dependencies (dev included) to verify lockfile..."
npm install --include=dev

echo "📦 Preparing deployment bundle..."
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "   • Staging directory: $TEMP_DIR"
echo "   • Copying project files..."
rsync -av \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.DS_Store' \
  --exclude 'logs' \
  --exclude 'tmp' \
  --exclude '*.log' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.env.production' \
  --exclude '.env.deploy' \
  --exclude 'public/uploads' \
  ./ "$TEMP_DIR"/

echo "   • Embedding production env file (.env.production)..."
cp "$ENV_FILE" "$TEMP_DIR/.env.production"
chmod 600 "$TEMP_DIR/.env.production"

echo "📤 Ensuring remote host is reachable..."
ssh -o StrictHostKeyChecking=accept-new "$VPS_USER@$VPS_IP" "mkdir -p $REMOTE_DIR && mkdir -p /var/backups/${APP_NAME}"

echo "💾 Creating safe backup on VPS (if previous release exists)..."
ssh -o StrictHostKeyChecking=accept-new "$VPS_USER@$VPS_IP" "if [ -d '$REMOTE_DIR' ] && [ \"\$(ls -A $REMOTE_DIR 2>/dev/null)\" ]; then tar -czf /var/backups/${APP_NAME}/${APP_NAME}_backup_${TIMESTAMP}.tar.gz -C $REMOTE_DIR . 2>/dev/null || true; fi"

echo "🚚 Uploading build to VPS..."
rsync -avz --delete \
  --exclude 'public/uploads' \
  -e "ssh -o StrictHostKeyChecking=accept-new" \
  "$TEMP_DIR"/ "$VPS_USER@$VPS_IP:$REMOTE_DIR/"

echo "🛠️  Running remote setup on VPS..."
ssh -o StrictHostKeyChecking=accept-new "$VPS_USER@$VPS_IP" <<ENDSSH
set -e
cd "$REMOTE_DIR"

echo "📁 Ensuring uploads directory persists..."
mkdir -p public/uploads

if [ -f ".env.production" ]; then
  mv .env.production .env
  chmod 600 .env
  echo "   ✅ .env updated"
fi

echo "🔍 Checking Node.js..."
if ! command -v node >/dev/null 2>&1; then
  NODE_VERSION="\${NODE_VERSION:-v20.18.1}"
  install_node_from_tarball() {
    echo "📦 Installing Node.js \${NODE_VERSION} from nodejs.org tarball..."
    mkdir -p /usr/local/src
    cd /usr/local/src
    local TAR="node-\${NODE_VERSION}-linux-x64.tar.xz"
    if [ ! -f "\$TAR" ]; then
      echo "   Downloading \${TAR}..."
      curl -fsSLO "https://nodejs.org/dist/\${NODE_VERSION}/\${TAR}" || return 1
    fi
    tar -xf "\$TAR"
    rm -rf /usr/local/lib/nodejs
    mv "node-\${NODE_VERSION}-linux-x64" /usr/local/lib/nodejs
    ln -sf /usr/local/lib/nodejs/bin/node /usr/local/bin/node
    ln -sf /usr/local/lib/nodejs/bin/npm /usr/local/bin/npm
    ln -sf /usr/local/lib/nodejs/bin/npx /usr/local/bin/npx
    cd "\$REMOTE_DIR"
    echo "✅ Node.js \${NODE_VERSION} installed from tarball."
  }

  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y curl
  if curl -fsSL https://deb.nodesource.com/setup_20.x | bash -; then
    apt-get install -y nodejs || install_node_from_tarball
  else
    echo "⚠️ NodeSource unavailable, attempting official tarball..."
    install_node_from_tarball || apt-get install -y nodejs
  fi
fi

if ! command -v node >/dev/null 2>&1; then
  echo "⚠️ Node.js still missing; forcing tarball install."
  install_node_from_tarball
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "⚠️ npm not found; installing via apt."
  apt-get update -qq
  apt-get install -y npm
fi

node --version
npm --version

echo "🗄️  Ensuring MongoDB Server..."
if ! command -v mongod >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y gnupg curl
  if [ ! -f /usr/share/keyrings/mongodb-server-7.0.gpg ]; then
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
      gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
  fi
  if [ ! -f /etc/apt/sources.list.d/mongodb-org-7.0.list ]; then
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" \
      > /etc/apt/sources.list.d/mongodb-org-7.0.list
  fi
  apt-get update -qq
  apt-get install -y mongodb-org
  systemctl enable mongod
fi
systemctl restart mongod

echo "📦 Installing production dependencies..."
npm ci --omit=dev || npm install --production

echo "🔐 Setting permissions..."
chown -R www-data:www-data "$REMOTE_DIR" || true
chmod -R 755 "$REMOTE_DIR"
chmod 775 public/uploads

echo "▶️  Configuring PM2 process manager..."
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

pm2 restart "$APP_NAME" 2>/dev/null || pm2 start npm --name "$APP_NAME" -- start
pm2 save
pm2 startup systemd -u "$VPS_USER" --hp /home/"$VPS_USER" | grep -v PM2 || true

echo "🌐 Configuring Nginx reverse proxy..."
if ! command -v nginx >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y nginx
fi

cat >/etc/nginx/sites-available/${APP_NAME}.conf <<NGINX_CONF
server {
    listen 80;
    server_name 5.249.148.18;

    access_log /var/log/nginx/${APP_NAME}_access.log;
    error_log  /var/log/nginx/${APP_NAME}_error.log;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /health {
        access_log off;
        default_type text/plain;
        return 200 "healthy\n";
    }

    client_max_body_size 50M;
}
NGINX_CONF

ln -sf /etc/nginx/sites-available/${APP_NAME}.conf /etc/nginx/sites-enabled/${APP_NAME}.conf
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl restart nginx

echo "🛡️  Updating firewall (UFW)..."
if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp || true
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
fi

echo "✅ Remote setup completed."
ENDSSH

echo ""
echo "🎉 Deploy completed successfully!"
echo "   - SSH: $VPS_USER@$VPS_IP"
echo "   - Directory: $REMOTE_DIR"
echo "   - Public URL (temporary): http://$VPS_IP"
echo "   - Health check: http://$VPS_IP/health"
echo ""

