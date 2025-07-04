const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');

class HybridDataBuilder {
    constructor() {
        this.baseUrl = 'https://dailycoffeenews.com';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        };
    }

    async findCafeArticleUrls() {
        console.log('🔍 Finding cafe article URLs...');
        
        const urls = new Set();
        
        // Method 1: Recent articles from main category page
        try {
            const categoryUrl = 'https://dailycoffeenews.com/category/cafe/openings-cafe/';
            console.log(`Checking category: ${categoryUrl}`);
            
            for (let page = 1; page <= 5; page++) {
                const pageUrl = page === 1 ? categoryUrl : `${categoryUrl}page/${page}/`;
                
                try {
                    const response = await axios.get(pageUrl, { headers: this.headers });
                    const $ = cheerio.load(response.data);
                    
                    // Look for article links
                    $('a[href*="dailycoffeenews.com"]').each((i, elem) => {
                        const href = $(elem).attr('href');
                        if (href && (href.includes('/2025/') || href.includes('/2024/'))) {
                            const title = $(elem).text().trim();
                            if (title && this.isCafeRelated(title)) {
                                urls.add(href);
                            }
                        }
                    });
                    
                    await this.sleep(1000);
                } catch (error) {
                    console.log(`Page ${page} failed: ${error.message}`);
                    break;
                }
            }
        } catch (error) {
            console.error('Category page method failed:', error.message);
        }

        // Method 2: Search for cafe terms
        const searchTerms = [
            'cafe+opens', 'coffee+shop+opens', 'roastery+opens', 
            'new+cafe', 'coffee+opens', 'debut', 'launches'
        ];

        for (const term of searchTerms) {
            try {
                const searchUrl = `${this.baseUrl}/?s=${term}`;
                console.log(`Searching: ${term}`);
                
                const response = await axios.get(searchUrl, { headers: this.headers });
                const $ = cheerio.load(response.data);
                
                $('a[href*="dailycoffeenews.com"]').each((i, elem) => {
                    const href = $(elem).attr('href');
                    const title = $(elem).text().trim();
                    
                    if (href && (href.includes('/2025/') || href.includes('/2024/')) && 
                        title && this.isCafeRelated(title)) {
                        urls.add(href);
                    }
                });
                
                await this.sleep(2000);
            } catch (error) {
                console.error(`Search for ${term} failed:`, error.message);
            }
        }

        const uniqueUrls = Array.from(urls).slice(0, 100); // Limit for practicality
        console.log(`\n📊 Found ${uniqueUrls.length} potential cafe article URLs`);
        
        return uniqueUrls;
    }

    isCafeRelated(title) {
        const keywords = [
            'cafe', 'coffee', 'roaster', 'roastery', 'shop', 
            'opens', 'opening', 'debut', 'launch', 'arrives', 
            'new', 'first', 'expands', 'expansion'
        ];
        
        const titleLower = title.toLowerCase();
        return keywords.some(keyword => titleLower.includes(keyword));
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    generateExtractionTemplate(urls) {
        console.log('\n📋 MANUAL EXTRACTION TEMPLATE');
        console.log('========================================');
        console.log('For each URL below, visit the page and extract:');
        console.log('1. Cafe name');
        console.log('2. Full address');
        console.log('3. Main image URL (right-click -> copy image address)');
        console.log('4. A good quote from the article');
        console.log('');
        
        const template = urls.slice(0, 20).map((url, index) => {
            return {
                url: url,
                order: index + 1,
                name: "", // TO FILL
                address: "", // TO FILL  
                imageUrl: "", // TO FILL
                snippet: "", // TO FILL
                date: this.extractDateFromUrl(url),
                articleUrl: url
            };
        });

        return template;
    }

    extractDateFromUrl(url) {
        const match = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
        if (match) {
            return `${match[1]}-${match[2]}-${match[3]}`;
        }
        return new Date().toISOString().split('T')[0];
    }

    async generateWorksheet() {
        console.log('🚀 Generating DCN Cafe Data Worksheet...');
        
        const urls = await this.findCafeArticleUrls();
        const template = this.generateExtractionTemplate(urls);
        
        // Create a worksheet file
        const worksheet = {
            instructions: {
                overview: "This worksheet helps you systematically extract cafe data from DCN articles",
                steps: [
                    "1. Visit each URL below",
                    "2. Fill in the cafe details",
                    "3. Run the geocoding script to add coordinates",
                    "4. Your map will update automatically"
                ],
                tips: [
                    "Look for the main cafe image (not logos or small pics)",
                    "Find the street address in the article text",
                    "Pick a good quote that represents the cafe's mission",
                    "Skip articles that aren't about new cafe openings"
                ]
            },
            template: template,
            completed_examples: [
                {
                    url: "https://dailycoffeenews.com/2025/07/03/obscure-coffee-roasters-shines-a-light-on-puerto-rican-coffee-in-brooklyn/",
                    name: "Obscure Coffee Roasters",
                    address: "259 Melrose St., Brooklyn, New York",
                    imageUrl: "https://dailycoffeenews.com/wp-content/uploads/2025/07/Obscure-Coffee-Roasters-Bushwick-Brooklyn-Norbert.jpg",
                    snippet: "We would love for this to be a space for community that is open to everyone, no matter how involved you are with coffee or how knowledgeable you are about it.",
                    date: "2025-07-03",
                    articleUrl: "https://dailycoffeenews.com/2025/07/03/obscure-coffee-roasters-shines-a-light-on-puerto-rican-coffee-in-brooklyn/"
                }
            ]
        };

        // Save worksheet
        await fs.writeJson('./DCN-Cafe-Worksheet.json', worksheet, { spaces: 2 });
        
        // Also create a simple text version
        let textWorksheet = `DCN CAFE DATA EXTRACTION WORKSHEET\n`;
        textWorksheet += `=====================================\n\n`;
        textWorksheet += `INSTRUCTIONS:\n`;
        textWorksheet += `1. Visit each URL below\n`;
        textWorksheet += `2. Extract the cafe name, address, main image URL, and a good quote\n`;
        textWorksheet += `3. Add the data to data/all-cafes.json\n`;
        textWorksheet += `4. Run: npm run geocode\n\n`;
        
        textWorksheet += `ARTICLES TO PROCESS:\n`;
        textWorksheet += `=====================\n\n`;
        
        template.forEach((item, index) => {
            textWorksheet += `${index + 1}. ${item.url}\n`;
            textWorksheet += `   Name: ________________________\n`;
            textWorksheet += `   Address: _____________________\n`;
            textWorksheet += `   Image URL: ___________________\n`;
            textWorksheet += `   Quote: _______________________\n`;
            textWorksheet += `   Date: ${item.date}\n\n`;
        });

        await fs.writeFile('./DCN-Cafe-Worksheet.txt', textWorksheet);
        
        console.log(`\n✅ Created extraction worksheet:`);
        console.log(`📄 JSON format: ./DCN-Cafe-Worksheet.json`);
        console.log(`📝 Text format: ./DCN-Cafe-Worksheet.txt`);
        console.log(`\n🎯 Found ${urls.length} potential cafe articles`);
        console.log(`📋 Template created for first ${template.length} articles`);
        
        console.log(`\n💡 NEXT STEPS:`);
        console.log(`1. Open DCN-Cafe-Worksheet.txt`);
        console.log(`2. Visit each URL and fill in the details`);
        console.log(`3. Add completed entries to data/all-cafes.json`);
        console.log(`4. Run: npm run geocode`);
        console.log(`5. Your map will update with new cafes!`);

        return { urls, template };
    }
}

if (require.main === module) {
    const builder = new HybridDataBuilder();
    builder.generateWorksheet()
        .then(result => {
            console.log('\n🎉 Worksheet generation complete!');
        })
        .catch(error => {
            console.error('\n💥 Generation failed:', error);
            process.exit(1);
        });
}

module.exports = HybridDataBuilder;