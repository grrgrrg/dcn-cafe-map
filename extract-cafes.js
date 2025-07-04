const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';
const DELAY_MS = 1000; // Respect Nominatim's rate limit

async function geocodeAddress(address) {
    const params = new URLSearchParams({
        q: address,
        format: 'json',
        limit: 1,
        countrycodes: 'us'
    });
    
    try {
        const response = await fetch(`${NOMINATIM_API}?${params}`, {
            headers: {
                'User-Agent': 'DCN-Cafe-Map/1.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon)
            };
        }
        
        console.warn(`No coordinates found for address: ${address}`);
        return null;
        
    } catch (error) {
        console.error(`Error geocoding address "${address}":`, error);
        return null;
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractCafeData() {
    const cafesToGeocode = [
        {
            name: "Example Cafe 1",
            address: "123 Main St, Seattle, WA",
            snippet: "A new coffee shop in Seattle...",
            articleUrl: "https://example.com/article1",
            imageUrl: "https://example.com/image1.jpg",
            date: "2025-07-01"
        }
    ];
    
    const geocodedCafes = [];
    
    for (let i = 0; i < cafesToGeocode.length; i++) {
        const cafe = cafesToGeocode[i];
        console.log(`Geocoding ${i + 1}/${cafesToGeocode.length}: ${cafe.name}`);
        
        const coords = await geocodeAddress(cafe.address);
        
        if (coords) {
            geocodedCafes.push({
                ...cafe,
                latitude: coords.latitude,
                longitude: coords.longitude
            });
        }
        
        if (i < cafesToGeocode.length - 1) {
            await sleep(DELAY_MS);
        }
    }
    
    const output = {
        cafes: geocodedCafes,
        lastUpdated: new Date().toISOString().split('T')[0]
    };
    
    console.log(JSON.stringify(output, null, 2));
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { geocodeAddress, extractCafeData };
}