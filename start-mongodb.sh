#!/bin/bash
# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo "MongoDB is not installed. Installing..."
    # Try to install MongoDB
    if command -v apt-get &> /dev/null; then
        echo "Please run: sudo apt-get update && sudo apt-get install -y mongodb"
    elif command -v yum &> /dev/null; then
        echo "Please run: sudo yum install -y mongodb-server"
    else
        echo "Please install MongoDB manually from https://www.mongodb.com/try/download/community"
    fi
    exit 1
fi

# Start MongoDB
echo "Starting MongoDB..."
mkdir -p ~/mongodb-data
mongod --dbpath ~/mongodb-data --port 27017 > /dev/null 2>&1 &
MONGO_PID=$!
sleep 2

if ps -p $MONGO_PID > /dev/null; then
    echo "MongoDB started successfully (PID: $MONGO_PID)"
    echo "To stop MongoDB, run: kill $MONGO_PID"
else
    echo "Failed to start MongoDB. It may already be running."
fi
