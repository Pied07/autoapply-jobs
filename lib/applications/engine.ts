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

async function applyToJob(profile: CandidateProfile, job: Awaited<ReturnType<typeof fetchJobsFromJSearch>>[number]) {
  if (job.applyChannel === "email" && !job.applyEmail) {
    return { status: "failed" as const, message: "Email application missing recruiter email." };
  }

  if (job.applyChannel === "email") {
    return { status: "applied" as const, message: `Prepared reusable email template for ${profile.name}.` };
  }

  // Attempt real automated application via the apply link
  if (job.applyUrl) {
    console.log(`[AutoApply] Attempting to apply for job: ${job.title} at ${job.company} via ${job.applyUrl}`);
    const result = await attemptAutomatedApplication(job.applyUrl, profile);
    return result;
  }

  return { status: "failed" as const, message: "No apply link available to automate." };
}

export async function runDailyApplications(db: Firestore, profile: CandidateProfile) {
  const rawJobs = await fetchJobsFromJSearch(profile);
  
  const allJobs = rawJobs
    .filter((job) => isRelevantJob(job, profile))
    .sort((a, b) => scoreJob(b, profile) - scoreJob(a, profile));

  let freshJobs = await filterNewJobsForUser(db, profile.uid, allJobs);
  
  const rows: ApplicationRecord[] = [];

  for (const job of freshJobs) {
    const result = await applyToJob(profile, job);
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

    await db.collection("users").doc(profile.uid).collection("applications").doc(row.id).set(row);
    rows.push(row);
  }

  const report = reportFromRows(profile.uid, "daily", rows, allJobs.length);
  await db.collection("users").doc(profile.uid).collection("reports").add(report);
  return report;
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
