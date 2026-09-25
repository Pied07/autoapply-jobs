import type { Firestore } from "firebase-admin/firestore";
import type { ApplicationRecord, ApplicationReport } from "@/types/application";
import type { JobSource } from "@/types/job";
import type { CandidateProfile } from "@/types/profile";
import { filterNewJobsForUser } from "@/lib/jobs/deduplicator";
import { fetchJobsFromJSearch } from "@/lib/jobs/fetchers";
import { isRelevantJob, scoreJob } from "@/lib/jobs/matcher";

import { attemptAutomatedApplication } from "@/lib/jobs/auto-apply";

function reportFromRows(
  uid: string,
  period: ApplicationReport["period"],
  rows: ApplicationRecord[],
  newRelevantJobs: number,
): ApplicationReport {
  const byChannel = { platform: 0, site: 0, email: 0 };
  const bySource: Partial<Record<JobSource, number>> = {};

  for (const row of rows) {
    if (row.status === "applied") {
      byChannel[row.channel] += 1;
      bySource[row.source] = (bySource[row.source] || 0) + 1;
    }
  }

  return {
    uid,
    period,
    from: rows.at(0)?.createdAt ?? new Date().toISOString(),
    to: new Date().toISOString(),
    newRelevantJobs,
    applied: rows.filter((row) => row.status === "applied").length,
    failed: rows.filter((row) => row.status === "failed").length,
    skipped: rows.filter((row) => row.status === "skipped").length,
    byChannel,
    bySource,
    rows,
  };
}

export async function aggregateDailyReport(db: Firestore, uid: string, totalNewRelevantJobs: number): Promise<ApplicationReport> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("applications")
    .where("createdAt", ">=", today.toISOString())
    .get();

  const rows = snapshot.docs.map((doc) => doc.data() as ApplicationRecord);
  return reportFromRows(uid, "daily", rows, totalNewRelevantJobs);
}

async function applyToJob(
  profile: CandidateProfile, 
  job: Awaited<ReturnType<typeof fetchJobsFromJSearch>>[number],
  browser?: any
) {
  if (job.applyChannel === "email" && !job.applyEmail) {
    return { status: "failed" as const, message: "Email application missing recruiter email." };
  }

  if (job.applyChannel === "email") {
    return { status: "applied" as const, message: `Prepared reusable email template for ${profile.name}.` };
  }

  // Attempt real automated application via the apply link
  if (job.applyUrl) {
    console.log(`[AutoApply] Attempting to apply for job: ${job.title} at ${job.company} via ${job.applyUrl}`);
    const result = await attemptAutomatedApplication(job.applyUrl, profile, browser);
    return result;
  }

  return { status: "failed" as const, message: "No apply link available to automate." };
}

export async function runDailyApplications(db: Firestore, profile: CandidateProfile) {
  const rawJobs = await fetchJobsFromJSearch(profile);
  
  const allJobs = rawJobs
    .filter((job) => isRelevantJob(job, profile))
    .sort((a, b) => scoreJob(b, profile) - scoreJob(a, profile));

  const allFreshJobs = await filterNewJobsForUser(db, profile.uid, allJobs);
  
  // Limit to 10 jobs per cron run. This guarantees it finishes in ~60-120 seconds, 
  // preventing Vercel 504 timeouts and OOM crashes (which happen if it runs too long).
  // The user will use an external service (or manual clicks) to trigger it frequently.
  const MAX_JOBS = 10; 
  const freshJobs = allFreshJobs.slice(0, MAX_JOBS);
  
  const rows: ApplicationRecord[] = [];

  const { getBrowser } = await import("@/lib/jobs/auto-apply");
  const browser = await getBrowser();
  
  try {
    for (const job of freshJobs) {
      console.log(`[Engine] Processing job: ${job.title} at ${job.company}`);
      const result = await applyToJob(profile, job, browser);

      const row: ApplicationRecord = {
        id: `${profile.uid}-${job.id}-${Date.now()}`,
        uid: profile.uid,
        job,
        status: result.status,
        channel: job.applyChannel,
        platform: job.platform,
        source: job.source,
        message: result.message,
        createdAt: new Date().toISOString(),
      };

      const { saveJobHash } = await import("@/lib/jobs/deduplicator");
      await saveJobHash(db, profile.uid, job);
      await db.collection("users").doc(profile.uid).collection("applications").doc(row.id).set(row);
      rows.push(row);
    }
  } finally {
    await browser.close().catch(() => {});
  }

  // If we didn't process all fresh jobs, hasMore is true
  const hasMore = allFreshJobs.length > rows.length;
  const report = {
    ...reportFromRows(profile.uid, "daily", rows, allFreshJobs.length),
    hasMore,
  };
  await db.collection("users").doc(profile.uid).collection("reports").add(report);
  return report;
}

export async function sendDailyJobAlerts(db: Firestore, profile: CandidateProfile) {
  const rawJobs = await fetchJobsFromJSearch(profile);
  
  const allJobs = rawJobs
    .filter((job) => isRelevantJob(job, profile) && job.applyUrl)
    .sort((a, b) => scoreJob(b, profile) - scoreJob(a, profile));

  const newJobs = await filterNewJobsForUser(db, profile.uid, allJobs);
  
  const jobsToAlert = newJobs;

  // Save hashes so we don't alert about these jobs again tomorrow
  const { saveJobHash } = await import("@/lib/jobs/deduplicator");
  for (const job of jobsToAlert) {
    await saveJobHash(db, profile.uid, job);
    
    // Also save them into applications list as 'failed' (which acts as pending) so they show up in UI
    const row: ApplicationRecord = {
      id: `${profile.uid}-${job.id}-${Date.now()}`,
      uid: profile.uid,
      job,
      status: "failed", // Pending manual apply
      channel: job.applyChannel,
      platform: job.platform,
      source: job.source,
      message: "Pending manual application via alert",
      createdAt: new Date().toISOString(),
    };
    await db.collection("users").doc(profile.uid).collection("applications").doc(row.id).set(row);
  }

  return jobsToAlert;
}

export async function buildWeeklyReport(db: Firestore, uid: string) {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("applications")
    .where("createdAt", ">=", since.toISOString())
    .get();

  const rows = snapshot.docs.map((doc) => doc.data() as ApplicationRecord);
  const report = reportFromRows(uid, "weekly", rows, rows.length);
  await db.collection("users").doc(uid).collection("reports").add(report);

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  return report;
}
