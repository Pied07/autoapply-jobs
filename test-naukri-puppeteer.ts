import { fetchWithPuppeteer } from "./lib/jobs/scrapers/puppeteer";

async function run() {
  const url = "https://www.naukri.com/jobapi/v3/search?noOfResults=20&urlType=search_by_keyword&searchType=adv&keyword=developer&pageNo=1&seoKey=developer-jobs&src=jobsearchDesk";
  const html = await fetchWithPuppeteer(url, "pre", {
    "appid": "109",
    "systemid": "Naukri",
  });
  console.log("HTML:", html.substring(0, 1000));
}
run();
