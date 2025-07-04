#!/usr/bin/env python3
"""
Daily Coffee News Cafe Openings Scraper
Extracts cafe information from DCN's cafe openings category
"""

import requests
from bs4 import BeautifulSoup
import json
import time
from datetime import datetime
import re
from typing import Dict, List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DCNCafeScraper:
    def __init__(self):
        self.base_url = "https://dailycoffeenews.com"
        self.category_url = f"{self.base_url}/category/cafe/openings-cafe/"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (DCN Cafe Map Bot)'
        }
    
    def fetch_page(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch and parse a webpage"""
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            return BeautifulSoup(response.content, 'html.parser')
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            return None
    
    def extract_article_links(self, max_pages: int = 3) -> List[str]:
        """Extract article links from category pages"""
        article_links = []
        
        for page_num in range(1, max_pages + 1):
            url = self.category_url if page_num == 1 else f"{self.category_url}page/{page_num}/"
            logger.info(f"Fetching page {page_num}: {url}")
            
            soup = self.fetch_page(url)
            if not soup:
                continue
            
            articles = soup.find_all('h2', class_='entry-title')
            for article in articles:
                link = article.find('a')
                if link and link.get('href'):
                    article_links.append(link['href'])
            
            time.sleep(1)
        
        return article_links
    
    def extract_cafe_info(self, article_url: str) -> Optional[Dict]:
        """Extract cafe information from an article"""
        soup = self.fetch_page(article_url)
        if not soup:
            return None
        
        try:
            title = soup.find('h1', class_='entry-title')
            cafe_name = self.extract_cafe_name(title.text if title else '')
            
            content = soup.find('div', class_='entry-content')
            if not content:
                return None
            
            paragraphs = content.find_all('p')
            address = None
            snippet = None
            
            for i, p in enumerate(paragraphs):
                text = p.text.strip()
                
                if i == 0 and text and not snippet:
                    snippet = text[:200] + '...' if len(text) > 200 else text
                
                if any(keyword in text.lower() for keyword in ['is located at', 'can be found at', 'is at', 'opened at']):
                    address = self.extract_address_from_text(text)
                
                if not address and re.search(r'\d+\s+\w+\s+(st|street|ave|avenue|blvd|boulevard|rd|road)', text, re.I):
                    address = self.extract_address_from_text(text)
            
            if not address:
                for p in reversed(paragraphs):
                    text = p.text.strip()
                    if re.search(r'\d+\s+\w+', text) and any(state in text for state in ['New York', 'California', 'Texas', 'Florida', 'Oregon', 'Washington', 'Illinois']):
                        address = text
                        break
            
            if not address:
                logger.warning(f"No address found for {article_url}")
                return None
            
            images = content.find_all('img')
            image_url = None
            if images:
                for img in images:
                    src = img.get('src', '')
                    if 'dailycoffeenews.com' in src and not 'avatar' in src.lower():
                        image_url = src
                        break
            
            date_elem = soup.find('time', class_='entry-date')
            date = date_elem.get('datetime', '').split('T')[0] if date_elem else datetime.now().strftime('%Y-%m-%d')
            
            return {
                'name': cafe_name,
                'address': address.strip(),
                'snippet': snippet,
                'articleUrl': article_url,
                'imageUrl': image_url,
                'date': date
            }
            
        except Exception as e:
            logger.error(f"Error extracting info from {article_url}: {e}")
            return None
    
    def extract_cafe_name(self, title: str) -> str:
        """Extract cafe name from article title"""
        title = re.sub(r'\s+', ' ', title).strip()
        
        patterns = [
            r'^([^"]+?)(?:\s+(?:opens|opens|debuts|launches|arrives|shines|completes|houses))',
            r'"([^"]+)"',
            r'at\s+the\s+([^,]+)',
            r'^\s*([^,]+?)(?:\s+(?:in|at)\s+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, title, re.I)
            if match:
                return match.group(1).strip()
        
        words = title.split()
        if len(words) > 3:
            return ' '.join(words[:3])
        return title
    
    def extract_address_from_text(self, text: str) -> Optional[str]:
        """Extract address from text"""
        patterns = [
            r'(?:is\s+)?(?:located\s+)?at\s+(.+?)(?:\.|$)',
            r'(\d+\s+[^.]+(?:street|st|avenue|ave|boulevard|blvd|road|rd)[^.]*)',
            r'(\d+\s+\w+\s+\w+\.?(?:,\s*\w+)*(?:,\s*\w+\s+\d{5})?)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.I)
            if match:
                return match.group(1).strip()
        
        return None
    
    def scrape_cafes(self, max_articles: int = 20) -> List[Dict]:
        """Main scraping function"""
        logger.info("Starting DCN cafe scraper...")
        
        article_links = self.extract_article_links()
        logger.info(f"Found {len(article_links)} article links")
        
        cafes = []
        for i, link in enumerate(article_links[:max_articles]):
            logger.info(f"Processing article {i+1}/{min(len(article_links), max_articles)}: {link}")
            
            cafe_info = self.extract_cafe_info(link)
            if cafe_info:
                cafes.append(cafe_info)
                logger.info(f"Extracted: {cafe_info['name']} at {cafe_info['address']}")
            
            time.sleep(1)
        
        return cafes
    
    def save_to_json(self, cafes: List[Dict], filename: str = 'cafe-data-raw.json'):
        """Save cafe data to JSON file"""
        output = {
            'cafes': cafes,
            'lastUpdated': datetime.now().strftime('%Y-%m-%d'),
            'totalCafes': len(cafes)
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved {len(cafes)} cafes to {filename}")

def main():
    scraper = DCNCafeScraper()
    cafes = scraper.scrape_cafes(max_articles=30)
    scraper.save_to_json(cafes)
    
    print(f"\nScraped {len(cafes)} cafes successfully!")
    print("Next step: Run the geocoding script to add coordinates")

if __name__ == "__main__":
    main()