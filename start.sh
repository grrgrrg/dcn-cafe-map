#!/bin/bash

echo "🚀 Starting DCN Cafe Map..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v16+) first."
    echo "   Visit: https://nodejs.org"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create necessary directories
mkdir -p data cache images

# Check if we have cafe data
if [ ! -f "data/all-cafes.json" ]; then
    echo "📊 Sample cafe data found. Starting with test dataset."
else
    echo "📊 Cafe data found."
fi

echo "🌍 Starting server on http://localhost:3000"
echo "Press Ctrl+C to stop the server"
echo ""

npm start