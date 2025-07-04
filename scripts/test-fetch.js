const DCNComprehensiveFetcher = require('./fetch-all-cafes.js');

async function testFetch() {
    const fetcher = new DCNComprehensiveFetcher();
    
    // Test with known article URLs
    const testUrls = [
        'https://dailycoffeenews.com/2025/07/03/obscure-coffee-roasters-shines-a-light-on-puerto-rican-coffee-in-brooklyn/',
        'https://dailycoffeenews.com/2025/07/01/experimental-hogg-batch-coffee-shines-in-st-pete-at-the-hb-gold-bar/',
        'https://dailycoffeenews.com/2025/06/26/new-yorks-iconic-chrysler-building-now-houses-a-watchhouse/',
        'https://dailycoffeenews.com/2025/06/19/la-venta-cafe-completes-farm-to-cup-connection-from-colombia-to-dubuque/',
        'https://dailycoffeenews.com/2025/06/18/slow-haste-coffee-off-to-fast-start-with-laidback-portland-bar/'
    ];
    
    console.log('🧪 Testing cafe data extraction...');
    
    const cafes = [];
    for (let i = 0; i < testUrls.length; i++) {
        const url = testUrls[i];
        console.log(`\n${i + 1}/${testUrls.length}: Processing ${url}`);
        
        try {
            const cafeData = await fetcher.extractCafeData(url);
            if (cafeData) {
                cafes.push(cafeData);
                console.log(`✅ Extracted: ${cafeData.name} at ${cafeData.address}`);
            } else {
                console.log('❌ Failed to extract data');
            }
            
            // Wait between requests
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
        }
    }
    
    console.log(`\n🎉 Test complete! Extracted ${cafes.length} cafes`);
    
    // Save test results
    const fs = require('fs-extra');
    const output = {
        cafes: cafes,
        totalCafes: cafes.length,
        lastUpdated: new Date().toISOString(),
        source: 'manual-test'
    };
    
    await fs.ensureDir('./data');
    await fs.writeJson('./data/test-cafes.json', output, { spaces: 2 });
    console.log('💾 Saved test results to ./data/test-cafes.json');
    
    return cafes;
}

if (require.main === module) {
    testFetch().catch(console.error);
}

module.exports = testFetch;