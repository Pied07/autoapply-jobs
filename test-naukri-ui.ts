import { fetchWithPuppeteer } from "./lib/jobs/scrapers/puppeteer";

async function run() {
  const url = "https://www.naukri.com/developer-jobs";
  const html = await fetchWithPuppeteer(url, "article.jobTuple");
  console.log("HTML:", html.substring(0, 1000));
  
  if (html.includes("jobTuple")) {
     console.log("Found jobs!");
  }
}
run();
