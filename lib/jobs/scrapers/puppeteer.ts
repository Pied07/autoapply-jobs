import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";

let executablePathPromise: Promise<string> | null = null;

async function getBrowser() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    if (!executablePathPromise) {
      executablePathPromise = chromium.executablePath("https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar");
    }
    
    const executablePath = await executablePathPromise;
    
    return await puppeteerCore.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: (chromium as any).defaultViewport || { width: 1280, height: 720 },
      executablePath,
      headless: (chromium as any).headless || "new",
    } as any);
  } else {
    return await puppeteer.launch({
      headless: "new" as any,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
  }
}

export async function fetchWithPuppeteer(url: string, waitForSelector?: string, headers?: Record<string, string>): Promise<string> {
  const browser = await getBrowser();
  
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

export async function extractFromPage<T>(url: string, evaluateFn: string): Promise<T | null> {
  const browser = await getBrowser();
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Give it a second to render
    await new Promise(r => setTimeout(r, 2000));
    
    // Evaluate the string as an Immediately Invoked Function Expression
    const result = await page.evaluate(`(${evaluateFn})()`);
    return result as T;
  } catch (error) {
    console.error(`[Puppeteer] failed to extract from ${url}`, error);
    return null;
  } finally {
    await browser.close();
  }
}
