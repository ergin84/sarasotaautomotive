# Quick Start Guide - Sarasota Automotive Website

## MongoDB is Required

The website requires MongoDB to run. Here are your options:

### Option 1: Install MongoDB (Recommended)

**For Ubuntu/Debian:**
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository (replace jammy with your Ubuntu version if different)
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update and install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify it's running
sudo systemctl status mongod
```

### Option 2: Use Docker (If Docker is installed)

```bash
# Run MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Your .env file already points to localhost:27017, so it will work automatically
```

### Option 3: Use MongoDB Atlas (Cloud - Free)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account and cluster
3. Get your connection string
4. Update `.env` file:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sarasota_automotive
   ```

## Once MongoDB is Running:

1. **Initialize admin user:**
   ```bash
   npm run init-admin
   ```

2. **Start the server:**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   http://localhost:3000

4. **Login as admin:**
   - Username: `admin`
   - Password: `admin123`
   - (Change password after first login!)

## Troubleshooting

- **MongoDB connection refused**: Make sure MongoDB is running (`sudo systemctl status mongod`)
- **Port 3000 already in use**: Change PORT in `.env` file
- **Admin already exists**: That's fine, you can login with existing credentials


