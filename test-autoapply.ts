import { config } from "dotenv";
config({ path: ".env.local" });

import { getAdminDb } from "./lib/firebase/admin";
import { fetchJobsFromJSearch } from "./lib/jobs/fetchers";
import { attemptAutomatedApplication } from "./test-autoapply-engine";
import { isRelevantJob } from "./lib/jobs/matcher";
import type { CandidateProfile } from "./types/profile";

async function run() {
  console.log("Starting Auto-Apply Test...");
  const db = getAdminDb();
  const users = await db.collection("users").where("profileCompleted", "==", true).limit(1).get();
  
  if (users.empty) {
    console.log("No completed user profiles found in the database.");
    return;
  }
  
  const profile = users.docs[0].data() as CandidateProfile;
  console.log(`Found user profile: ${profile.name} (${profile.email})`);
  
  console.log("Fetching jobs from JSearch...");
  const rawJobs = await fetchJobsFromJSearch(profile);
  const jobsWithUrls = rawJobs.filter(job => {
    if (!job.applyUrl) return false;
    const url = job.applyUrl.toLowerCase();
    const isNativeBoard = ["linkedin.com", "indeed.com", "naukri.com", "foundit", "timesjobs.com", "internshala.com"].some(domain => url.includes(domain));
    return !isNativeBoard;
  });
  const jobsToTest = jobsWithUrls.slice(0, 10);
  
  if (jobsToTest.length === 0) {
    console.log("No relevant jobs with apply links found.");
    return;
  }
  
  console.log(`Found ${jobsToTest.length} jobs to test. Starting bulk apply...`);
  
  const { getBrowser } = await import("./test-autoapply-engine");
  const browser = await getBrowser();
  
  try {
    for (let i = 0; i < jobsToTest.length; i++) {
      const job = jobsToTest[i];
      console.log(`\n[${i+1}/${jobsToTest.length}] Testing automated application for:`);
      console.log(`Title: ${job.title}`);
      console.log(`Company: ${job.company}`);
      console.log(`URL: ${job.applyUrl}`);
      
      const result = await attemptAutomatedApplication(job.applyUrl, profile, browser);
      
      console.log(`\n=== Result for ${job.company} ===`);
      console.log(`Status: ${result.status}`);
      console.log(`Message: ${result.message}`);
    }
  } finally {
    await browser.close().catch(() => {});
  }
  
  process.exit(0);
}

run().catch(console.error);
