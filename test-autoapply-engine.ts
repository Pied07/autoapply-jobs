import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";
import { addExtra } from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs/promises";
import path from "path";
import os from "os";
import type { CandidateProfile } from "@/types/profile";

const puppeteerExtra = addExtra(puppeteer);
const puppeteerCoreExtra = addExtra(puppeteerCore as any);
puppeteerExtra.use(StealthPlugin());
puppeteerCoreExtra.use(StealthPlugin());

let executablePathPromise: Promise<string> | null = null;

export async function getBrowser() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    if (!executablePathPromise) {
      executablePathPromise = chromium.executablePath("https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar");
    }
    
    const executablePath = await executablePathPromise;
    
    return await puppeteerCoreExtra.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: (chromium as any).defaultViewport || { width: 1280, height: 720 },
      executablePath,
      headless: (chromium as any).headless || "new",
    } as any);
  } else {
    // Store user data in a local folder so logins persist between runs!
    const userDataDir = path.join(process.cwd(), "chrome-profile");
    return await puppeteerExtra.launch({
      headless: false, // Make it visible locally so user can log in if needed
      userDataDir,
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
    
    // CLOUD-FRIENDLY AUTHENTICATION: Inject session cookies for LinkedIn
    if (jobUrl.includes("linkedin.com") && process.env.LINKEDIN_SESSION_COOKIE) {
      await page.setCookie({
        name: "li_at",
        value: process.env.LINKEDIN_SESSION_COOKIE,
        domain: ".linkedin.com",
        path: "/",
        secure: true,
        httpOnly: true
      });
      console.log("[AutoApply] Injected LinkedIn session cookie for cloud authentication.");
    }
    
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

    // We no longer skip native applications (LinkedIn Easy Apply etc). We attempt to process them directly.

    // Handle Multi-Step Forms (like LinkedIn Easy Apply)
    let maxSteps = 10;
    let stepCount = 0;
    let clickedSubmit = false;
    let nameFound = false;
    let emailFound = false;
    let resumeUploaded = false;

    while (stepCount < maxSteps && !clickedSubmit) {
      stepCount++;
      
      // DEBUG: Log all visible inputs
      const allInputs = await page.$$("input");
      console.log(`\n[AutoApply Debug] Step ${stepCount}: Found ${allInputs.length} total inputs. Visible ones:`);
      for (const inEl of allInputs) {
          try {
            const type = await inEl.evaluate((el: any) => el.getAttribute("type") || "");
            if (type === "hidden") continue;
            const isVisible = await inEl.evaluate((el: any) => {
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
            });
            if (isVisible) {
               const name = await inEl.evaluate((el: any) => el.getAttribute("name") || "");
               const id = await inEl.evaluate((el: any) => el.id || "");
               const val = await inEl.evaluate((el: any) => el.value || "");
               console.log(`  -> Input: type="${type}" name="${name}" id="${id}" value="${val}"`);
            }
          } catch(e) {}
      }
      console.log(`\n`);

      // 1. Fill visible inputs on current step
      const inputs = await page.$$("input");
      
      // Detect if this is a login wall
      let isLoginPage = false;
      for (const input of inputs) {
        try {
          const type = await input.evaluate((el: any) => el.getAttribute("type")?.toLowerCase() || "");
          if (type === "password") {
            isLoginPage = true;
            break;
          }
        } catch (e) {}
      }
      
      if (isLoginPage) {
        console.log("[AutoApply] Detected a password field. This is a login/signup wall.");
        return {
          status: "failed",
          message: "Encountered a login/signup page. The platform requires authentication to apply.",
        };
      }

      for (const input of inputs) {
        // Skip invisible inputs
        let isVisible = false;
        let type = "", name = "", id = "", val = "", label = "";
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
          label = await input.evaluate((el: any) => {
            const elId = el.id;
            if (elId) {
              const lbl = document.querySelector(`label[for="${elId}"]`);
              if (lbl) return lbl.textContent?.trim() || "";
            }
            const parentLabel = el.closest('label');
            if (parentLabel) return parentLabel.textContent?.trim() || "";
            return el.getAttribute('aria-label') || el.getAttribute('placeholder') || "";
          });
        } catch (e) {
          continue;
        }
        
        const attrString = `${type} ${name} ${id} ${label}`;

        if (type === "file" && tempResumePath && !resumeUploaded) {
          try {
            console.log(`[AutoApply] Found file input for resume (${attrString}). Uploading ${tempResumePath}`);
            await input.uploadFile(tempResumePath);
            resumeUploaded = true;
          } catch (e) { console.error(`[AutoApply] Failed to upload resume:`, e); }
        } else if (attrString.includes("email") && !val) {
          emailFound = true;
          try { 
            console.log(`[AutoApply] Typed field: [email] Value: ${profile.email}`);
            await input.type(profile.email || ""); 
          } catch (e) {}
        } else if ((attrString.includes("name") || attrString.includes("first") || attrString.includes("last")) && !val) {
          nameFound = true;
          try { 
            const nameParts = (profile.name || "").trim().split(/\s+/);
            const firstName = nameParts[0] || "";
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : firstName;

            if (attrString.includes("first")) {
              console.log(`[AutoApply] Typed field: [firstName] Value: ${firstName}`);
              await input.type(firstName);
            } else if (attrString.includes("last")) {
              console.log(`[AutoApply] Typed field: [lastName] Value: ${lastName}`);
              await input.type(lastName);
            } else {
              console.log(`[AutoApply] Typed field: [fullName] Value: ${profile.name}`);
              await input.type(profile.name || "");
            }
          } catch (e) {}
        } else if ((attrString.includes("phone") || attrString.includes("tel") || attrString.includes("mobile")) && !val) {
          try { 
            console.log(`[AutoApply] Typed field: [phone] Value: ${profile.phone || "0000000000"}`);
            await input.type(profile.phone || "0000000000"); 
          } catch (e) {}
        } else if (type === "radio" || type === "checkbox") {
          try {
            const valToClick = await input.evaluate((el: any) => el.value?.toLowerCase() || "");
            const labelText = await input.evaluate((el: any) => {
              const id = el.id;
              if (id) {
                const label = document.querySelector(`label[for="${id}"]`);
                if (label) return label.textContent?.toLowerCase() || "";
              }
              const parentLabel = el.closest('label');
              if (parentLabel) return parentLabel.textContent?.toLowerCase() || "";
              return "";
            });
            
            const contextStr = `${attrString} ${valToClick} ${labelText}`.toLowerCase();
            
            if (contextStr.includes("gender") || contextStr.includes("male") || contextStr.includes("female") || contextStr.includes("sex")) {
               if (profile.gender && contextStr.includes(profile.gender.toLowerCase())) {
                   console.log(`[AutoApply] Clicked field: [${name || id}] Value: ${profile.gender}`);
                   await input.evaluate((el: any) => el.click());
               }
            } else if (contextStr.includes("veteran")) {
               if (profile.veteranStatus && contextStr.includes(profile.veteranStatus.toLowerCase())) {
                  console.log(`[AutoApply] Clicked field: [${name || id}] Value: ${profile.veteranStatus}`);
                  await input.evaluate((el: any) => el.click());
               }
            } else if (contextStr.includes("disability")) {
               if (profile.disabilityStatus && contextStr.includes(profile.disabilityStatus.toLowerCase())) {
                  console.log(`[AutoApply] Clicked field: [${name || id}] Value: ${profile.disabilityStatus}`);
                  await input.evaluate((el: any) => el.click());
               }
            } else if (contextStr.includes("relocate")) {
               const wantRelocate = profile.willingToRelocate ? "yes" : "no";
               if (contextStr.includes(wantRelocate)) {
                  console.log(`[AutoApply] Clicked field: [${name || id}] Value: ${wantRelocate}`);
                  await input.evaluate((el: any) => el.click());
               }
            } else if (contextStr.includes("agree") || contextStr.includes("terms") || contextStr.includes("policy") || contextStr.includes("conditions") || contextStr.includes("consent")) {
               console.log(`[AutoApply] Clicked field: [${name || id}] Value: Checked (Agreed)`);
               await input.evaluate((el: any) => el.click());
            } else if (contextStr.includes("yes") || contextStr.includes("no") || contextStr.includes("true") || contextStr.includes("false")) {
               console.log(`[AutoApply] Unknown radio/checkbox field encountered: ${contextStr}. Skipping field as per user instructions.`);
               continue;
            } else {
               console.log(`[AutoApply] Unknown radio/checkbox field encountered: ${contextStr}. Skipping field as per user instructions.`);
               continue;
            }
          } catch(e){}
        } else if (!val && (type === "text" || type === "number" || type === "url" || type === "date" || !type)) {
          try {
            const attrLower = attrString.toLowerCase();
                        if (attrLower.includes("year") || attrLower.includes("experience")) {
              const valToType = profile.yearsOfExperience;
              if (valToType) { console.log(`[AutoApply] Typed field: [${name || id}] Value: ${valToType}`); await input.type(valToType); }
              else return { status: "failed", message: `Failed because of field [label="${label}", name="${name}", id="${id}"] missing years of experience in profile.` };
            }
            else if (attrLower.includes("city") || attrLower.includes("loc")) {
              const valToType = profile.preferredLocations?.[0];
              if (valToType) { console.log(`[AutoApply] Typed field: [${name || id}] Value: ${valToType}`); await input.type(valToType); }
              else return { status: "failed", message: `Failed because of field [label="${label}", name="${name}", id="${id}"] missing preferred location in profile.` };
            }
            else if (attrLower.includes("salary") || attrLower.includes("pay") || attrLower.includes("ctc")) {
              const valToType = profile.expectedSalary;
              if (valToType) { console.log(`[AutoApply] Typed field: [${name || id}] Value: ${valToType}`); await input.type(valToType); }
              else return { status: "failed", message: `Failed because of field [label="${label}", name="${name}", id="${id}"] missing expected salary in profile.` };
            }
            else if (attrLower.includes("github")) {
              const valToType = profile.githubUrl;
              if (valToType) { console.log(`[AutoApply] Typed field: [${name || id}] Value: ${valToType}`); await input.type(valToType); }
              else return { status: "failed", message: `Failed because of field [label="${label}", name="${name}", id="${id}"] missing github in profile.` };
            }
            else if (attrLower.includes("portfolio") || attrLower.includes("website") || attrLower.includes("site")) {
              const valToType = profile.portfolioUrl;
              if (valToType) { console.log(`[AutoApply] Typed field: [${name || id}] Value: ${valToType}`); await input.type(valToType); }
              else return { status: "failed", message: `Failed because of field [label="${label}", name="${name}", id="${id}"] missing portfolio in profile.` };
            }
            else if (attrLower.includes("linkedin")) {
              const valToType = profile.linkedinUrl;
              if (valToType) { console.log(`[AutoApply] Typed field: [${name || id}] Value: ${valToType}`); await input.type(valToType); }
              else return { status: "failed", message: `Failed because of field [label="${label}", name="${name}", id="${id}"] missing linkedin in profile.` };
            }
            else if (attrLower.includes("notice") || attrLower.includes("period")) {
              const valToType = profile.noticePeriod;
              if (valToType) { console.log(`[AutoApply] Typed field: [${name || id}] Value: ${valToType}`); await input.type(valToType); }
              else return { status: "failed", message: `Failed because of field [label="${label}", name="${name}", id="${id}"] missing notice period in profile.` };
            }
            else if (attrLower.includes("school") || attrLower.includes("college") || attrLower.includes("university")) {
              const valToType = profile.college || profile.school;
              if (valToType) { console.log(`[AutoApply] Typed field: [${name || id}] Value: ${valToType}`); await input.type(valToType); }
              else return { status: "failed", message: `Failed because of field [label="${label}", name="${name}", id="${id}"] missing school/college in profile.` };
            }
            else if (attrLower.includes("company") || attrLower.includes("employer")) {
              return { status: "failed", message: `Failed because of field [label="${label}", name="${name}", id="${id}"] which is company/employer, and no mapping exists in profile.` };
            }
            else if (attrLower.includes("birth") || attrLower.includes("dob")) {
              const valToType = profile.birthDate;
              if (valToType) { console.log(`[AutoApply] Typed field: [${name || id}] Value: ${valToType}`); await input.type(valToType); }
              else return { status: "failed", message: `Failed because of field [label="${label}", name="${name}", id="${id}"] missing birth date in profile.` };
            }
            else if (attrLower === "age" || attrLower.includes(" age") || attrLower.includes("age ") || attrLower.includes("_age") || attrLower.includes("age_")) {
              if (profile.birthDate) {
                const age = Math.floor((new Date().getTime() - new Date(profile.birthDate).getTime()) / 31557600000).toString();
                console.log(`[AutoApply] Typed field: [${name || id}] Value: ${age}`); await input.type(age);
              } else return { status: "failed", message: `Failed because of field [label="${label}", name="${name}", id="${id}"] missing birth date to calculate age.` };
            }
            else if (attrLower.includes("country")) {
              return { status: "failed", message: `Failed because of field [label="${label}", name="${name}", id="${id}"] which asks for country, and no explicit country exists in profile.` };
            }
            else if (type === "number") {
              return { status: "failed", message: `Failed because of field [label="${label}", name="${name}", id="${id}"] which is an unknown number field.` };
            }
            else {
              console.log(`[AutoApply] Unknown text field encountered: ${attrString}. System does not have a mapped value.`);
              return { status: "failed", message: `Failed because of field [label="${label}", name="${name}", id="${id}"] which takes unknown input and the system does not have a value for it.` };
            }
          } catch(e){}
        }
      }

      // Process dropdowns
      const selects = await page.$$("select");
      for (const sel of selects) {
        try {
          const isVisible = await sel.evaluate((el: any) => window.getComputedStyle(el).visibility !== 'hidden');
          if (!isVisible) continue;
          
          const val = await sel.evaluate((el: any) => el.value);
          if (!val || val.toLowerCase().includes("select") || val === "") {
             const name = await sel.evaluate((el: any) => el.getAttribute("name") || "");
             const id = await sel.evaluate((el: any) => el.id || "");
             const options = await sel.evaluate((el: any) => Array.from(el.options).map((o: any) => ({ text: o.text.toLowerCase(), value: o.value })));
             
             const contextStr = `${name} ${id}`.toLowerCase();
             
             let selectedValue = null;
             let selectedText = null;
             
             if (contextStr.includes("gender") || contextStr.includes("sex")) {
                const target = profile.gender ? profile.gender.toLowerCase() : "";
                const opt = options.find((o:any) => o.text.includes(target));
                if (opt) { selectedValue = opt.value; selectedText = opt.text; }
             } else if (contextStr.includes("veteran")) {
                const target = profile.veteranStatus ? profile.veteranStatus.toLowerCase() : "";
                const opt = options.find((o:any) => o.text.includes(target));
                if (opt) { selectedValue = opt.value; selectedText = opt.text; }
             } else if (contextStr.includes("disability")) {
                const target = profile.disabilityStatus ? profile.disabilityStatus.toLowerCase() : "";
                const opt = options.find((o:any) => o.text.includes(target));
                if (opt) { selectedValue = opt.value; selectedText = opt.text; }
             } else if (contextStr.includes("relocate")) {
                const target = profile.willingToRelocate ? "yes" : "no";
                const opt = options.find((o:any) => o.text.includes(target) || (target === "yes" && o.text.includes("will")));
                if (opt) { selectedValue = opt.value; selectedText = opt.text; }
             } else if (contextStr.includes("country")) {
                const opt = options.find((o:any) => o.text.includes("india") || o.text.includes("united states") || o.text.includes("us"));
                if (opt) { selectedValue = opt.value; selectedText = opt.text; }
             } else if (contextStr.includes("state") || contextStr.includes("province")) {
                selectedValue = options.length > 1 ? options[1].value : null;
                selectedText = options.length > 1 ? options[1].text : null;
             }
             
             if (selectedValue !== null) {
                console.log(`[AutoApply] Selected dropdown field: [${name || id}] Value: ${selectedText}`);
                await sel.evaluate((el: any, sVal: string) => {
                  el.value = sVal;
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                }, selectedValue);
             } else {
                console.log(`[AutoApply] Unknown dropdown field encountered: ${contextStr}. Skipping field as per user instructions.`);
                continue;
             }
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
            console.log(`[AutoApply] Found submit button ("${text}"). Clicking.`);
            await btn.evaluate((b: any) => b.click());
            clickedSubmit = true;
            movedForward = true;
            await new Promise((r) => setTimeout(r, 4000));
            break;
          } catch(e) {}
        } else if (text.includes("next") || text.includes("continue") || text.includes("review")) {
          console.log(`[AutoApply] Found next/continue button ("${text}"). Storing for fallback.`);
          reviewOrNextButton = btn;
        }
      }

      if (clickedSubmit) break;

      // If we didn't find a submit button, try clicking Next/Review
      if (reviewOrNextButton) {
        try {
          console.log(`[AutoApply] Clicking next/continue button.`);
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
