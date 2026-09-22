import type { NormalizedJob } from "@/types/job";
import { normalizeJob } from "../normalizer";
import type { IndianLocation } from "@/types/profile";

// Remotive free JSON API — no key required
// https://remotive.com/api/remote-jobs?search=react&limit=20

export async function scrapeRemotive(params: {
  keyword: string;
  location: IndianLocation;
  experience?: string;
}): Promise<NormalizedJob[]> {
  const url = new URL("https://remotive.com/api/remote-jobs");
  url.searchParams.set("search", params.keyword || "developer");
  url.searchParams.set("limit", "20");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
      cache: "no-store",
    });
  } catch (e) {
    console.error("[Remotive] fetch error:", e);
    return [];
  }

  if (!res.ok) {
    console.error("[Remotive] HTTP", res.status);
    return [];
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    return [];
  }

  const jobList: any[] = data?.jobs ?? [];

  const jobs = jobList
    .map((job: any): NormalizedJob | null => {
      const title = job.title ?? "";
      const company = job.company_name ?? "";
      if (!title || !company) return null;

      return normalizeJob({
        title,
        company,
        location: "Remote India",
        source: "remotive",
        platform: "remotive",
        applyChannel: "site",
        applyUrl: job.url ?? "",
        workMode: "remote",
        jobType: "experienced",
        description: stripHtml(job.description ?? "").slice(0, 300),
        postedAt: job.publication_date ?? new Date().toISOString(),
      });
    })
    .filter((j): j is NormalizedJob => j !== null);

  console.log(`[Remotive] scraped ${jobs.length} jobs for "${params.keyword}"`);
  return jobs;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
