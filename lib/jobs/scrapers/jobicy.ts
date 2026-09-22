import type { NormalizedJob } from "@/types/job";
import { normalizeJob } from "../normalizer";
import type { IndianLocation } from "@/types/profile";

// Jobicy public API (Remote jobs)
// https://jobicy.com/api/v2/remote-jobs

export async function scrapeJobicy(params: {
  keyword: string;
  location: IndianLocation;
}): Promise<NormalizedJob[]> {
  const url = "https://jobicy.com/api/v2/remote-jobs";

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
      cache: "no-store",
    });
  } catch (e) {
    console.error("[Jobicy] fetch error:", e);
    return [];
  }

  if (!res.ok) {
    console.error("[Jobicy] HTTP", res.status);
    return [];
  }

  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    return [];
  }

  const keywordLower = params.keyword.toLowerCase();
  
  const jobs = (Array.isArray(data.jobs) ? data.jobs : [])
    .filter((j: unknown) => {
      // Basic keyword filtering if a keyword exists
      if (!keywordLower) return true;
      const job = j as Record<string, unknown>;
      const t = (typeof job.jobTitle === "string" ? job.jobTitle : "").toLowerCase();
      const d = (typeof job.jobDescription === "string" ? job.jobDescription : "").toLowerCase();
      return t.includes(keywordLower) || d.includes(keywordLower);
    })
    .slice(0, 20)
    .map((j: unknown): NormalizedJob | null => {
      const job = j as Record<string, unknown>;
      const title = typeof job.jobTitle === "string" ? job.jobTitle : "";
      const company = typeof job.companyName === "string" ? job.companyName : "";
      if (!title || !company) return null;

      let min = parseInt(String(job.salaryMin), 10);
      let max = parseInt(String(job.salaryMax), 10);
      
      // Convert USD to INR roughly for display if they are USD
      if (job.salaryCurrency === "USD") {
          min = min * 83;
          max = max * 83;
      }

      return normalizeJob({
        title,
        company,
        location: typeof job.jobGeo === "string" ? job.jobGeo : "Remote",
        source: "jobicy" as "jobicy" | "remoteok", // Needs to be added to types
        platform: "jobicy",
        applyChannel: "site",
        applyUrl: typeof job.url === "string" ? job.url : "",
        salaryMin: isNaN(min) || min === 0 ? undefined : min,
        salaryMax: isNaN(max) || max === 0 ? undefined : max,
        workMode: "remote",
        jobType: "experienced",
        description: (typeof job.jobDescription === "string" ? job.jobDescription : "").replace(/<[^>]+>/g, " ").slice(0, 300),
        postedAt: typeof job.pubDate === "string" ? job.pubDate : new Date().toISOString(),
      });
    })
    .filter((j): j is NormalizedJob => j !== null);

  console.log(`[Jobicy] scraped ${jobs.length} jobs`);
  return jobs;
}
