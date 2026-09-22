import type { ApplyChannel, JobPlatform, JobSource, NormalizedJob } from "./job";

export type ApplicationStatus = "applied" | "failed" | "skipped";

export type ApplicationRecord = {
  id: string;
  uid: string;
  job: NormalizedJob;
  status: ApplicationStatus;
  channel: ApplyChannel;
  platform: JobPlatform;
  source: JobSource;
  message: string;
  createdAt: string;
};

export type ApplicationReport = {
  uid: string;
  period: "daily" | "weekly";
  from: string;
  to: string;
  newRelevantJobs: number;
  applied: number;
  failed: number;
  skipped: number;
  byChannel: Record<ApplyChannel, number>;
  bySource: Partial<Record<JobSource, number>>;
  rows: ApplicationRecord[];
};

export type CronLog = {
  id?: string;
  uid: string;
  job: "daily" | "weekly" | "monthly-cleanup";
  status: "success" | "failed";
  startedAt: string;
  finishedAt: string;
  usersProcessed?: number;
  applied?: number;
  failed?: number;
  skipped?: number;
  deletedHistory?: number;
  deletedJobHashes?: number;
  message: string;
  error?: string;
};
