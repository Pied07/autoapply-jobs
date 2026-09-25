import type { Firestore } from "firebase-admin/firestore";
import type { NormalizedJob } from "@/types/job";
import { APPLICATION_COOLDOWN_DAYS, addDays } from "@/lib/applications/rules";
import { createJobHash } from "./hash";

export async function filterNewJobsForUser(db: Firestore, uid: string, jobs: NormalizedJob[]) {
  if (jobs.length === 0) return [];
  const now = new Date();
  const freshJobs: NormalizedJob[] = [];
  
  const hashRefs = jobs.map(job => db.collection("users").doc(uid).collection("jobHashes").doc(createJobHash(job)));
  
  // db.getAll fails if we pass more than 100 documents or an empty array. We should chunk them.
  const CHUNK_SIZE = 100;
  for (let i = 0; i < hashRefs.length; i += CHUNK_SIZE) {
    const chunkRefs = hashRefs.slice(i, i + CHUNK_SIZE);
    const existingDocs = await db.getAll(...chunkRefs);
    
    for (let j = 0; j < existingDocs.length; j++) {
      const existing = existingDocs[j];
      const job = jobs[i + j];
      const expiresAt = existing.exists ? existing.data()?.expiresAt?.toDate?.() : undefined;
      
      if (existing.exists && expiresAt && expiresAt > now) {
        continue;
      }
      freshJobs.push(job);
    }
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
