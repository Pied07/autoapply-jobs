import { getBrowser } from "./lib/jobs/auto-apply";

async function setup() {
  console.log("Opening browser with your persistent profile...");
  const browser = await getBrowser();
  
  const page = await browser.newPage();
  await page.goto("https://www.linkedin.com/login", { waitUntil: "networkidle2" });
  
  console.log("\n=======================================================");
  console.log("Please log in to LinkedIn in the Chromium window that just opened.");
  console.log("Solve any CAPTCHAs or 2FA checks they give you.");
  console.log("Once you are successfully logged in and see your feed, simply close the browser window.");
  console.log("=======================================================\n");
  
  // Wait indefinitely until the user manually closes the browser
  await new Promise(resolve => browser.on('disconnected', resolve));
  
  console.log("Browser closed. Your session has been saved permanently to the 'chrome-profile' folder!");
}

setup().catch(console.error);
