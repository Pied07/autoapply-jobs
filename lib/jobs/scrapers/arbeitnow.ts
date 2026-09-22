import type { NormalizedJob } from "@/types/job";
import { normalizeJob } from "../normalizer";
import type { IndianLocation } from "@/types/profile";

// Arbeitnow public API (English Speaking Jobs in Germany / Global Remote)
// https://arbeitnow.com/api/job-board-api

export async function scrapeArbeitnow(params: {
  keyword: string;
  location: IndianLocation;
}): Promise<NormalizedJob[]> {
  const url = "https://arbeitnow.com/api/job-board-api";

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
    console.error("[Arbeitnow] fetch error:", e);
    return [];
  }

  if (!res.ok) {
    console.error("[Arbeitnow] HTTP", res.status);
    return [];
  }

  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    return [];
  }

  const keywordLower = params.keyword.toLowerCase();
  
  const jobs = (Array.isArray(data.data) ? data.data : [])
    .filter((j: unknown) => {
      // Basic keyword filtering if a keyword exists
      if (!keywordLower) return true;
      const job = j as Record<string, unknown>;
      const t = (typeof job.title === "string" ? job.title : "").toLowerCase();
      const d = (typeof job.description === "string" ? job.description : "").toLowerCase();
      return t.includes(keywordLower) || d.includes(keywordLower);
    })
    .slice(0, 20)
    .map((j: unknown): NormalizedJob | null => {
      const job = j as Record<string, unknown>;
      const title = typeof job.title === "string" ? job.title : "";
      const company = typeof job.company_name === "string" ? job.company_name : "";
      if (!title || !company) return null;

      const isRemote = job.remote === true || String(job.location).toLowerCase().includes("remote");

      return normalizeJob({
        title,
        company,
        location: typeof job.location === "string" ? job.location : "Remote",
        source: "arbeitnow" as "arbeitnow" | "remoteok", // Hacky cast for JobSource compatibility if strict
        platform: "arbeitnow",
        applyChannel: "site",
        applyUrl: typeof job.url === "string" ? job.url : "",
        workMode: isRemote ? "remote" : "office",
        jobType: "experienced",
        description: (typeof job.description === "string" ? job.description : "").replace(/<[^>]+>/g, " ").slice(0, 300),
        postedAt: typeof job.created_at === "number" ? new Date(job.created_at * 1000).toISOString() : new Date().toISOString(),
      });
    })
    .filter((j): j is NormalizedJob => j !== null);

  console.log(`[Arbeitnow] scraped ${jobs.length} jobs`);
  return jobs;
}
