import { config } from "dotenv";
config({ path: ".env.local" });

import { getAdminDb } from "./lib/firebase/admin";
import { fetchJobsFromJSearch } from "./lib/jobs/fetchers";
import { attemptAutomatedApplication } from "./lib/jobs/auto-apply";
import { isRelevantJob } from "./lib/jobs/matcher";
import type { CandidateProfile } from "./types/profile";

async function delay(min: number, max: number) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBatch() {
  console.log(`[Daemon] Starting application batch at ${new Date().toLocaleString()}`);
  const db = getAdminDb();
  const users = await db.collection("users").where("profileCompleted", "==", true).limit(1).get();
  
  if (users.empty) {
    console.log("[Daemon] No completed user profiles found.");
    return;
  }
  
  const profile = users.docs[0].data() as CandidateProfile;
  console.log(`[Daemon] Processing for user: ${profile.name}`);
  
  console.log("[Daemon] Fetching jobs...");
  const rawJobs = await fetchJobsFromJSearch(profile);
  const relevantJobs = rawJobs.filter((job) => isRelevantJob(job, profile) && job.applyUrl && job.applyUrl.startsWith("http"));
  
  console.log(`[Daemon] Found ${relevantJobs.length} relevant jobs with valid URLs.`);
  
  // Take up to 10 jobs
  const jobsToApply = relevantJobs.slice(0, 10);
  
  for (let i = 0; i < jobsToApply.length; i++) {
    const job = jobsToApply[i];
    console.log(`\n[Daemon] Applying to job ${i + 1}/10: ${job.title} at ${job.company}`);
    try {
       const result = await attemptAutomatedApplication(job.applyUrl as string, profile);
       console.log(`[Daemon] Result: ${result.status} - ${result.message}`);
    } catch (e) {
       console.error(`[Daemon] Error applying:`, e);
    }
    
    if (i < jobsToApply.length - 1) {
      console.log("[Daemon] Waiting 1-2 seconds before next application...");
      await delay(1000, 2000);
    }
  }
  
  console.log(`[Daemon] Batch finished. Waiting 2 hours for the next run...`);
}

async function startDaemon() {
  console.log("=== AutoApply Local Daemon Started ===");
  console.log("Will run a batch of up to 10 jobs every 2 hours, with 1-2 sec gaps between applications.");
  
  // Run immediately
  await runBatch();
  
  // Then run every 2 hours (2 * 60 * 60 * 1000 ms)
  setInterval(runBatch, 2 * 60 * 60 * 1000);
}

startDaemon().catch(console.error);
