const express = require('express');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const NodeCache = require('node-cache');
const crypto = require('crypto');

// Try to load Sharp, but make it optional
let sharp;
try {
    sharp = require('sharp');
    console.log('📸 Sharp image processing available');
} catch (error) {
    console.log('⚠️  Sharp not available, using basic image proxy');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Cache for 24 hours
const cache = new NodeCache({ stdTTL: 86400 });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Ensure directories exist (only if writable)
try {
    fs.ensureDirSync('./images');
    fs.ensureDirSync('./cache');
} catch (error) {
    console.log('⚠️ Cache directories not writable, using memory cache only');
}

// Image proxy endpoint - this solves CORS issues
app.get('/api/image-proxy', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL parameter required' });
    }
    
    try {
        // Create hash of URL for caching
        const urlHash = crypto.createHash('md5').update(url).digest('hex');
        const cachedPath = path.join('./cache', `${urlHash}.jpg`);
        
        // Check if image is already cached
        if (await fs.pathExists(cachedPath)) {
            console.log(`Serving cached image: ${urlHash}`);
            return res.sendFile(path.resolve(cachedPath));
        }
        
        console.log(`Fetching image: ${url}`);
        
        // Fetch image from DCN with proper headers
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Referer': 'https://dailycoffeenews.com/',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 15000,
            maxRedirects: 5
        });
        
        console.log(`Image response status: ${response.status}`);
        
        // Set response headers immediately
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        if (sharp) {
            // Process and stream the image with Sharp
            const transformer = sharp()
                .jpeg({ quality: 85, progressive: true })
                .resize(400, 300, { 
                    fit: 'cover',
                    position: 'center'
                })
                .on('error', (err) => {
                    console.error('Sharp processing error:', err);
                    // If Sharp fails, try to serve original image
                    response.data.pipe(res);
                });
            
            // Save to cache in the background
            const cacheStream = fs.createWriteStream(cachedPath);
            response.data.pipe(sharp().jpeg({ quality: 85 }).resize(400, 300, { fit: 'cover' })).pipe(cacheStream);
            
            // Stream to response
            response.data.pipe(transformer).pipe(res);
        } else {
            // Basic proxy without processing
            try {
                const cacheStream = fs.createWriteStream(cachedPath);
                response.data.pipe(cacheStream);
            } catch (cacheError) {
                console.log('Cache write failed, serving direct stream');
            }
            response.data.pipe(res);
        }
        
    } catch (error) {
        console.error('Image proxy error:', error.message);
        
        // Try to serve a simple placeholder
        if (sharp) {
            try {
                // Create a simple colored rectangle as placeholder
                const placeholder = await sharp({
                    create: {
                        width: 400,
                        height: 300,
                        channels: 3,
                        background: { r: 240, g: 240, b: 240 }
                    }
                })
                .png()
                .toBuffer();
                
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Cache-Control', 'public, max-age=3600');
                res.send(placeholder);
                
            } catch (placeholderError) {
                console.error('Placeholder creation failed:', placeholderError);
                res.status(404).json({ error: 'Image not found' });
            }
        } else {
            res.status(404).json({ error: 'Image not found' });
        }
    }
});

// API endpoint for cafe data
app.get('/api/cafes', async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '', state = '' } = req.query;
        
        // Load cafe data
        let cafes = [];
        if (await fs.pathExists('./data/all-cafes.json')) {
            const data = await fs.readJson('./data/all-cafes.json');
            cafes = data.cafes || [];
        }
        
        // Filter cafes
        let filteredCafes = cafes;
        
        if (search) {
            filteredCafes = filteredCafes.filter(cafe => 
                cafe.name.toLowerCase().includes(search.toLowerCase()) ||
                cafe.address.toLowerCase().includes(search.toLowerCase())
            );
        }
        
        if (state) {
            filteredCafes = filteredCafes.filter(cafe => 
                cafe.address.toLowerCase().includes(state.toLowerCase())
            );
        }
        
        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedCafes = filteredCafes.slice(startIndex, endIndex);
        
        res.json({
            cafes: paginatedCafes,
            totalCafes: filteredCafes.length,
            totalPages: Math.ceil(filteredCafes.length / limit),
            currentPage: parseInt(page),
            hasMore: endIndex < filteredCafes.length
        });
        
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: 'Failed to load cafe data' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
    });
});

// Simple test route
app.get('/test', (req, res) => {
    res.send('Server is working! Modern DCN Cafe Map is ready.');
});

app.listen(PORT, () => {
    console.log(`🚀 DCN Cafe Map Server running on http://localhost:${PORT}`);
    console.log(`📷 Image proxy available at /api/image-proxy?url=IMAGE_URL`);
    console.log(`☕ Cafe API available at /api/cafes`);
});