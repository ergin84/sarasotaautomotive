#!/bin/bash

# Upload Sarasota App to VPS Script
# This script uploads the application files to the VPS

VPS_IP="31.97.146.210"
VPS_USER="root"
APP_DIR="/var/www/sarasota-automotive"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

# Check if .env exists locally
if [ ! -f ".env" ]; then
    print_error ".env file not found in current directory"
    echo "Creating .env with default values..."
    cat > .env << 'EOF'
MONGODB_URI=mongodb://localhost:27017/sarasota_automotive
NODE_ENV=production
PORT=3000
JWT_SECRET=your_jwt_secret_key_change_me_to_random_string
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@sarasotaautomotive.com
APP_URL=https://yourdomain.com
APP_NAME=Sarasota Automotive
EOF
    print_info "Please edit .env file with your settings"
fi

print_info "Preparing to upload to VPS: $VPS_IP"
echo ""

# Create remote directory
print_info "Creating remote directory..."
ssh $VPS_USER@$VPS_IP "mkdir -p $APP_DIR" || {
    print_error "Failed to create remote directory"
    exit 1
}

# Create temporary exclude file for rsync
EXCLUDE_FILE="/tmp/rsync_exclude_$RANDOM"
cat > $EXCLUDE_FILE << 'EXCLUDE_EOF'
node_modules/
.git/
uploads/
.DS_Store
*.log
dist/
.next/
.gitignore
.gitattributes
docker-compose.yml
Dockerfile
EXCLUDE_EOF

# Upload files using rsync
print_info "Uploading application files..."
rsync -avz \
    --exclude-from=$EXCLUDE_FILE \
    ./ \
    $VPS_USER@$VPS_IP:$APP_DIR/ || {
    print_error "Upload failed"
    rm -f $EXCLUDE_FILE
    exit 1
}

# Clean up exclude file
rm -f $EXCLUDE_FILE

print_status "Files uploaded successfully"

# Upload deployment script
print_info "Uploading deployment scripts..."
scp deploy-sarasota-vps.sh manage-server.sh $VPS_USER@$VPS_IP:$APP_DIR/ || {
    print_error "Failed to upload deploy scripts"
    exit 1
}

print_status "Deployment script uploaded"

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Upload Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. SSH into VPS:"
echo "   ${YELLOW}ssh root@$VPS_IP${NC}"
echo ""
echo "2. Run deployment script:"
echo "   ${YELLOW}cd $APP_DIR${NC}"
echo "   ${YELLOW}bash deploy-sarasota-vps.sh${NC}"
echo ""
echo "3. Configure .env:"
echo "   ${YELLOW}nano $APP_DIR/.env${NC}"
echo ""
echo "4. Restart app:"
echo "   ${YELLOW}pm2 restart sarasota-automotive${NC}"
echo ""
