import type { IndianLocation, JobType, WorkMode } from "./profile";

export type JobSource =
  | "linkedin"
  | "indeed"
  | "naukri"
  | "internshala"
  | "timesjobs"
  | "foundit"
  | "freshersworld"
  | "remoteok"
  | "remotive"
  | "weworkremotely"
  | "arbeitnow"
  | "jobicy"
  | "hasjob"
  | "google";

export type JobPlatform = JobSource | "company-site" | "email";

export type ApplyChannel = "platform" | "site" | "email";

export type NormalizedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  source: JobSource;
  platform: JobPlatform;
  applyChannel: ApplyChannel;
  applyUrl?: string;
  applyEmail?: string;
  salaryMin?: number;
  salaryMax?: number;
  workMode: WorkMode;
  jobType: JobType;
  description: string;
  postedAt: string;
  discoveredAt: string;
};

export type JobHashRecord = {
  uid: string;
  hash: string;
  company: string;
  jobTitle: string;
  firstSeenAt: string;
  lastAppliedAt: string;
  expiresAt: string;
};
