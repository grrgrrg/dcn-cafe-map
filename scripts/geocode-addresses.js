const axios = require('axios');
const fs = require('fs-extra');

class GeocodeService {
    constructor() {
        this.nominatimUrl = 'https://nominatim.openstreetmap.org/search';
        this.delay = 1000; // 1 second delay between requests (Nominatim rate limit)
        this.headers = {
            'User-Agent': 'DCN-Cafe-Map/1.0 (https://dailycoffeenews.com)'
        };
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async geocodeAddress(address) {
        try {
            const params = {
                q: address,
                format: 'json',
                limit: 1,
                countrycodes: 'us',
                addressdetails: 1
            };

            console.log(`🗺️  Geocoding: ${address}`);
            
            const response = await axios.get(this.nominatimUrl, {
                params: params,
                headers: this.headers,
                timeout: 10000
            });

            if (response.data && response.data.length > 0) {
                const result = response.data[0];
                return {
                    latitude: parseFloat(result.lat),
                    longitude: parseFloat(result.lon),
                    displayName: result.display_name,
                    confidence: result.importance || 0
                };
            }

            console.log(`❌ No coordinates found for: ${address}`);
            return null;

        } catch (error) {
            console.error(`❌ Geocoding error for "${address}":`, error.message);
            return null;
        }
    }

    async geocodeAllCafes() {
        console.log('🚀 Starting geocoding process...');

        try {
            // Load cafe data
            const dataPath = './data/all-cafes.json';
            if (!await fs.pathExists(dataPath)) {
                throw new Error('Cafe data not found. Run fetch-all-cafes.js first.');
            }

            const data = await fs.readJson(dataPath);
            const cafes = data.cafes || [];
            
            console.log(`📍 Found ${cafes.length} cafes to geocode`);

            let successCount = 0;
            let failureCount = 0;

            // Process each cafe
            for (let i = 0; i < cafes.length; i++) {
                const cafe = cafes[i];
                
                console.log(`\n${i + 1}/${cafes.length}: ${cafe.name}`);
                
                // Skip if already has coordinates
                if (cafe.latitude && cafe.longitude) {
                    console.log('✅ Already has coordinates, skipping');
                    successCount++;
                    continue;
                }

                // Geocode the address
                const coords = await this.geocodeAddress(cafe.address);
                
                if (coords) {
                    cafe.latitude = coords.latitude;
                    cafe.longitude = coords.longitude;
                    cafe.geocoded = true;
                    cafe.geocodeConfidence = coords.confidence;
                    successCount++;
                    console.log(`✅ Success: ${coords.latitude}, ${coords.longitude}`);
                } else {
                    cafe.geocoded = false;
                    failureCount++;
                    console.log(`❌ Failed to geocode`);
                }

                // Rate limiting
                await this.sleep(this.delay);
            }

            // Update the data with geocoded results
            data.geocodingStats = {
                total: cafes.length,
                success: successCount,
                failures: failureCount,
                successRate: `${((successCount / cafes.length) * 100).toFixed(1)}%`,
                lastGeocodedAt: new Date().toISOString()
            };

            // Save updated data
            await fs.writeJson(dataPath, data, { spaces: 2 });

            console.log('\n🎉 Geocoding complete!');
            console.log(`✅ Successfully geocoded: ${successCount} cafes`);
            console.log(`❌ Failed to geocode: ${failureCount} cafes`);
            console.log(`📈 Success rate: ${data.geocodingStats.successRate}`);
            console.log(`💾 Updated data saved to ${dataPath}`);

            return data;

        } catch (error) {
            console.error('❌ Geocoding failed:', error);
            throw error;
        }
    }

    async geocodeSingleCafe(address) {
        return await this.geocodeAddress(address);
    }
}

// Run if called directly
if (require.main === module) {
    const geocoder = new GeocodeService();
    geocoder.geocodeAllCafes()
        .then(result => {
            console.log('\n✨ All done!');
        })
        .catch(error => {
            console.error('\n💥 Geocoding failed:', error);
            process.exit(1);
        });
}

module.exports = GeocodeService;