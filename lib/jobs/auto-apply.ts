import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";
import fs from "fs/promises";
import path from "path";
import os from "os";
import type { CandidateProfile } from "@/types/profile";

let executablePathPromise: Promise<string> | null = null;

export async function getBrowser() {
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

export async function attemptAutomatedApplication(
  jobUrl: string,
  profile: CandidateProfile,
  providedBrowser?: any
): Promise<{ status: "applied" | "failed"; message: string }> {
  if (!jobUrl) {
    return { status: "failed", message: "Job apply link is missing." };
  }

  let tempResumePath: string | null = null;
  const browser = providedBrowser || await getBrowser();
  const isOwnBrowser = !providedBrowser;
  let page: any = null;
  
  try {
    // 1. Download Resume if available
    if (profile.resumeUrl) {
      try {
        const res = await fetch(profile.resumeUrl);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const ext = profile.resumeFileName ? path.extname(profile.resumeFileName) : '.pdf';
          tempResumePath = path.join(os.tmpdir(), `resume-${Date.now()}${ext}`);
          await fs.writeFile(tempResumePath, Buffer.from(buffer));
        }
      } catch (e) {
        console.error("Failed to download resume to temp file", e);
      }
    }

    page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    // Give it up to 30 seconds to load the job page
    page.setDefaultTimeout(30000);
    
    try {
      await page.goto(jobUrl, { waitUntil: "networkidle2" });
    } catch (e) {
      return { status: "failed", message: "Failed to load the job application page (timeout or network error)." };
    }

    // Wait a couple of seconds to ensure dynamic forms render
    await new Promise((r) => setTimeout(r, 3000));

    // Try to find any "Apply" button to click if we are on a landing page rather than a form
    try {
      const applyButtons = await page.$$("button, a");
      for (const btn of applyButtons) {
        const text = await btn.evaluate((el: any) => (el.textContent || "").toLowerCase().trim());
        
        if (text === "easy apply" || text === "apply" || text === "apply now" || text === "apply for this job") {
          await btn.click();
          await new Promise((r) => setTimeout(r, 5000)); // wait for navigation, modal, or new tab
          
          // If the button opened a new tab (e.g. LinkedIn external apply), switch our context to the new tab!
          const pages = await browser.pages();
          if (pages.length > 1) {
            // The last page in the array is the most recently opened one
            const latestPage = pages[pages.length - 1];
            if (latestPage !== page) {
              page = latestPage;
              page.setDefaultTimeout(30000);
              await new Promise((r) => setTimeout(r, 3000)); // wait for external ATS to fully render
            }
          }
          break;
        }
      }
    } catch (e) {
      // ignore
    }

    // Check if there's any recognizable form inputs
    const inputs = await page.$$("input");
    let nameFound = false;
    let emailFound = false;
    let resumeUploaded = false;

    for (const input of inputs) {
      const type = await input.evaluate((el: any) => el.getAttribute("type")?.toLowerCase());
      const name = await input.evaluate((el: any) => el.getAttribute("name")?.toLowerCase());
      const id = await input.evaluate((el: any) => el.id.toLowerCase());
      
      const attrString = `${type} ${name} ${id}`;

      if (type === "file" && tempResumePath && !resumeUploaded) {
        try {
          await input.uploadFile(tempResumePath);
          resumeUploaded = true;
        } catch (e) {
          console.error("Failed to upload file", e);
        }
      } else if (attrString.includes("email")) {
        emailFound = true;
        try { await input.type(profile.email || ""); } catch (e) {}
      } else if (attrString.includes("name") || attrString.includes("first") || attrString.includes("last")) {
        nameFound = true;
        try { await input.type(profile.name || ""); } catch (e) {}
      } else if (attrString.includes("phone") || attrString.includes("tel")) {
        try { await input.type(profile.phone || "0000000000"); } catch (e) {}
      }
    }

    if (!nameFound && !emailFound) {
      return {
        status: "failed",
        message: "Failed to locate standard application form fields (Name, Email) on the page. The ATS might be unsupported or requires login.",
      };
    }

    // Click submit
    const submitButtons = await page.$$("button[type='submit'], input[type='submit']");
    if (submitButtons.length > 0) {
      try {
        await submitButtons[0].click();
        await new Promise((r) => setTimeout(r, 5000)); // wait for submit to process
        
        // Verify success by checking page content
        const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
        const successKeywords = [
          "application submitted", 
          "application received", 
          "thank you for applying", 
          "application has been sent",
          "successfully applied",
          "application complete"
        ];
        
        const isSuccess = successKeywords.some(kw => bodyText.includes(kw));

        if (isSuccess) {
          return {
            status: "applied",
            message: `Successfully filled basic details, ${resumeUploaded ? "uploaded resume," : "could not find resume upload field,"} and verified submission success.`,
          };
        } else {
          return {
            status: "failed",
            message: "Filled details and clicked submit, but could not verify a success message. Validation might have failed due to missing required fields.",
          };
        }
      } catch (e) {
        return {
          status: "failed",
          message: "Found form and filled details, but failed to click the submit button.",
        };
      }
    }

    return {
      status: "failed",
      message: `Filled details ${resumeUploaded ? "and uploaded resume" : ""}, but could not locate a clear submit button.`,
    };
  } catch (error) {
    return {
      status: "failed",
      message: `Browser automation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
    if (browser && isOwnBrowser) {
      await browser.close().catch(() => {});
    }
    if (tempResumePath) {
      try { await fs.unlink(tempResumePath); } catch (e) {}
    }
  }
}
