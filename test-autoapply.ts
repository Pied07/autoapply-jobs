import { config } from "dotenv";
config({ path: ".env.local" });

import { getAdminDb } from "./lib/firebase/admin";
import { fetchJobsFromJSearch } from "./lib/jobs/fetchers";
import { attemptAutomatedApplication } from "./lib/jobs/auto-apply";
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
  
  console.log("Fetching jobs...");
  const rawJobs = await fetchJobsFromJSearch(profile);
  const relevantJobs = rawJobs.filter((job) => isRelevantJob(job, profile));
  
  console.log(`Found ${relevantJobs.length} relevant jobs.`);
  
  // Find a job with a valid applyUrl
  const jobToTest = relevantJobs.find(job => job.applyUrl && job.applyUrl.startsWith("http"));
  
  if (!jobToTest) {
    console.log("No jobs found with a valid applyUrl to test automated application.");
    return;
  }
  
  console.log(`Testing automated application for:`);
  console.log(`Title: ${jobToTest.title}`);
  console.log(`Company: ${jobToTest.company}`);
  console.log(`URL: ${jobToTest.applyUrl}`);
  
  console.log("\nAttempting auto-apply via Puppeteer... (this might take up to 30 seconds)");
  const result = await attemptAutomatedApplication(jobToTest.applyUrl as string, profile);
  
  console.log("\n=== Result ===");
  console.log(`Status: ${result.status}`);
  console.log(`Message: ${result.message}`);
  
  process.exit(0);
}

run().catch(console.error);
