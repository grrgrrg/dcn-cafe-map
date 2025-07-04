# Daily Coffee News Cafe Map

An interactive map displaying new cafe openings featured on Daily Coffee News, with comprehensive search, filtering, and image display capabilities.

## 🚀 Features

- **Interactive Map**: Display hundreds of cafe locations across the US
- **Real Images**: Proxy-based image loading to reliably display cafe photos from DCN
- **Search & Filter**: Search by cafe name or location, filter by state
- **Pagination**: Handle large datasets with efficient pagination
- **Image Caching**: Server-side image optimization and caching
- **Responsive Design**: Works on desktop and mobile devices
- **Professional Styling**: Matches Daily Coffee News branding

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm

## 🛠️ Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```

3. **Open in Browser**
   Visit http://localhost:3000

## 📊 Data Management

### Fetch All Cafe Data

To get the complete backlog of cafe openings from Daily Coffee News:

```bash
npm run fetch-data
```

This will:
- Scrape all articles from the cafe openings category
- Extract cafe names, addresses, snippets, and images
- Save results to `data/all-cafes.json`

### Geocode Addresses

Convert addresses to latitude/longitude coordinates:

```bash
npm run geocode
```

This will:
- Use OpenStreetMap's Nominatim API (free, rate-limited)
- Add coordinates to all cafes in the dataset
- Update success/failure statistics

## 🗂️ File Structure

```
dcn-map/
├── server.js              # Express server with image proxy
├── map.js                 # Frontend map application
├── index.html             # Main HTML page
├── styles.css             # Custom CSS styling
├── package.json           # Dependencies and scripts
├── data/
│   └── all-cafes.json     # Cafe dataset with coordinates
├── cache/                 # Cached/optimized images
├── scripts/
│   ├── fetch-all-cafes.js # DCN scraper
│   └── geocode-addresses.js # Geocoding service
└── README.md              # This file
```

## 🎨 Customization

### Styling
Edit `styles.css` to modify:
- Color scheme (currently matches DCN branding)
- Typography (uses DCN fonts)
- Layout and spacing

### Map Behavior
Edit `map.js` to change:
- Default map center and zoom
- Marker styles and popup content
- Search and filter logic

### Data Sources
- The scraper in `scripts/fetch-all-cafes.js` can be modified to target different DCN categories
- Geocoding service can be switched to Google Maps API for better accuracy

## 🔧 API Endpoints

### `/api/cafes`
Get paginated cafe data
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50)
- `search`: Search term for name/address
- `state`: Filter by state

### `/api/image-proxy`
Proxy and cache images from DCN
- `url`: Image URL to proxy

### `/api/health`
Health check endpoint

## 🌍 Image Handling

The application uses a sophisticated image proxy system to solve CORS issues:

1. **Proxy**: Images are fetched server-side from DCN
2. **Optimization**: Images are resized and compressed using Sharp
3. **Caching**: Processed images are cached locally
4. **Fallback**: Placeholder shown if image fails to load

## 📱 Responsive Design

- **Desktop**: Full-featured interface with all controls
- **Mobile**: Optimized layout with touch-friendly controls
- **Tablet**: Balanced layout for medium screens

## 🔍 Search & Filtering

- **Text Search**: Searches cafe names and addresses
- **State Filter**: Dropdown populated from current dataset
- **Real-time**: Search updates as you type (with debouncing)
- **Clear Filters**: Reset all filters with one click

## 📄 Pagination

- **Configurable**: 25, 50, 100, or all cafes per page
- **Navigation**: Previous/Next buttons with page indicators
- **Smart Display**: Pagination hidden when not needed

## 🚨 Troubleshooting

### No cafes displayed
1. Check that `data/all-cafes.json` exists
2. Run `npm run fetch-data` to get fresh data
3. Check browser console for errors

### Images not loading
1. Verify the image proxy is working: `/api/image-proxy?url=TEST_URL`
2. Check `cache/` directory for cached images
3. Ensure Sharp is properly installed

### Geocoding failures
1. Check internet connection
2. Verify Nominatim API is accessible
3. Some addresses may not be geocodable

## 📈 Performance

- **Image Optimization**: Sharp reduces image sizes by ~60%
- **Caching**: Images cached indefinitely once processed
- **Pagination**: Only loads visible cafes
- **Debounced Search**: Reduces API calls during typing

## 🤝 Contributing

To add new features:
1. Fork the repository
2. Create a feature branch
3. Test thoroughly
4. Submit a pull request

## 📝 License

MIT License - feel free to use and modify for your own projects.

## 🆘 Support

For issues or questions:
1. Check this README first
2. Look at browser console for errors
3. Verify all dependencies are installed
4. Check that the server is running properly

---

Built with ❤️ for the coffee community