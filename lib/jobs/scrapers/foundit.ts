import type { NormalizedJob } from "@/types/job";
import { normalizeJob } from "../normalizer";
import type { IndianLocation } from "@/types/profile";

// Foundit (formerly Monster India) — scrapes their public search page

const FOUNDIT_LOCATIONS: Record<IndianLocation, string> = {
  "Bengaluru":    "Bengaluru",
  "Chennai":      "Chennai",
  "Delhi NCR":    "Delhi NCR",
  "Hyderabad":    "Hyderabad",
  "Kolkata":      "Kolkata",
  "Mumbai":       "Mumbai",
  "Pune":         "Pune",
  "Ahmedabad":    "Ahmedabad",
  "Jaipur":       "Jaipur",
  "Remote India": "",
};

export async function scrapeFoundit(params: {
  keyword: string;
  location: IndianLocation;
  experience?: string;
}): Promise<NormalizedJob[]> {
  const { load } = await import("cheerio");
  const { fetchWithPuppeteer } = await import("./puppeteer");

  const loc = FOUNDIT_LOCATIONS[params.location] ?? "";
  const kwSlug = params.keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const locSlug = loc.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const seoKey = locSlug ? `${kwSlug}-jobs-in-${locSlug}` : `${kwSlug}-jobs`;

  const url = new URL("https://www.foundit.in/srp/results");
  url.searchParams.set("query", params.keyword || "developer");
  if (loc) url.searchParams.set("locationPreference", loc);
  url.searchParams.set("seoKey", seoKey);
  if (params.experience) url.searchParams.set("experienceRanges", params.experience);

  const html = await fetchWithPuppeteer(url.toString(), ".jobCard, .card-apply-content, [class*='JobCard']");
  if (!html) return [];
  const $ = load(html);
  const jobs: NormalizedJob[] = [];

  // Strategy 1: JSON-LD
  $("script[type='application/ld+json']").each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      const items: any[] = Array.isArray(data) ? data : data["@graph"] ?? [data];
      for (const item of items) {
        if (item["@type"] !== "JobPosting") continue;
        const title = item.title ?? "";
        const company = item.hiringOrganization?.name ?? "Company not listed";
        if (!title) continue;
        jobs.push(normalizeJob({
          title,
          company,
          location: params.location,
          source: "foundit",
          platform: "foundit",
          applyChannel: "site",
          applyUrl: item.url ?? "",
          workMode: params.location === "Remote India" ? "remote" : "office",
          jobType: "experienced",
          description: stripHtml(item.description ?? "").slice(0, 300),
          postedAt: item.datePosted ?? new Date().toISOString(),
        }));
      }
    } catch { /* skip */ }
  });

  // Strategy 2: Embedded JSON in Next.js __NEXT_DATA__
  if (jobs.length === 0) {
    const nextData = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/)?.[1];
    if (nextData) {
      try {
        const parsed = JSON.parse(nextData);
        const jobList: any[] =
          parsed?.props?.pageProps?.jobSearchResults?.jobListings ??
          parsed?.props?.pageProps?.searchResults?.jobs ??
          parsed?.props?.pageProps?.data?.jobs ?? [];
        for (const job of jobList) {
          const title = job.title ?? job.jobTitle ?? "";
          const company = job.company?.name ?? job.companyName ?? "";
          if (!title || !company) continue;
          jobs.push(normalizeJob({
            title,
            company,
            location: params.location,
            source: "foundit",
            platform: "foundit",
            applyChannel: "site",
            applyUrl: job.applyUrl ?? job.detailUrl ? `https://www.foundit.in${job.detailUrl}` : "https://www.foundit.in",
            workMode: params.location === "Remote India" ? "remote" : "office",
            jobType: "experienced",
            description: stripHtml(job.snippet ?? job.description ?? "").slice(0, 300),
            postedAt: job.postedDate ?? new Date().toISOString(),
          }));
        }
      } catch { /* skip */ }
    }
  }

  // Strategy 3: HTML cards
  if (jobs.length === 0) {
    $(".jobCard, .card-apply-content, [class*='JobCard']").each((_, el) => {
      const card = $(el);
      const title   = card.find("[class*='jobTitle'], h3, .job-title").first().text().trim();
      const company = card.find("[class*='companyName'], .company").first().text().trim();
      const applyUrl = card.find("a").first().attr("href") ?? "";
      const desc    = card.find("[class*='description'], .skills").first().text().trim();
      if (!title || !company) return;
      jobs.push(normalizeJob({
        title,
        company,
        location: params.location,
        source: "foundit",
        platform: "foundit",
        applyChannel: "site",
        applyUrl: applyUrl.startsWith("http") ? applyUrl : `https://www.foundit.in${applyUrl}`,
        workMode: params.location === "Remote India" ? "remote" : "office",
        jobType: "experienced",
        description: desc.slice(0, 300),
        postedAt: new Date().toISOString(),
      }));
    });
  }

  console.log(`[Foundit] scraped ${jobs.length} jobs`);
  return jobs;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
