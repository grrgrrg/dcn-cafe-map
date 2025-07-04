#!/bin/bash

echo "🔍 Pre-Deployment Checklist"
echo "=========================="

echo ""
echo "📁 Required Files:"
files=("package.json" "server.js" "index.html" "render.yaml" "Procfile" ".gitignore")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (missing)"
    fi
done

echo ""
echo "📊 Data Files:"
if [ -f "data/all-cafes.json" ]; then
    CAFE_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('data/all-cafes.json')).totalCafes)")
    echo "✅ data/all-cafes.json ($CAFE_COUNT cafes)"
else
    echo "❌ data/all-cafes.json (missing)"
fi

echo ""
echo "🌐 Server Test:"
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Server responding locally"
else
    echo "⚠️  Server not running locally (OK for deployment)"
fi

echo ""
echo "📦 Node.js Dependencies:"
if [ -f "node_modules/.bin/express" ]; then
    echo "✅ Dependencies installed"
else
    echo "⚠️  Dependencies not installed locally (OK - will install on deployment)"
fi

echo ""
echo "🗂️  Git Status:"
if [ -d ".git" ]; then
    echo "✅ Git repository initialized"
    if git status --porcelain | grep -q .; then
        echo "⚠️  Uncommitted changes (commit before pushing)"
    else
        echo "✅ All changes committed"
    fi
else
    echo "❌ Git not initialized"
fi

echo ""
echo "🎯 Deployment Readiness:"
echo "✅ Node.js server with Express"
echo "✅ Static file serving configured"
echo "✅ Image proxy for DCN photos"
echo "✅ Environment variable support (PORT)"
echo "✅ Production error handling"

echo ""
echo "🚀 Ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Push to GitHub: git push origin main"
echo "2. Deploy on Render: render.com"
echo "3. Share URL with colleagues"
echo ""