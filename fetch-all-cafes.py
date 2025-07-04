#!/usr/bin/env python3
"""
Comprehensive DCN Cafe Openings Fetcher
Fetches all cafe opening articles and downloads images locally
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import os
import re
from datetime import datetime
from urllib.parse import urlparse, urljoin
import hashlib

class DCNCompleteFetcher:
    def __init__(self):
        self.base_url = "https://dailycoffeenews.com"
        self.category_url = f"{self.base_url}/category/cafe/openings-cafe/"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        self.images_dir = "images"
        os.makedirs(self.images_dir, exist_ok=True)
    
    def download_image(self, image_url, cafe_name):
        """Download image and return local path"""
        try:
            # Create filename from URL
            url_hash = hashlib.md5(image_url.encode()).hexdigest()[:8]
            ext = os.path.splitext(urlparse(image_url).path)[1] or '.jpg'
            filename = f"{cafe_name.lower().replace(' ', '-')}_{url_hash}{ext}"
            filepath = os.path.join(self.images_dir, filename)
            
            # Skip if already downloaded
            if os.path.exists(filepath):
                return filepath
            
            # Download image
            response = requests.get(image_url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            print(f"Downloaded image: {filename}")
            return filepath
            
        except Exception as e:
            print(f"Error downloading image {image_url}: {e}")
            return None
    
    def get_all_article_links(self):
        """Get all article links from the openings category"""
        all_links = []
        page = 1
        
        while True:
            url = self.category_url if page == 1 else f"{self.category_url}page/{page}/"
            print(f"Fetching page {page}...")
            
            try:
                response = requests.get(url, headers=self.headers)
                if response.status_code == 404:
                    break
                
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Find all article links on this page
                articles = soup.find_all('h2', class_='entry-title')
                if not articles:
                    break
                
                for article in articles:
                    link = article.find('a')
                    if link and link.get('href'):
                        all_links.append(link['href'])
                
                page += 1
                time.sleep(1)  # Be respectful
                
            except Exception as e:
                print(f"Error on page {page}: {e}")
                break
        
        return all_links
    
    def extract_cafe_data(self, article_url):
        """Extract cafe information from article"""
        try:
            response = requests.get(article_url, headers=self.headers)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Get title
            title_elem = soup.find('h1', class_='entry-title')
            if not title_elem:
                return None
            
            title = title_elem.text.strip()
            
            # Extract cafe name from title
            cafe_name = self.extract_cafe_name(title)
            
            # Get content
            content = soup.find('div', class_='entry-content')
            if not content:
                return None
            
            # Get first paragraph for snippet
            paragraphs = content.find_all('p')
            snippet = ""
            for p in paragraphs:
                text = p.text.strip()
                if text and len(text) > 50:  # Skip short paragraphs
                    snippet = text[:200] + "..." if len(text) > 200 else text
                    break
            
            # Find address - check multiple patterns
            address = None
            full_text = content.text
            
            # Common patterns for addresses in DCN articles
            patterns = [
                r'(?:is located at|can be found at|is at|opened at|find it at)\s+([^.]+)',
                r'at\s+(\d+\s+[^,]+,\s+[^.]+)',
                r'(\d+\s+\w+\s+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Place|Pl)[^.]*)',
            ]
            
            for pattern in patterns:
                match = re.search(pattern, full_text, re.I)
                if match:
                    potential_address = match.group(1).strip()
                    # Clean up the address
                    potential_address = re.sub(r'\s+', ' ', potential_address)
                    potential_address = potential_address.rstrip('.,;')
                    
                    # Check if it looks like an address
                    if re.search(r'\d+', potential_address) and len(potential_address) > 10:
                        address = potential_address
                        break
            
            # Last resort - check last few paragraphs for address-like text
            if not address:
                for p in reversed(paragraphs[-5:]):
                    text = p.text.strip()
                    if re.search(r'\d+\s+\w+', text) and any(word in text for word in ['Street', 'St.', 'Avenue', 'Ave.', 'Road', 'Boulevard']):
                        address = text
                        break
            
            if not address:
                print(f"No address found for: {cafe_name}")
                return None
            
            # Get date
            date_elem = soup.find('time', class_='entry-date')
            date = date_elem.get('datetime', '').split('T')[0] if date_elem else datetime.now().strftime('%Y-%m-%d')
            
            # Get image
            image_url = None
            local_image = None
            images = content.find_all('img')
            
            for img in images:
                src = img.get('src', '')
                # Skip avatars, logos, ads
                if any(skip in src.lower() for skip in ['avatar', 'logo', 'ad-', 'advertisement']):
                    continue
                
                # Prefer larger images
                if 'dailycoffeenews.com' in src:
                    image_url = src
                    # Try to get full-size image
                    image_url = re.sub(r'-\d+x\d+\.(jpg|jpeg|png)', r'.\1', image_url)
                    break
            
            # Download image if found
            if image_url:
                local_image = self.download_image(image_url, cafe_name)
            
            return {
                'name': cafe_name,
                'address': address,
                'snippet': snippet,
                'articleUrl': article_url,
                'imageUrl': local_image,
                'originalImageUrl': image_url,
                'date': date
            }
            
        except Exception as e:
            print(f"Error extracting from {article_url}: {e}")
            return None
    
    def extract_cafe_name(self, title):
        """Extract cafe name from article title"""
        # Remove common phrases
        title = re.sub(r'\s+', ' ', title).strip()
        
        # Try to extract cafe name before common verbs
        patterns = [
            r'^([^"]+?)(?:\s+(?:Opens|Debuts|Launches|Arrives|Shines|Brings|Completes|Now))',
            r'"([^"]+)"',
            r'^(.+?)\s+(?:in|at)\s+',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, title, re.I)
            if match:
                name = match.group(1).strip()
                # Clean up
                name = name.replace("'s", '').replace("'s", '')
                return name
        
        # Fallback - first few words
        words = title.split()
        return ' '.join(words[:3])
    
    def fetch_all_cafes(self):
        """Main function to fetch all cafe data"""
        print("Starting comprehensive DCN cafe fetch...")
        
        # Get all article links
        all_links = self.get_all_article_links()
        print(f"Found {len(all_links)} total articles")
        
        # Extract data from each article
        cafes = []
        for i, link in enumerate(all_links):
            print(f"\nProcessing {i+1}/{len(all_links)}: {link}")
            
            cafe_data = self.extract_cafe_data(link)
            if cafe_data:
                cafes.append(cafe_data)
                print(f"✓ Added: {cafe_data['name']} - {cafe_data['address']}")
            else:
                print(f"✗ Skipped (no address found)")
            
            # Be respectful with rate limiting
            time.sleep(1.5)
        
        # Save data
        output = {
            'cafes': cafes,
            'totalCafes': len(cafes),
            'lastUpdated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        with open('cafe-data-complete.json', 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Successfully extracted {len(cafes)} cafes with addresses")
        print(f"📁 Saved to cafe-data-complete.json")
        print(f"🖼️  Downloaded images to ./{self.images_dir}/")
        
        return cafes

if __name__ == "__main__":
    fetcher = DCNCompleteFetcher()
    cafes = fetcher.fetch_all_cafes()