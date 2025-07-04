const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

class DCNComprehensiveFetcher {
    constructor() {
        this.baseUrl = 'https://dailycoffeenews.com';
        this.categoryUrl = `${this.baseUrl}/category/cafe/openings-cafe/`;
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
        this.delay = 2000; // 2 second delay between requests
        this.maxRetries = 3;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async fetchWithRetry(url, retries = this.maxRetries) {
        try {
            const response = await axios.get(url, { 
                headers: this.headers,
                timeout: 30000
            });
            return response.data;
        } catch (error) {
            if (retries > 0 && (error.code === 'ECONNRESET' || error.response?.status >= 500)) {
                console.log(`Retrying ${url} (${retries} attempts left)`);
                await this.sleep(5000);
                return this.fetchWithRetry(url, retries - 1);
            }
            throw error;
        }
    }

    async getAllArticleLinks() {
        const allLinks = [];
        let page = 1;
        let hasMorePages = true;

        while (hasMorePages) {
            try {
                const url = page === 1 ? this.categoryUrl : `${this.categoryUrl}page/${page}/`;
                console.log(`📄 Fetching page ${page}: ${url}`);

                const html = await this.fetchWithRetry(url);
                const $ = cheerio.load(html);

                // Find article links on this page using correct DCN selectors
                const articleLinks = [];
                $('.sub-menu-story h4 a, .sub-menu-story a, h2.entry-title a, h1.entry-title a, .entry-title a').each((i, elem) => {
                    const href = $(elem).attr('href');
                    if (href && href.includes('dailycoffeenews.com') && href.includes('20')) {
                        articleLinks.push(href);
                    }
                });

                if (articleLinks.length === 0) {
                    console.log(`No articles found on page ${page}`);
                    // Check if there's a "next" or "older" link before stopping
                    const hasNext = $('a[href*="page/"]').length > 0 || $('a:contains("Older")').length > 0;
                    if (!hasNext || page > 3) {
                        console.log('No more pages found, stopping');
                        hasMorePages = false;
                    } else {
                        page++;
                    }
                } else {
                    allLinks.push(...articleLinks);
                    console.log(`Found ${articleLinks.length} articles on page ${page}`);
                    page++;
                    
                    // Be respectful with rate limiting
                    await this.sleep(this.delay);
                    
                    // Safety limit - stop at 20 pages for initial testing
                    if (page > 20) {
                        console.log('Reached page limit, stopping');
                        hasMorePages = false;
                    }
                }

            } catch (error) {
                console.error(`Error on page ${page}:`, error.message);
                hasMorePages = false;
            }
        }

        console.log(`📊 Total articles found: ${allLinks.length}`);
        return [...new Set(allLinks)]; // Remove duplicates
    }

    extractCafeName(title) {
        // Improved cafe name extraction
        title = title.replace(/\s+/g, ' ').trim();
        
        const patterns = [
            // Pattern: "Cafe Name Opens/Debuts/etc..."
            /^([^"]+?)(?:\s+(?:Opens?|Debuts?|Launches?|Arrives?|Brings?|Shines?|Completes?|Expands?|Houses?))/i,
            // Pattern: "Cafe Name" in quotes
            /"([^"]+)"/,
            // Pattern: Cafe Name at/in Location
            /^(.+?)\s+(?:at|in)\s+/i,
            // Pattern: First few words before common verbs
            /^([^,]+?)(?:\s+(?:is|has|will|now|soon))/i
        ];

        for (const pattern of patterns) {
            const match = title.match(pattern);
            if (match) {
                let name = match[1].trim();
                // Clean up common artifacts
                name = name.replace(/^(The\s+)?/i, '');
                name = name.replace(/['"''""]/g, '');
                name = name.replace(/\s+/g, ' ');
                if (name.length > 5 && name.length < 50) {
                    return name;
                }
            }
        }

        // Fallback - first 2-3 words
        const words = title.split(/\s+/);
        return words.slice(0, Math.min(3, words.length)).join(' ');
    }

    extractAddress(content, title) {
        const fullText = content.text();
        
        // Enhanced address patterns
        const patterns = [
            // Direct location statements
            /(?:is\s+located\s+at|can\s+be\s+found\s+at|is\s+at|opened\s+at|find\s+it\s+at|address\s+is)\s+([^.]+)/i,
            // Street address patterns
            /(\d+\s+[^,\n]+(?:Street|St\.?|Avenue|Ave\.?|Boulevard|Blvd\.?|Road|Rd\.?|Drive|Dr\.?|Lane|Ln\.?|Way|Place|Pl\.?)[^.]*)/i,
            // Location with city/state
            /(?:in|at)\s+([^,]+,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s*[A-Z]{2})/i,
            // Building/shopping center addresses
            /(?:in|at)\s+([^.]+(?:Center|Mall|Building|Plaza|Square)[^.]*)/i
        ];

        for (const pattern of patterns) {
            const match = fullText.match(pattern);
            if (match) {
                let address = match[1].trim();
                // Clean up the address
                address = address.replace(/\s+/g, ' ');
                address = address.replace(/[.;,]+$/, '');
                
                // Validate it looks like an address
                if (address.length > 10 && address.length < 200) {
                    // Check if it contains numbers and common address words
                    if (/\d/.test(address) || /(?:downtown|district|neighborhood|building|center)/i.test(address)) {
                        return address;
                    }
                }
            }
        }

        // Check paragraphs for address-like content
        const paragraphs = content.find('p').toArray();
        for (const p of paragraphs) {
            const text = cheerio.load(p).text().trim();
            if (text.length > 20 && text.length < 200) {
                // Look for address indicators
                if (/\d+\s+\w+/.test(text) && /(?:street|avenue|road|boulevard|st\.|ave\.|rd\.|blvd\.)/i.test(text)) {
                    return text.replace(/[.;,]+$/, '');
                }
            }
        }

        return null;
    }

    async extractCafeData(articleUrl) {
        try {
            console.log(`🔍 Processing: ${articleUrl}`);
            
            const html = await this.fetchWithRetry(articleUrl);
            const $ = cheerio.load(html);

            // Extract basic info
            const titleElement = $('h1.entry-title, h1.post-title, .entry-title h1').first();
            if (!titleElement.length) {
                console.log('❌ No title found');
                return null;
            }

            const title = titleElement.text().trim();
            const cafeName = this.extractCafeName(title);
            
            // Get article content
            const content = $('.entry-content, .post-content, article').first();
            if (!content.length) {
                console.log('❌ No content found');
                return null;
            }

            // Extract address
            const address = this.extractAddress(content, title);
            if (!address) {
                console.log(`❌ No address found for: ${cafeName}`);
                return null;
            }

            // Extract snippet (first meaningful paragraph)
            let snippet = '';
            content.find('p').each((i, elem) => {
                const text = $(elem).text().trim();
                if (!snippet && text.length > 50 && !text.toLowerCase().includes('subscribe') && !text.toLowerCase().includes('newsletter')) {
                    snippet = text.length > 200 ? text.substring(0, 200) + '...' : text;
                    return false; // break
                }
            });

            // Extract image URL
            let imageUrl = null;
            const images = content.find('img');
            for (let i = 0; i < images.length; i++) {
                const img = images.eq(i);
                const src = img.attr('src') || img.attr('data-src');
                if (src && src.includes('dailycoffeenews.com') && !src.includes('avatar') && !src.includes('logo')) {
                    // Try to get full-size image
                    imageUrl = src.replace(/-\d+x\d+\.(jpg|jpeg|png|webp)/i, '.$1');
                    break;
                }
            }

            // Extract date
            let date = '';
            const dateElement = $('time.entry-date, .post-date, time[datetime]').first();
            if (dateElement.length) {
                date = dateElement.attr('datetime') || dateElement.text();
                date = date.split('T')[0]; // Get just the date part
            }

            const cafeData = {
                name: cafeName,
                address: address,
                snippet: snippet || `New cafe opening: ${cafeName}`,
                articleUrl: articleUrl,
                imageUrl: imageUrl,
                date: date || new Date().toISOString().split('T')[0],
                title: title
            };

            console.log(`✅ Extracted: ${cafeName} at ${address}`);
            return cafeData;

        } catch (error) {
            console.error(`❌ Error processing ${articleUrl}:`, error.message);
            return null;
        }
    }

    async fetchAllCafes() {
        console.log('🚀 Starting comprehensive DCN cafe fetch...');
        
        try {
            // Get all article links
            const articleLinks = await this.getAllArticleLinks();
            console.log(`📝 Found ${articleLinks.length} articles to process`);

            // Process articles
            const cafes = [];
            const errors = [];

            for (let i = 0; i < articleLinks.length; i++) {
                const link = articleLinks[i];
                console.log(`\n📍 Processing ${i + 1}/${articleLinks.length}`);
                
                try {
                    const cafeData = await this.extractCafeData(link);
                    if (cafeData) {
                        cafes.push(cafeData);
                    }
                } catch (error) {
                    errors.push({ url: link, error: error.message });
                }

                // Rate limiting
                await this.sleep(this.delay);
            }

            // Save results
            const output = {
                cafes: cafes,
                totalCafes: cafes.length,
                lastUpdated: new Date().toISOString(),
                errors: errors.length,
                errorDetails: errors.slice(0, 10) // Keep first 10 errors for debugging
            };

            await fs.ensureDir('./data');
            await fs.writeJson('./data/all-cafes.json', output, { spaces: 2 });

            console.log(`\n✅ Successfully extracted ${cafes.length} cafes`);
            console.log(`❌ ${errors.length} errors encountered`);
            console.log(`💾 Saved to ./data/all-cafes.json`);

            return output;

        } catch (error) {
            console.error('❌ Fatal error:', error);
            throw error;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const fetcher = new DCNComprehensiveFetcher();
    fetcher.fetchAllCafes()
        .then(result => {
            console.log('\n🎉 Fetch complete!');
            console.log(`📊 Total cafes: ${result.totalCafes}`);
        })
        .catch(error => {
            console.error('\n💥 Fetch failed:', error);
            process.exit(1);
        });
}

module.exports = DCNComprehensiveFetcher;