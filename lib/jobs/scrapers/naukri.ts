import type { NormalizedJob } from "@/types/job";
import type { IndianLocation, WorkMode } from "@/types/profile";
import { normalizeJob } from "../normalizer";
import { extractCareerEmails } from "../email-extractor";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function asRecordArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function naukriLocation(location: IndianLocation): string {
  if (location === "Remote India") return "";
  if (location === "Delhi NCR") return "Delhi / NCR";
  return location;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function getJobList(payload: unknown): JsonRecord[] {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const candidates = [
    root.jobDetails,
    root.jobs,
    data.jobDetails,
    data.jobs,
    root.jobList,
    data.jobList,
  ];
  return candidates.map(asRecordArray).find((items) => items.length > 0) ?? [];
}

function buildJobUrl(job: JsonRecord): string {
  const raw = pickString(job.jdURL, job.jobUrl, job.url, job.applyUrl);
  if (!raw) return "https://www.naukri.com/";
  if (raw.startsWith("http")) return raw;
  return `https://www.naukri.com${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function inferWorkMode(description: string, location: IndianLocation): WorkMode {
  const lower = description.toLowerCase();
  if (location === "Remote India" || lower.includes("remote") || lower.includes("work from home")) return "remote";
  if (lower.includes("hybrid")) return "hybrid";
  return "office";
}

export async function scrapeNaukri(params: {
  keyword: string;
  location: IndianLocation;
  experience?: string;
  start?: number;
}): Promise<NormalizedJob[]> {
  const keyword = params.keyword || "developer";
  const loc = naukriLocation(params.location);
  const pages = [1, 2, 3];

  try {
    const results = await Promise.all(
      pages.map(async (pageNo) => {
        const url = new URL("https://www.naukri.com/jobapi/v3/search");
        url.searchParams.set("noOfResults", "20");
        url.searchParams.set("urlType", "search_by_keyword");
        url.searchParams.set("searchType", "adv");
        url.searchParams.set("keyword", keyword);
        url.searchParams.set("pageNo", String(pageNo));
        url.searchParams.set("seoKey", `${slug(keyword)}-jobs${loc ? `-in-${slug(loc)}` : ""}`);
        url.searchParams.set("src", "jobsearchDesk");
        if (loc) url.searchParams.set("location", loc);
        if (params.experience) url.searchParams.set("experience", params.experience);

        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "AppId": "109",
            "SystemId": "109",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
            Referer: `https://www.naukri.com/${slug(keyword)}-jobs`,
          },
          next: { revalidate: 3600 },
        });

        if (!res.ok) {
          console.warn(`[Naukri] page ${pageNo} failed: ${res.status}`);
          return [];
        }

        const payload = await res.json();
        return getJobList(payload);
      }),
    );

    const jobs = results.flat().map((job) => {
      const companyRecord = asRecord(job.company);
      const placeholders = asRecord(job.placeholders);
      const title = pickString(job.title, job.jobTitle, job.designation);
      const company = pickString(job.companyName, job.company, job.compName, companyRecord.name);
      const description = pickString(
        job.jobDescription,
        job.description,
        job.jobDesc,
        job.tagsAndSkills,
        Array.isArray(job.keySkills) ? job.keySkills.join(", ") : job.keySkills,
      );
      const applyEmail = extractCareerEmails(description)[0];
      const applyUrl = buildJobUrl(job);

      if (!title || !company) return null;

      return normalizeJob({
        title,
        company,
        location: params.location,
        source: "naukri",
        platform: "naukri",
        applyChannel: applyEmail ? "email" : "site",
        applyEmail,
        applyUrl,
        workMode: inferWorkMode(`${description} ${pickString(placeholders.location, job.location)}`, params.location),
        jobType: params.experience?.toLowerCase().includes("fresher") ? "fresher" : "experienced",
        description: description.slice(0, 500),
        postedAt: pickString(job.createdDate, job.footerPlaceholderLabel, job.postedDate) || new Date().toISOString(),
      });
    }).filter((job): job is NormalizedJob => job !== null);

    console.log(`[Naukri API] scraped ${jobs.length} jobs`);
    return jobs;
  } catch (error) {
    console.error("[Naukri] fetch error:", error);
    return [];
  }
}
