#!/bin/bash

echo "🔍 DCN Cafe Map Status Check"
echo "================================="

echo ""
echo "📊 Data Status:"
if [ -f "data/all-cafes.json" ]; then
    CAFE_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('data/all-cafes.json')).totalCafes)")
    echo "✅ Cafe data exists: $CAFE_COUNT cafes"
else
    echo "❌ No cafe data found"
fi

echo ""
echo "🌐 Server Status:"
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Server running on http://localhost:3000"
else
    echo "❌ Server not responding"
fi

echo ""
echo "🗺️ API Status:"
if curl -s http://localhost:3000/api/cafes > /dev/null; then
    echo "✅ Cafe API working"
else
    echo "❌ Cafe API not working"
fi

echo ""
echo "🎯 Ready to View:"
echo "Open your browser to: http://localhost:3000"
echo ""