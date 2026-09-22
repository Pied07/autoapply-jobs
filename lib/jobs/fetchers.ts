import type { NormalizedJob, JobSource } from "@/types/job";
import type { CandidateProfile, IndianLocation } from "@/types/profile";
import { scrapeLinkedIn } from "./scrapers/linkedin";
import { scrapeIndeed } from "./scrapers/indeed";
import { scrapeNaukri } from "./scrapers/naukri";
import { scrapeInternshala } from "./scrapers/internshala";
import { scrapeTimesJobs } from "./scrapers/timesjobs";
import { scrapeFoundit } from "./scrapers/foundit";
import { scrapeRemoteOK } from "./scrapers/remoteok";
import { scrapeRemotive } from "./scrapers/remotive";
import { scrapeWeWorkRemotely } from "./scrapers/weworkremotely";
import { scrapeArbeitnow } from "./scrapers/arbeitnow";
import { scrapeJobicy } from "./scrapers/jobicy";
import { scrapeHasjob } from "./scrapers/hasjob";
import { enrichJobsWithCareerEmails } from "./email-extractor";

export const ALL_SOURCES: JobSource[] = [
  "linkedin", "indeed", "naukri",
  "internshala", "timesjobs", "foundit", "hasjob",
  "remoteok", "remotive", "weworkremotely", "arbeitnow", "jobicy"
];

export const INDIAN_SOURCES: JobSource[] = ["google", "linkedin", "indeed", "naukri", "internshala", "timesjobs", "foundit", "hasjob"];
export const REMOTE_SOURCES: JobSource[] = ["remoteok", "remotive", "weworkremotely", "arbeitnow", "jobicy"];

export interface JobSearchParams {
  keyword: string;
  location: IndianLocation;
  experience?: string;
  workModes?: string[];
  jobTypes?: string[];
  salaryMin?: number;
  salaryMax?: number;
  sources?: JobSource[];
}

// Run all selected scrapers in parallel and dedupe by title+company
export async function fetchJobs(params: JobSearchParams): Promise<NormalizedJob[]> {
  const sources = params.sources ?? ALL_SOURCES;

  const scraperMap: Record<JobSource, () => Promise<NormalizedJob[]>> = {
    linkedin:       () => scrapeLinkedIn({ keyword: params.keyword, location: params.location, experience: params.experience }).catch(() => []),
    indeed:         () => scrapeIndeed({ keyword: params.keyword, location: params.location, experience: params.experience }).catch(() => []),
    naukri:         () => scrapeNaukri({ keyword: params.keyword, location: params.location, experience: params.experience }).catch(() => []),
    google:         () => Promise.resolve([]),
    internshala:    () => scrapeInternshala({ keyword: params.keyword, location: params.location, experience: params.experience }).catch(() => []),
    timesjobs:      () => scrapeTimesJobs({ keyword: params.keyword, location: params.location, experience: params.experience }).catch(() => []),
    foundit:        () => scrapeFoundit({ keyword: params.keyword, location: params.location, experience: params.experience }).catch(() => []),
    hasjob:         () => scrapeHasjob({ keyword: params.keyword, location: params.location }).catch(() => []),
    remoteok:       () => scrapeRemoteOK({ keyword: params.keyword, location: params.location, experience: params.experience }).catch(() => []),
    remotive:       () => scrapeRemotive({ keyword: params.keyword, location: params.location, experience: params.experience }).catch(() => []),
    weworkremotely: () => scrapeWeWorkRemotely({ keyword: params.keyword, location: params.location }).catch(() => []),
    arbeitnow:      () => scrapeArbeitnow({ keyword: params.keyword, location: params.location }).catch(() => []),
    jobicy:         () => scrapeJobicy({ keyword: params.keyword, location: params.location }).catch(() => []),
    freshersworld:  () => Promise.resolve([]),
  };

  const tasks = sources
    .filter((s) => s in scraperMap)
    .map((s) => scraperMap[s]());

  const results = await Promise.all(tasks);
  const all = results.flat();

  // Dedupe by title+company
  const seen = new Set<string>();
  const deduped = all.filter((job) => {
    const key = `${job.title.toLowerCase().trim()}-${job.company.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return enrichJobsWithCareerEmails(deduped);
}

// Legacy wrapper used by engine.ts
export async function fetchJobsFromJSearch(profile: CandidateProfile): Promise<NormalizedJob[]> {
  return fetchJobs({
    keyword: profile.skills?.slice(0, 3).join(" ") || "developer",
    location: profile.preferredLocations?.[0] ?? "Remote India",
    workModes: profile.workModes,
    jobTypes: profile.jobTypes,
    salaryMin: profile.salaryRange?.min,
    salaryMax: profile.salaryRange?.max,
  });
}
