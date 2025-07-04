#!/bin/bash

# Create placeholder images for demo
echo "Creating placeholder images..."

# Create a simple SVG placeholder
cat > images/placeholder.svg <<EOF
<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="300" fill="#f0f0f0"/>
  <text x="200" y="150" font-family="Arial" font-size="20" fill="#999" text-anchor="middle">
    Cafe Image
  </text>
</svg>
EOF

# Copy placeholder for each cafe
for cafe in "obscure-coffee-roasters" "hb-gold-bar" "watchhouse-coffee" "la-venta-cafe" "slow-haste-coffee" "union-market" "mad-cap-coffee" "prototype-coffee" "comet-coffee" "steadfast-coffee"; do
    cp images/placeholder.svg "images/${cafe}.jpg"
done

echo "✅ Created placeholder images in images/"