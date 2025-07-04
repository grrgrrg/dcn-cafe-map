# DCN Cafe Map - Instructions

## To View the Map

### Option 1: Using Python Server (Recommended)
1. Open Terminal
2. Navigate to this folder: `cd /Users/gregbrown/dcn-map`
3. Run: `python3 server.py`
4. Open your browser to: http://localhost:8000
5. Press Ctrl+C in Terminal to stop the server

### Option 2: Direct File Opening
Simply double-click `index.html` to open in your browser.
Note: This may show placeholder images instead of actual cafe photos.

## Features

- **20 cafe locations** from recent Daily Coffee News articles
- Click any marker to see:
  - Cafe name and address
  - Article excerpt in quotes
  - Link to full DCN article
- Map automatically fits all cafes in view
- Responsive design for mobile/desktop

## Adding More Cafes

1. Edit `extended-cafes.json`
2. Add new cafe entries with:
   - name, address, latitude, longitude
   - snippet (article excerpt)
   - articleUrl (link to DCN article)
   - imageUrl (path to image in images/ folder)

## Getting Real Images

The Python scraper (`fetch-all-cafes.py`) can download actual images from DCN articles. To use it:
1. Install Python packages: `pip3 install requests beautifulsoup4`
2. Run: `python3 fetch-all-cafes.py`

## Customization

- Edit `styles.css` to change colors/design
- Edit `map.js` to change map behavior
- Replace placeholder images in `images/` folder with real photos