import { fetchWithPuppeteer } from "./lib/jobs/scrapers/puppeteer";
import * as cheerio from "cheerio";

async function run() {
  const url = "https://www.google.com/search?q=developer+jobs+in+remote+India+site:naukri.com&ibp=htl;jobs";
  const html = await fetchWithPuppeteer(url, "div.BjJfJf");
  
  const $ = cheerio.load(html);
  const jobs: any[] = [];
  
  $("div.BjJfJf").each((i, el) => {
    const title = $(el).find("div.BjJfJf").text();
    // We'll figure out selectors...
    console.log("Found a job node!");
  });
  
  console.log("Total jobs nodes:", $("li").length);
}
run();
