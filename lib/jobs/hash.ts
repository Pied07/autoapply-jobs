import crypto from "crypto";
import type { NormalizedJob } from "@/types/job";

const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function createJobHash(job: Pick<NormalizedJob, "title" | "company" | "location">) {
  const stableKey = [job.company, job.title, job.location].map(clean).join("|");
  return crypto.createHash("sha256").update(stableKey).digest("hex");
}
