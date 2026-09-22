import type { NormalizedJob } from "@/types/job";
import { normalizeJob } from "../normalizer";
import type { IndianLocation } from "@/types/profile";

async function scrapeEmailFromWebsite(url: string): Promise<string | null> {
  if (!url || url.includes("linkedin.com") || url.includes("indeed.com") || url.includes("glassdoor.com")) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500); // 3.5s timeout
    
    const res = await fetch(url, { 
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    }).catch(() => null);
    
    clearTimeout(timeout);
    
    if (!res || !res.ok) return null;
    const text = await res.text();
    
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const found = text.match(emailRegex) || [];
    
    // Filter out common false positives
    const valid = found.filter(e => {
      const lower = e.toLowerCase();
      return !lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.jpeg') 
             && !lower.endsWith('.gif') && !lower.endsWith('.webp') && !lower.includes('sentry') 
             && !lower.includes('wixpress') && !lower.includes('example.com') && !lower.includes('domain.com');
    });
    
    if (valid.length > 0) {
      // Prefer hr@, careers@, jobs@
      const priority = valid.find(e => e.toLowerCase().startsWith('hr@') || e.toLowerCase().startsWith('careers@') || e.toLowerCase().startsWith('jobs@'));
      return priority || valid[0];
    }
    return null;
  } catch(e) {
    return null;
  }
}

export async function fetchJobsFromJSearch(params: {
  keyword: string;
  location: IndianLocation;
  platformName: string;
  queryOverride?: string;
}): Promise<NormalizedJob[]> {
  const apiKey = process.env.RAPIDAPI_KEY || "";
  if (!apiKey) {
    console.warn("[JSearch] No RAPIDAPI_KEY found.");
    return [];
  }

  const query = params.queryOverride || `${params.keyword} in ${params.location === "Remote India" ? "India" : params.location}`;
  
  const url = new URL("https://jsearch.p.rapidapi.com/search-v2");
  url.searchParams.set("query", query);
  url.searchParams.set("page", "1");
  url.searchParams.set("num_pages", "4");

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
      next: { revalidate: 43200 },
    });

    if (!res.ok) {
      console.error(`[JSearch] HTTP error! status: ${res.status}`);
      return [];
    }

    const json = await res.json() as { data?: { jobs?: any[] } };
    const jobs = json.data?.jobs ?? [];

    const mappedPromises = jobs.map(async (job: any): Promise<NormalizedJob | null> => {
      const title = job.job_title ?? "";
      const company = job.employer_name ?? "";
      if (!title || !company) return null;

      const isRemote = job.job_is_remote === true;
      const fullDesc = job.job_description ?? "";
      
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
      const foundEmails = fullDesc.match(emailRegex) || [];
      let extractedEmail = foundEmails.length > 0 ? foundEmails[0] : null;

      const applyUrl = job.job_apply_link ?? job.job_google_link ?? job.employer_website ?? "";

      // 1. Try to actually scrape the company website for real emails!
      if (!extractedEmail && job.employer_website) {
        extractedEmail = await scrapeEmailFromWebsite(job.employer_website);
      }

      // 2. Fallback: guess career email from employer website
      if (!extractedEmail && job.employer_website) {
        try {
          const domain = new URL(job.employer_website).hostname.replace(/^www\./, "");
          if (domain && !domain.includes("linkedin.com") && !domain.includes("indeed.com") && !domain.includes("google.com")) {
            extractedEmail = `careers@${domain}`;
          }
        } catch (e) {}
      }

      const desc = fullDesc.slice(0, 300);

      return normalizeJob({
        title,
        company,
        location: isRemote ? "Remote" : (job.job_city || params.location),
        source: params.platformName as any,
        platform: params.platformName,
        applyChannel: extractedEmail ? "email" : "site",
        applyEmail: extractedEmail || undefined,
        applyUrl: applyUrl,
        workMode: isRemote ? "remote" : "office",
        jobType: "experienced",
        description: desc,
        postedAt: job.job_posted_at_datetime_utc ?? new Date().toISOString(),
      });
    });

    const resolved = await Promise.all(mappedPromises);
    return resolved.filter((j): j is NormalizedJob => j !== null);
  } catch (error) {
    console.error("[JSearch] fetch error:", error);
    return [];
  }
}
