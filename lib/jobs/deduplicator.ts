import type { Firestore } from "firebase-admin/firestore";
import type { NormalizedJob } from "@/types/job";
import { APPLICATION_COOLDOWN_DAYS, addDays } from "@/lib/applications/rules";
import { createJobHash } from "./hash";

export async function filterNewJobsForUser(db: Firestore, uid: string, jobs: NormalizedJob[]) {
  const now = new Date();
  const freshJobs: NormalizedJob[] = [];

  for (const job of jobs) {
    const hash = createJobHash(job);
    const hashRef = db.collection("users").doc(uid).collection("jobHashes").doc(hash);
    const existing = await hashRef.get();
    const expiresAt = existing.exists ? existing.data()?.expiresAt?.toDate?.() : undefined;

    if (existing.exists && expiresAt && expiresAt > now) {
      continue;
    }

    freshJobs.push(job);
  }

  return freshJobs;
}

export async function saveJobHash(db: Firestore, uid: string, job: NormalizedJob) {
  const now = new Date();
  const hash = createJobHash(job);
  const hashRef = db.collection("users").doc(uid).collection("jobHashes").doc(hash);
  
  const existing = await hashRef.get();
  await hashRef.set({
    uid,
    hash,
    company: job.company,
    jobTitle: job.title,
    firstSeenAt: existing.exists ? existing.data()?.firstSeenAt : now,
    lastAppliedAt: now,
    expiresAt: addDays(now, APPLICATION_COOLDOWN_DAYS),
  });
}
