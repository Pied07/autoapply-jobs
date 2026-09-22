import { scrapeNaukri } from "./lib/jobs/scrapers/naukri";

async function run() {
  console.log("Starting Naukri Puppeteer Scrape...");
  try {
    const jobs = await scrapeNaukri({ keyword: "developer", location: "Remote India" });
    console.log("Jobs found:", jobs.length);
    if (jobs.length > 0) {
      console.log(jobs[0]);
    }
  } catch (e) {
    console.error(e);
  }
}

run();
