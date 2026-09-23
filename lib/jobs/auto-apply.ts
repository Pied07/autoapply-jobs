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
  let context: any = null;
  let page: any = null;
  
  try {
    context = await browser.createBrowserContext().catch(() => browser.createIncognitoBrowserContext().catch(() => browser));
    
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

    page = await context.newPage();
    
    // SPEED OPTIMIZATION: Block images, fonts, and CSS to save massive CPU and Network overhead
    await page.setRequestInterception(true);
    page.on('request', (req: any) => {
      const rt = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media', 'other'].includes(rt)) {
        req.abort().catch(() => {});
      } else {
        req.continue().catch(() => {});
      }
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    // Give it up to 15 seconds to load the job page
    page.setDefaultTimeout(15000);
    
    try {
      // Use domcontentloaded instead of networkidle2 to finish in 1-2 seconds instead of 15+ seconds
      await page.goto(jobUrl, { waitUntil: "domcontentloaded" });
    } catch (e) {
      return { status: "failed", message: "Failed to load the job application page (timeout or network error)." };
    }

    // Wait a couple of seconds to ensure dynamic forms render
    await new Promise((r) => setTimeout(r, 2000));

    // Try to find any "Apply" button to click if we are on a landing page rather than a form
    try {
      const applyButtons = await page.$$("button, a");
      for (const btn of applyButtons) {
        const text = await btn.evaluate((el: any) => (el.textContent || el.value || "").toLowerCase().trim());
        
        if (text === "easy apply" || text === "apply" || text === "apply now" || text === "apply for this job" || text.includes("apply to this") || text.includes("apply externally")) {
          await btn.evaluate((b: any) => b.click());
          await new Promise((r) => setTimeout(r, 5000)); // wait for navigation, modal, or new tab
          
          // If the button opened a new tab (e.g. LinkedIn external apply), switch our context to the new tab!
          const pages = await context.pages();
          if (pages.length > 1) {
            // The last page in the array is the most recently opened one
            const latestPage = pages[pages.length - 1];
            if (latestPage !== page) {
              page = latestPage;
              page.setDefaultTimeout(15000);
              await new Promise((r) => setTimeout(r, 4000)); // wait for external ATS to fully render
              
              // NEW: Some external sites require clicking "Apply" again before the form appears!
              try {
                const extButtons = await page.$$("button, a");
                for (const eb of extButtons) {
                  const etext = await eb.evaluate((el: any) => (el.textContent || "").toLowerCase().trim());
                  if (etext === "apply" || etext === "apply now" || etext === "apply for this job") {
                    await eb.evaluate((b: any) => b.click());
                    await new Promise((r) => setTimeout(r, 4000));
                    break;
                  }
                }
              } catch (e) {}
            }
          }
          break;
        }
      }
    } catch (e) {
      // ignore
    }

    // Handle Multi-Step Forms (like LinkedIn Easy Apply)
    let maxSteps = 10;
    let stepCount = 0;
    let clickedSubmit = false;
    let nameFound = false;
    let emailFound = false;
    let resumeUploaded = false;

    while (stepCount < maxSteps && !clickedSubmit) {
      stepCount++;
      
      // 1. Fill visible inputs on current step
      const inputs = await page.$$("input");
      for (const input of inputs) {
        // Skip invisible inputs
        let isVisible = false;
        let type = "", name = "", id = "", val = "";
        try {
          type = await input.evaluate((el: any) => el.getAttribute("type")?.toLowerCase() || "");
          
          if (type !== "file") {
            isVisible = await input.evaluate((el: any) => {
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
            });
            if (!isVisible) continue;
          }

          name = await input.evaluate((el: any) => el.getAttribute("name")?.toLowerCase() || "");
          id = await input.evaluate((el: any) => el.id.toLowerCase() || "");
          val = await input.evaluate((el: any) => el.value);
        } catch (e) {
          continue; // Context destroyed or element removed, skip
        }
        
        const attrString = `${type} ${name} ${id}`;

        if (type === "file" && tempResumePath && !resumeUploaded) {
          try {
            await input.uploadFile(tempResumePath);
            resumeUploaded = true;
          } catch (e) {}
        } else if (attrString.includes("email") && !val) {
          emailFound = true;
          try { await input.type(profile.email || ""); } catch (e) {}
        } else if ((attrString.includes("name") || attrString.includes("first") || attrString.includes("last")) && !val) {
          nameFound = true;
          try { await input.type(profile.name || ""); } catch (e) {}
        } else if ((attrString.includes("phone") || attrString.includes("tel") || attrString.includes("mobile")) && !val) {
          try { await input.type(profile.phone || "0000000000"); } catch (e) {}
        } else if (type === "radio" || type === "checkbox") {
          // Brute-force radios (usually "Yes")
          try { await input.evaluate((el: any) => el.click()); } catch(e){}
        } else if (!val && (type === "text" || type === "number" || !type)) {
          // Brute-force custom text/number questions
          try {
            if (attrString.includes("year") || type === "number") await input.type(profile.yearsOfExperience || "4");
            else if (attrString.includes("city") || attrString.includes("loc")) await input.type(profile.preferredLocations[0] || "India");
            else if (attrString.includes("salary") || attrString.includes("pay") || attrString.includes("ctc")) await input.type(profile.expectedSalary || "1000000");
            else await input.type("Yes");
          } catch(e){}
        }
      }

      // Brute-force dropdowns
      const selects = await page.$$("select");
      for (const sel of selects) {
        try {
          const isVisible = await sel.evaluate((el: any) => window.getComputedStyle(el).visibility !== 'hidden');
          if (!isVisible) continue;
          
          const val = await sel.evaluate((el: any) => el.value);
          if (!val || val.toLowerCase().includes("select")) {
             await sel.evaluate((el: any) => {
                if (el.options.length > 1) {
                  el.selectedIndex = 1;
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                }
             });
          }
        } catch(e){}
      }

      // 2. Look for action buttons (Next, Continue, Review, Submit)
      const buttons = await page.$$("button, input[type='submit'], input[type='button']");
      let movedForward = false;
      let reviewOrNextButton = null;

      for (const btn of buttons) {
        // Skip invisible buttons
        let isVisible = false;
        let text = "";
        try {
          isVisible = await btn.evaluate((el: any) => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden' && !el.disabled;
          });
          if (!isVisible) continue;

          text = await btn.evaluate((el: any) => (el.textContent || el.value || "").toLowerCase().trim());
        } catch (e) {
          continue;
        }
        
        // Final submit
        if (text.includes("submit application") || text === "submit" || text === "apply" || text === "send" || text.includes("submit")) {
          try {
            await btn.evaluate((b: any) => b.click());
            clickedSubmit = true;
            movedForward = true;
            await new Promise((r) => setTimeout(r, 4000));
            break;
          } catch(e) {}
        } else if (text.includes("next") || text.includes("continue") || text.includes("review")) {
          reviewOrNextButton = btn;
        }
      }

      if (clickedSubmit) break;

      // If we didn't find a submit button, try clicking Next/Review
      if (reviewOrNextButton) {
        try {
          await reviewOrNextButton.evaluate((b: any) => b.click());
          movedForward = true;
          await new Promise((r) => setTimeout(r, 2000));
        } catch(e) {}
      }

      // If we couldn't find a way to move forward, break the multi-step loop
      if (!movedForward) {
        break;
      }
    }

    if (!nameFound && !emailFound && !clickedSubmit) {
      return {
        status: "failed",
        message: "Failed to locate standard application form fields (Name, Email) on the page. The ATS might be unsupported or requires login.",
      };
    }

    if (clickedSubmit) {
      try {
        
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
    if (context) {
      await context.close().catch(() => {});
    }
    if (browser && isOwnBrowser) {
      await browser.close().catch(() => {});
    }
    if (tempResumePath) {
      try { await fs.unlink(tempResumePath); } catch (e) {}
    }
  }
}
