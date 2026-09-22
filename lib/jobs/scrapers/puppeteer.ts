import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export async function fetchWithPuppeteer(url: string, waitForSelector?: string, headers?: Record<string, string>): Promise<string> {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set a common user agent to bypass simple blocks
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
    
    if (headers) {
      await page.setExtraHTTPHeaders(headers);
    }

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    
    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 5000 });
      } catch (e) {
        console.warn(`[Puppeteer] timeout waiting for ${waitForSelector} on ${url}`);
      }
    }
    
    const content = await page.content();
    return content;
  } catch (error) {
    console.error(`[Puppeteer] failed to fetch ${url}`, error);
    return "";
  } finally {
    await browser.close();
  }
}
