import type { NormalizedJob, JobPlatform } from "@/types/job";
import { normalizeJob } from "../normalizer";
import type { IndianLocation } from "@/types/profile";
import { extractFromPage } from "./puppeteer";

export async function scrapeGoogleJobs(params: {
  keyword: string;
  location: IndianLocation;
  platformName: string;
}): Promise<NormalizedJob[]> {
  const query = encodeURIComponent(`${params.keyword} jobs in ${params.location === "Remote India" ? "India" : params.location}`);
  const url = `https://www.google.com/search?q=${query}&ibp=htl;jobs`;

  try {
    // 1. Scrape the Google Jobs UI directly using Puppeteer
    const scrapedJobs = await extractFromPage<any[]>(url, `() => {
      // Scroll down repeatedly to load more jobs
      return new Promise((resolve) => {
        let lastHeight = 0;
        let scrolls = 0;
        
        // Find the scrollable container (usually role="tree" or a specific div)
        const scrollContainer = document.querySelector('div[role="tree"]') || window;

        const timer = setInterval(() => {
          if (scrollContainer === window) {
            window.scrollBy(0, 1000);
          } else {
            (scrollContainer as HTMLElement).scrollTop += 1000;
          }
          scrolls++;
          
          if (scrolls >= 10) { // Try 10 scrolls to load up to 100 jobs
            clearInterval(timer);
            
            // Extract the jobs from 'li' elements which represent the job cards
            const items = Array.from(document.querySelectorAll('li')).map(li => {
              const textParts = (li as HTMLElement).innerText.split('\\n').map(t => t.trim()).filter(Boolean);
              
              // We also want to find the apply link. Usually it's in a button or anchor.
              // Google Jobs obscures this, but sometimes we can find an href
              const hrefs = Array.from(li.querySelectorAll('a')).map(a => (a as HTMLAnchorElement).href).filter(h => h && h.startsWith('http'));
              
              return {
                textParts,
                hrefs
              };
            });
            
            resolve(items);
          }
        }, 800);
      });
    }`);

    if (!scrapedJobs || !Array.isArray(scrapedJobs)) {
      console.warn("[Google Jobs Crawler] No jobs returned or Puppeteer failed.");
      return [];
    }

    const normalizedJobs: NormalizedJob[] = [];

    for (const item of scrapedJobs) {
      const parts = item.textParts;
      if (parts.length < 3) continue;

      const title = parts[0];
      const company = parts[1];
      const locationAndSource = parts[2] || "";
      const isRemote = locationAndSource.toLowerCase().includes("remote") || params.location === "Remote India";
      
      let originalSource = "google";
      if (locationAndSource.includes("via ")) {
        originalSource = locationAndSource.split("via ")[1].toLowerCase().replace(/\\.com|\\.in/g, "").trim();
      }

      let applyUrl = item.hrefs?.[0] || "";
      if (!applyUrl) {
        applyUrl = `https://www.google.com/search?q=${encodeURIComponent(company + ' careers')}&btnI`;
      }

      const jobDesc = `Found directly via Google Jobs organic crawler.\\nOriginal source: ${originalSource}\\nPosted: ${parts[3] || 'Recently'}`;

      const job = normalizeJob({
        title,
        company,
        location: isRemote ? "Remote" : params.location,
        source: params.platformName as any,
        platform: params.platformName as JobPlatform,
        applyChannel: "site",
        applyEmail: undefined,
        applyUrl: applyUrl,
        workMode: isRemote ? "remote" : "office",
        jobType: "experienced",
        description: jobDesc,
        postedAt: new Date().toISOString(),
      });

      normalizedJobs.push(job);
    }

    return normalizedJobs;
  } catch (error) {
    console.error("[Google Jobs Crawler] error:", error);
    return [];
  }
}
