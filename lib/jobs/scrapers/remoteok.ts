import type { NormalizedJob } from "@/types/job";
import { normalizeJob } from "../normalizer";
import type { IndianLocation } from "@/types/profile";

// RemoteOK public JSON API — no key required
// https://remoteok.com/api — returns array of job objects

export async function scrapeRemoteOK(params: {
  keyword: string;
  location: IndianLocation;
  experience?: string;
}): Promise<NormalizedJob[]> {
  // RemoteOK uses tag-based search: /api?tags=react,node
  const tags = params.keyword
    .split(/[\s,]+/)
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 3)
    .join(",");

  let jobs = await fetchRemoteOK(tags);
  
  if (jobs.length === 0 && tags) {
    console.log(`[RemoteOK] no jobs found for tags="${tags}", falling back to all jobs`);
    jobs = await fetchRemoteOK("");
  }
  
  console.log(`[RemoteOK] scraped ${jobs.length} jobs`);
  return jobs;
}

async function fetchRemoteOK(tags: string): Promise<NormalizedJob[]> {
  const url = tags
    ? `https://remoteok.com/api?tags=${encodeURIComponent(tags)}`
    : "https://remoteok.com/api";

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://remoteok.com/",
      },
      cache: "no-store",
    });
  } catch (e) {
    console.error("[RemoteOK] fetch error:", e);
    return [];
  }

  if (!res.ok) {
    console.error("[RemoteOK] HTTP", res.status);
    return [];
  }

  let data: any[];
  try {
    data = await res.json();
  } catch {
    return [];
  }

  // First element is metadata, skip it
  return (Array.isArray(data) ? data : [])
    .filter((j) => j.position || j.company)
    .slice(0, 20)
    .map((job: any): NormalizedJob | null => {
      const title = job.position ?? "";
      const company = job.company ?? "";
      if (!title || !company) return null;

      return normalizeJob({
        title,
        company,
        location: "Remote",
        source: "remoteok",
        platform: "remoteok",
        applyChannel: "site",
        applyUrl: job.url ?? `https://remoteok.com/remote-jobs/${job.id}`,
        salaryMin: job.salary_min ?? undefined,
        salaryMax: job.salary_max ?? undefined,
        workMode: "remote",
        jobType: "experienced",
        description: (job.description ?? job.tags?.join(", ") ?? "").slice(0, 300),
        postedAt: job.date ?? new Date().toISOString(),
      });
    })
    .filter((j): j is NormalizedJob => j !== null);

  console.log(`[RemoteOK] scraped ${jobs.length} jobs for tags="${tags}"`);
  return jobs;
}
