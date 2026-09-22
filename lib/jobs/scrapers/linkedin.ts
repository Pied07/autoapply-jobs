import type { NormalizedJob } from "@/types/job";
import { normalizeJob } from "../normalizer";
import type { IndianLocation } from "@/types/profile";

// Scrapes LinkedIn's public job search page HTML (no login, no API key)
// URL: https://www.linkedin.com/jobs/search/?keywords=...&location=...

const LOCATION_FULL: Record<IndianLocation, string> = {
  "Bengaluru":    "Bengaluru, Karnataka, India",
  "Chennai":      "Chennai, Tamil Nadu, India",
  "Delhi NCR":    "Delhi, India",
  "Hyderabad":    "Hyderabad, Telangana, India",
  "Kolkata":      "Kolkata, West Bengal, India",
  "Mumbai":       "Mumbai, Maharashtra, India",
  "Pune":         "Pune, Maharashtra, India",
  "Ahmedabad":    "Ahmedabad, Gujarat, India",
  "Jaipur":       "Jaipur, Rajasthan, India",
  "Remote India": "India",
};

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Cache-Control": "max-age=0",
};

export async function scrapeLinkedIn(params: {
  keyword: string;
  location: IndianLocation;
  experience?: string;
  start?: number;
}): Promise<NormalizedJob[]> {
  const { load } = await import("cheerio");

  const fullLocation = LOCATION_FULL[params.location] ?? "India";
  const keyword = [params.keyword, params.experience ? `${params.experience} years experience` : ""]
    .filter(Boolean).join(" ");

  // Scrape LinkedIn's public job search page
  const url = new URL("https://www.linkedin.com/jobs/search/");
  url.searchParams.set("keywords", keyword);
  url.searchParams.set("location", fullLocation);
  url.searchParams.set("trk", "public_jobs_jobs-search-bar_search-submit");
  url.searchParams.set("position", "1");
  url.searchParams.set("pageNum", String(Math.floor((params.start ?? 0) / 25)));
  if (params.location === "Remote India") url.searchParams.set("f_WT", "2");

  let res: Response;
  try {
    res = await fetch(url.toString(), { headers: BROWSER_HEADERS, cache: "no-store" });
  } catch (e) {
    console.error("[LinkedIn] fetch error:", e);
    return [];
  }

  if (!res.ok) {
    console.error("[LinkedIn] HTTP", res.status);
    return [];
  }

  const html = await res.text();
  const $ = load(html);
  const jobs: NormalizedJob[] = [];

  // LinkedIn server-renders job cards in <ul class="jobs-search__results-list">
  $("ul.jobs-search__results-list li, .base-card").each((_, el) => {
    const card = $(el);
    const title       = card.find(".base-search-card__title, h3.base-search-card__title").text().trim();
    const company     = card.find(".base-search-card__subtitle, h4.base-search-card__subtitle").text().trim();
    const locationTxt = card.find(".job-search-card__location").text().trim();
    const applyUrl    = card.find("a.base-card__full-link, a.base-search-card__full-link").attr("href") ?? "";
    const postedAt    = card.find("time").attr("datetime") ?? new Date().toISOString();

    if (!title || !company) return;

    jobs.push(normalizeJob({
      title,
      company,
      location: params.location,
      source: "linkedin",
      platform: "linkedin",
      applyChannel: "platform",
      applyUrl: applyUrl.split("?")[0],
      workMode: locationTxt.toLowerCase().includes("remote") || params.location === "Remote India" ? "remote" : "office",
      jobType: "experienced",
      description: locationTxt,
      postedAt,
    }));
  });

  // Fallback: LinkedIn sometimes embeds JSON-LD with job data
  if (jobs.length === 0) {
    $("script[type='application/ld+json']").each((_, el) => {
      try {
        const data = JSON.parse($(el).html() ?? "");
        const items: any[] = Array.isArray(data) ? data : data["@graph"] ?? (data["@type"] ? [data] : []);
        for (const item of items) {
          if (item["@type"] !== "JobPosting") continue;
          const title   = item.title ?? "";
          const company = item.hiringOrganization?.name ?? "";
          const loc     = item.jobLocation?.address?.addressLocality ?? params.location;
          const applyUrl = item.url ?? item.sameAs ?? "";
          if (!title) continue;
          jobs.push(normalizeJob({
            title,
            company,
            location: params.location,
            source: "linkedin",
            platform: "linkedin",
            applyChannel: "platform",
            applyUrl,
            workMode: item.jobLocationType === "TELECOMMUTE" ? "remote" : "office",
            jobType: "experienced",
            description: item.description?.slice(0, 300) ?? loc,
            postedAt: item.datePosted ?? new Date().toISOString(),
          }));
        }
      } catch { /* skip invalid JSON-LD */ }
    });
  }

  console.log(`[LinkedIn] scraped ${jobs.length} jobs for "${keyword}" in ${fullLocation}`);
  return jobs;
}
