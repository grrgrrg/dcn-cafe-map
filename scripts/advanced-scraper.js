const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');

class AdvancedDCNScraper {
    constructor() {
        this.baseUrl = 'https://dailycoffeenews.com';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        };
    }

    async getArticleLinksFromSitemap() {
        console.log('🗺️  Fetching sitemap...');
        try {
            // Try multiple sitemap approaches
            const sitemapUrls = [
                'https://dailycoffeenews.com/sitemap.xml',
                'https://dailycoffeenews.com/sitemap_index.xml',
                'https://dailycoffeenews.com/post-sitemap.xml'
            ];

            for (const sitemapUrl of sitemapUrls) {
                try {
                    const response = await axios.get(sitemapUrl, { headers: this.headers });
                    const $ = cheerio.load(response.data, { xmlMode: true });
                    
                    const urls = [];
                    $('url loc, sitemap loc').each((i, elem) => {
                        const url = $(elem).text().trim();
                        if (url.includes('/2025/') || url.includes('/2024/')) {
                            urls.push(url);
                        }
                    });
                    
                    if (urls.length > 0) {
                        console.log(`Found ${urls.length} URLs in ${sitemapUrl}`);
                        return urls.filter(url => 
                            url.includes('cafe') || 
                            url.includes('coffee') || 
                            url.includes('roaster') ||
                            url.includes('open')
                        ).slice(0, 50); // Limit for testing
                    }
                } catch (error) {
                    console.log(`Sitemap ${sitemapUrl} failed: ${error.message}`);
                }
            }
        } catch (error) {
            console.error('Sitemap approach failed:', error.message);
        }
        return [];
    }

    async searchForCafeArticles() {
        console.log('🔍 Searching for cafe articles...');
        const searchTerms = ['cafe+opening', 'coffee+shop+opens', 'roastery+opens', 'new+cafe'];
        const allUrls = [];

        for (const term of searchTerms) {
            try {
                const searchUrl = `${this.baseUrl}/?s=${term}`;
                console.log(`Searching: ${searchUrl}`);
                
                const response = await axios.get(searchUrl, { headers: this.headers });
                const $ = cheerio.load(response.data);
                
                // Look for article links in search results
                $('a[href*="dailycoffeenews.com"]').each((i, elem) => {
                    const href = $(elem).attr('href');
                    if (href && href.includes('/2025/') || href.includes('/2024/')) {
                        allUrls.push(href);
                    }
                });
                
                await this.sleep(2000);
            } catch (error) {
                console.error(`Search failed for ${term}:`, error.message);
            }
        }

        return [...new Set(allUrls)].slice(0, 30);
    }

    async getRecentArticles() {
        console.log('📰 Getting recent articles from homepage...');
        try {
            const response = await axios.get(this.baseUrl, { headers: this.headers });
            const $ = cheerio.load(response.data);
            
            const urls = [];
            
            // Try multiple selectors for article links
            const selectors = [
                'article a[href*="/2025/"]',
                '.post a[href*="/2025/"]',
                'a[href*="dailycoffeenews.com/2025/"]',
                'h2 a, h3 a, h4 a',
                '.entry-title a'
            ];

            for (const selector of selectors) {
                $(selector).each((i, elem) => {
                    const href = $(elem).attr('href');
                    if (href && (href.includes('/2025/') || href.includes('/2024/'))) {
                        urls.push(href);
                    }
                });
            }

            const uniqueUrls = [...new Set(urls)];
            console.log(`Found ${uniqueUrls.length} recent article URLs`);
            return uniqueUrls.slice(0, 20);

        } catch (error) {
            console.error('Recent articles fetch failed:', error.message);
            return [];
        }
    }

    async extractArticleData(url) {
        try {
            console.log(`📖 Processing: ${url}`);
            
            const response = await axios.get(url, { 
                headers: this.headers,
                timeout: 30000
            });
            const $ = cheerio.load(response.data);

            // Extract title with multiple selectors
            let title = '';
            const titleSelectors = ['h1.entry-title', 'h1.post-title', 'h1', '.entry-title', '.post-title'];
            for (const selector of titleSelectors) {
                const elem = $(selector).first();
                if (elem.length && elem.text().trim()) {
                    title = elem.text().trim();
                    break;
                }
            }

            if (!title) {
                console.log(`No title found for ${url}`);
                return null;
            }

            // Check if it's actually about a cafe opening
            const titleLower = title.toLowerCase();
            const cafeKeywords = ['cafe', 'coffee', 'roaster', 'shop', 'opens', 'opening', 'debut', 'launch'];
            const hasKeyword = cafeKeywords.some(keyword => titleLower.includes(keyword));
            
            if (!hasKeyword) {
                console.log(`Not a cafe article: ${title}`);
                return null;
            }

            // Extract content
            const contentSelectors = ['.entry-content', '.post-content', 'article', '.content'];
            let content = null;
            for (const selector of contentSelectors) {
                const elem = $(selector).first();
                if (elem.length) {
                    content = elem;
                    break;
                }
            }

            if (!content) {
                console.log(`No content found for ${url}`);
                return null;
            }

            // Extract snippet
            let snippet = '';
            content.find('p').each((i, elem) => {
                const text = $(elem).text().trim();
                if (!snippet && text.length > 50 && !text.toLowerCase().includes('subscribe')) {
                    snippet = text.length > 250 ? text.substring(0, 250) + '...' : text;
                    return false;
                }
            });

            // Extract real image URL
            let imageUrl = null;
            const imageSelectors = [
                '.entry-content img:first',
                '.post-content img:first', 
                'article img:first',
                '.featured-image img',
                '.wp-post-image'
            ];

            for (const selector of imageSelectors) {
                const img = $(selector).first();
                if (img.length) {
                    let src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');
                    if (src) {
                        // Convert relative URLs to absolute
                        if (src.startsWith('/')) {
                            src = this.baseUrl + src;
                        }
                        // Skip small images, logos, avatars
                        if (!src.includes('avatar') && !src.includes('logo') && !src.includes('icon')) {
                            imageUrl = src;
                            break;
                        }
                    }
                }
            }

            // Extract address using improved patterns
            const address = this.extractAddress(content.text(), title);
            if (!address) {
                console.log(`No address found for: ${title}`);
                return null;
            }

            // Extract cafe name
            const cafeName = this.extractCafeName(title);

            // Extract date
            let date = '';
            const dateSelectors = ['time[datetime]', '.entry-date', '.post-date'];
            for (const selector of dateSelectors) {
                const elem = $(selector).first();
                if (elem.length) {
                    date = elem.attr('datetime') || elem.text();
                    if (date) {
                        date = date.split('T')[0];
                        break;
                    }
                }
            }

            const result = {
                name: cafeName,
                address: address,
                snippet: snippet || `New cafe opening: ${cafeName}`,
                articleUrl: url,
                imageUrl: imageUrl,
                date: date || new Date().toISOString().split('T')[0],
                title: title
            };

            console.log(`✅ Extracted: ${cafeName} at ${address}`);
            if (imageUrl) console.log(`📷 Image: ${imageUrl}`);
            
            return result;

        } catch (error) {
            console.error(`Error processing ${url}:`, error.message);
            return null;
        }
    }

    extractCafeName(title) {
        const patterns = [
            /^([^"]+?)(?:\s+(?:Opens?|Debuts?|Launches?|Arrives?|Brings?|Shines?|Completes?|Expands?|Houses?))/i,
            /"([^"]+)"/,
            /^(.+?)\s+(?:at|in)\s+/i,
            /^([^,]+?)(?:\s+(?:is|has|will|now|soon))/i
        ];

        for (const pattern of patterns) {
            const match = title.match(pattern);
            if (match) {
                let name = match[1].trim();
                name = name.replace(/^(The\s+)?/i, '');
                name = name.replace(/['"''""]/g, '');
                name = name.replace(/\s+/g, ' ');
                if (name.length > 5 && name.length < 50) {
                    return name;
                }
            }
        }

        const words = title.split(/\s+/);
        return words.slice(0, Math.min(3, words.length)).join(' ');
    }

    extractAddress(text, title) {
        const patterns = [
            /(?:is\s+located\s+at|can\s+be\s+found\s+at|is\s+at|opened\s+at|find\s+it\s+at|address\s+is)\s+([^.]+)/i,
            /(\d+\s+[^,\n]+(?:Street|St\.?|Avenue|Ave\.?|Boulevard|Blvd\.?|Road|Rd\.?|Drive|Dr\.?|Lane|Ln\.?|Way|Place|Pl\.?)[^.]*)/i,
            /(?:in|at)\s+([^,]+,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s*[A-Z]{2})/i,
            /(?:in|at)\s+([^.]+(?:Center|Mall|Building|Plaza|Square)[^.]*)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                let address = match[1].trim();
                address = address.replace(/\s+/g, ' ');
                address = address.replace(/[.;,]+$/, '');
                
                if (address.length > 10 && address.length < 200) {
                    if (/\d/.test(address) || /(?:downtown|district|neighborhood|building|center)/i.test(address)) {
                        return address;
                    }
                }
            }
        }

        return null;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async scrapeAllCafes() {
        console.log('🚀 Starting advanced DCN cafe scraping...');
        
        try {
            // Try multiple approaches to get article URLs
            let allUrls = [];
            
            // Approach 1: Recent articles from homepage
            const recentUrls = await this.getRecentArticles();
            allUrls.push(...recentUrls);
            
            // Approach 2: Search for cafe-related terms
            const searchUrls = await this.searchForCafeArticles();
            allUrls.push(...searchUrls);
            
            // Approach 3: Try sitemap
            const sitemapUrls = await this.getArticleLinksFromSitemap();
            allUrls.push(...sitemapUrls);

            // Remove duplicates and limit for testing
            const uniqueUrls = [...new Set(allUrls)].slice(0, 50);
            console.log(`\n📊 Found ${uniqueUrls.length} unique article URLs to process`);

            if (uniqueUrls.length === 0) {
                console.log('❌ No articles found. DCN may have anti-scraping measures.');
                return [];
            }

            // Process each URL
            const cafes = [];
            for (let i = 0; i < uniqueUrls.length; i++) {
                const url = uniqueUrls[i];
                console.log(`\n${i + 1}/${uniqueUrls.length}: ${url}`);
                
                try {
                    const cafeData = await this.extractArticleData(url);
                    if (cafeData) {
                        cafes.push(cafeData);
                    }
                    
                    // Rate limiting
                    await this.sleep(3000);
                    
                } catch (error) {
                    console.error(`Failed to process ${url}:`, error.message);
                }
            }

            console.log(`\n✅ Successfully extracted ${cafes.length} cafes from ${uniqueUrls.length} articles`);
            
            // Save results
            const output = {
                cafes: cafes,
                totalCafes: cafes.length,
                lastUpdated: new Date().toISOString(),
                source: 'advanced-scraper',
                processed: uniqueUrls.length,
                success_rate: `${((cafes.length / uniqueUrls.length) * 100).toFixed(1)}%`
            };

            await fs.ensureDir('./data');
            await fs.writeJson('./data/scraped-cafes.json', output, { spaces: 2 });
            console.log('💾 Saved results to ./data/scraped-cafes.json');

            return cafes;

        } catch (error) {
            console.error('❌ Scraping failed:', error);
            throw error;
        }
    }
}

if (require.main === module) {
    const scraper = new AdvancedDCNScraper();
    scraper.scrapeAllCafes()
        .then(cafes => {
            console.log('\n🎉 Scraping complete!');
            console.log(`📊 Total cafes found: ${cafes.length}`);
        })
        .catch(error => {
            console.error('\n💥 Scraping failed:', error);
            process.exit(1);
        });
}

module.exports = AdvancedDCNScraper;