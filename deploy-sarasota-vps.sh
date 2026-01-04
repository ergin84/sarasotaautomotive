#!/bin/bash

# Sarasota Automotive VPS Deployment Script
# Installs: Node.js, MongoDB, PostgreSQL, Nginx, PM2
# No Docker - Direct VPS deployment

set -e  # Exit on error

echo "========================================="
echo "Sarasota Automotive VPS Deployment"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="sarasota-automotive"
APP_PORT=3000
DEPLOY_USER="sarasota"
APP_DIR="/var/www/$APP_NAME"
REPO_URL="https://github.com/yourusername/sarasotaautomotive.git"  # Change this to your repo

# Functions
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

# Step 1: System Update
print_info "Step 1: Updating system packages..."
apt update
apt upgrade -y
apt install -y curl wget git build-essential supervisor

# Step 2: Node.js Installation
print_info "Step 2: Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Node.js
node --version
npm --version
print_status "Node.js installed"

# Step 3: MongoDB Installation
print_info "Step 3: Installing MongoDB..."
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /etc/apt/keyrings/mongodb-server-7.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/etc/apt/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org

# Start MongoDB
systemctl start mongod
systemctl enable mongod
systemctl status mongod --no-pager
print_status "MongoDB installed and running"

# Step 4: PostgreSQL Installation (optional, for future use)
print_info "Step 4: Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

systemctl start postgresql
systemctl enable postgresql
print_status "PostgreSQL installed"

# Step 5: Nginx Installation
print_info "Step 5: Installing Nginx..."
apt install -y nginx

systemctl start nginx
systemctl enable nginx
print_status "Nginx installed and running"

# Step 6: PM2 Global Installation
print_info "Step 6: Installing PM2 (Process Manager)..."
npm install -g pm2

# Set PM2 startup
pm2 startup systemd -u root --hp /root
print_status "PM2 installed and configured"

# Step 7: Create application directory
print_info "Step 7: Setting up application directory..."
mkdir -p $APP_DIR
cd $APP_DIR

# Step 8: Clone or copy the application
print_info "Step 8: Preparing application files..."
if [ -d ".git" ]; then
    print_info "Git repository found, pulling latest..."
    git pull origin main || git pull origin master
else
    print_info "No git repo found. Copy your app files to $APP_DIR"
    print_info "Or run: git clone $REPO_URL $APP_DIR"
fi

# Step 9: Install npm dependencies
print_info "Step 9: Installing npm dependencies..."
npm install --production

print_status "Dependencies installed"

# Step 10: Create environment file (if not exists)
if [ ! -f ".env" ]; then
    print_info "Step 10: Creating .env file..."
    cat > .env << 'EOF'
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/sarasota_automotive
NODE_ENV=production
PORT=3000

# JWT Secret (change this to a random string)
JWT_SECRET=your_jwt_secret_key_change_me_to_random_string

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@sarasotaautomotive.com

# App Configuration
APP_URL=https://yourdomain.com
APP_NAME=Sarasota Automotive

EOF
    print_status ".env file created - PLEASE CONFIGURE IT WITH YOUR SETTINGS"
else
    print_status ".env file already exists"
fi

# Step 11: Configure Nginx Reverse Proxy
print_info "Step 11: Configuring Nginx reverse proxy..."
cat > /etc/nginx/sites-available/$APP_NAME << 'NGINX_EOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }

    location /api/upload {
        proxy_pass http://localhost:3000/api/upload;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_request_buffering off;
        client_max_body_size 50M;
    }
}
NGINX_EOF

# Enable Nginx site
if [ -L /etc/nginx/sites-enabled/$APP_NAME ]; then
    rm /etc/nginx/sites-enabled/$APP_NAME
fi
ln -s /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/$APP_NAME

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
systemctl reload nginx

print_status "Nginx configured as reverse proxy"

# Step 12: Start application with PM2
print_info "Step 12: Starting application with PM2..."
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start server.js --name $APP_NAME --env production
pm2 save

print_status "Application started with PM2"

# Step 13: Setup Certbot for HTTPS (optional)
print_info "Step 13: Installing Certbot for SSL..."
apt install -y certbot python3-certbot-nginx

print_info "To enable HTTPS, run:"
echo -e "${YELLOW}certbot --nginx -d yourdomain.com${NC}"

# Step 14: Create MongoDB admin user (optional)
print_info "Step 14: Setting up MongoDB..."
print_info "To create MongoDB admin user, run:"
echo -e "${YELLOW}mongo${NC}"
echo "use admin"
echo "db.createUser({ user: 'admin', pwd: 'your_secure_password', roles: ['root'] })"

# Final Summary
echo ""
echo "========================================="
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo "========================================="
echo ""
echo "Application Status:"
pm2 status
echo ""
echo "Useful Commands:"
echo -e "  ${YELLOW}View logs:${NC} pm2 logs $APP_NAME"
echo -e "  ${YELLOW}Stop app:${NC} pm2 stop $APP_NAME"
echo -e "  ${YELLOW}Restart app:${NC} pm2 restart $APP_NAME"
echo -e "  ${YELLOW}Reload app:${NC} pm2 reload $APP_NAME"
echo -e "  ${YELLOW}Delete app:${NC} pm2 delete $APP_NAME"
echo ""
echo "Next Steps:"
echo "1. Edit .env file at: $APP_DIR/.env"
echo "2. Update JWT_SECRET with a random string"
echo "3. Configure email settings if needed"
echo "4. Setup domain with your DNS provider"
echo "5. Run: certbot --nginx -d yourdomain.com"
echo ""
echo "Access your app at: http://31.97.146.210"
echo "========================================="
