"""
WorkRobo.ai - Stealth Scraper Module
Uses Playwright with stealth mode to bypass bot detection
"""

import asyncio
import hashlib
import base64
import logging
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timezone
from playwright.async_api import async_playwright, Page, Browser, BrowserContext

logger = logging.getLogger(__name__)

class StealthScraper:
    """
    High-performance stealth web scraper using Playwright.
    Designed to bypass bot detection and extract content reliably.
    """
    
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self._playwright = None
        
    async def initialize(self):
        """Initialize the browser with stealth settings"""
        if self.browser is None:
            self._playwright = await async_playwright().start()
            self.browser = await self._playwright.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-blink-features=AutomationControlled',
                ]
            )
            self.context = await self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                locale='en-US',
                timezone_id='America/New_York',
                extra_http_headers={
                    'Accept-Language': 'en-US,en;q=0.9',
                }
            )
            logger.info("StealthScraper initialized successfully")
            
    async def close(self):
        """Clean up browser resources"""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self._playwright:
            await self._playwright.stop()
        self.browser = None
        self.context = None
        self._playwright = None
        logger.info("StealthScraper closed")
        
    async def _apply_stealth(self, page: Page):
        """Apply stealth scripts to avoid detection"""
        # Override navigator.webdriver
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            // Override chrome
            window.chrome = {
                runtime: {}
            };
            
            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            
            // Override plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            
            // Override languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });
        """)
        
    async def smart_scrape(
        self,
        url: str,
        selector: Optional[str] = None,
        wait_for: Optional[str] = None,
        timeout: int = 30000
    ) -> Dict[str, Any]:
        """
        SmartScrape - Intelligent web scraping with stealth mode.
        
        Args:
            url: Target URL to scrape
            selector: Optional CSS selector to extract specific content
            wait_for: Optional selector to wait for before scraping
            timeout: Timeout in milliseconds
            
        Returns:
            Dict containing:
            - content: Extracted text content
            - html: Raw HTML (optional)
            - screenshot_base64: Base64 encoded screenshot
            - content_hash: MD5 hash for change detection
            - timestamp: ISO timestamp
            - success: Boolean status
            - error: Error message if failed
        """
        await self.initialize()
        
        page: Optional[Page] = None
        result = {
            'content': '',
            'html': '',
            'screenshot_base64': '',
            'content_hash': '',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'success': False,
            'error': None,
            'url': url
        }
        
        try:
            page = await self.context.new_page()
            
            # Apply stealth mode to bypass detection
            await self._apply_stealth(page)
            
            # Navigate to URL
            logger.info(f"Navigating to: {url}")
            response = await page.goto(url, wait_until='networkidle', timeout=timeout)
            
            if not response or response.status >= 400:
                result['error'] = f"HTTP {response.status if response else 'No response'}"
                return result
            
            # Wait for specific element if requested
            if wait_for:
                try:
                    await page.wait_for_selector(wait_for, timeout=timeout)
                except Exception as e:
                    logger.warning(f"Wait for selector failed: {e}")
            
            # Extract content
            if selector:
                # Extract specific element content
                elements = await page.query_selector_all(selector)
                texts = []
                for el in elements:
                    text = await el.text_content()
                    if text:
                        texts.append(text.strip())
                result['content'] = '\n'.join(texts)
            else:
                # Extract all visible text
                result['content'] = await page.evaluate('''() => {
                    const walker = document.createTreeWalker(
                        document.body,
                        NodeFilter.SHOW_TEXT,
                        {
                            acceptNode: function(node) {
                                const style = window.getComputedStyle(node.parentElement);
                                if (style.display === 'none' || style.visibility === 'hidden') {
                                    return NodeFilter.FILTER_REJECT;
                                }
                                return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                            }
                        }
                    );
                    const texts = [];
                    while (walker.nextNode()) {
                        texts.push(walker.currentNode.textContent.trim());
                    }
                    return texts.join(' ').replace(/\\s+/g, ' ').trim();
                }''')
            
            # Get page HTML (limited to prevent huge payloads)
            result['html'] = await page.content()
            if len(result['html']) > 100000:
                result['html'] = result['html'][:100000] + '... [truncated]'
            
            # Take screenshot
            screenshot_bytes = await page.screenshot(type='jpeg', quality=50)
            result['screenshot_base64'] = base64.b64encode(screenshot_bytes).decode('utf-8')
            
            # Generate content hash for change detection
            result['content_hash'] = hashlib.md5(result['content'].encode()).hexdigest()
            
            result['success'] = True
            logger.info(f"Successfully scraped {url} - {len(result['content'])} chars")
            
        except Exception as e:
            result['error'] = str(e)
            logger.error(f"Scrape failed for {url}: {e}")
            
        finally:
            if page:
                await page.close()
                
        return result
    
    async def check_for_changes(
        self,
        url: str,
        last_hash: Optional[str],
        selector: Optional[str] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if a webpage has changed since last scrape.
        
        Args:
            url: Target URL
            last_hash: Previous content hash
            selector: Optional CSS selector
            
        Returns:
            Tuple of (change_detected: bool, scrape_result: dict)
        """
        result = await self.smart_scrape(url, selector=selector)
        
        if not result['success']:
            return False, result
            
        if last_hash is None:
            # First time scraping, no change to detect
            return False, result
            
        change_detected = result['content_hash'] != last_hash
        
        if change_detected:
            logger.info(f"Change detected on {url}")
            result['change_detected'] = True
            result['previous_hash'] = last_hash
        else:
            result['change_detected'] = False
            
        return change_detected, result


# Singleton instance for reuse
_scraper_instance: Optional[StealthScraper] = None

async def get_scraper() -> StealthScraper:
    """Get or create the singleton scraper instance"""
    global _scraper_instance
    if _scraper_instance is None:
        _scraper_instance = StealthScraper()
    return _scraper_instance

async def cleanup_scraper():
    """Cleanup the scraper instance"""
    global _scraper_instance
    if _scraper_instance:
        await _scraper_instance.close()
        _scraper_instance = None
