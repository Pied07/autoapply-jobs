import type { NormalizedJob } from "@/types/job";
import { normalizeJob } from "../normalizer";
import type { IndianLocation } from "@/types/profile";

// Internshala — scrapes their public jobs search page HTML

const CITY_SLUG: Record<IndianLocation, string> = {
  "Bengaluru":    "bangalore",
  "Chennai":      "chennai",
  "Delhi NCR":    "delhi",
  "Hyderabad":    "hyderabad",
  "Kolkata":      "kolkata",
  "Mumbai":       "mumbai",
  "Pune":         "pune",
  "Ahmedabad":    "ahmedabad",
  "Jaipur":       "jaipur",
  "Remote India": "",
};

export async function scrapeInternshala(params: {
  keyword: string;
  location: IndianLocation;
  experience?: string;
}): Promise<NormalizedJob[]> {
  const { load } = await import("cheerio");
  const { fetchWithPuppeteer } = await import("./puppeteer");

  const kwSlug = params.keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const citySlug = CITY_SLUG[params.location] ?? "";

  const url = citySlug
    ? `https://internshala.com/jobs/keywords-${kwSlug}/in-${citySlug}/`
    : `https://internshala.com/jobs/keywords-${kwSlug}/`;

  const html = await fetchWithPuppeteer(url, ".individual_internship, .job-internship-card, [id^='job_']");
  if (!html) return [];
  const $ = load(html);
  const jobs: NormalizedJob[] = [];

  // Strategy 1: Extract JSON-LD structured data
  $("script[type='application/ld+json']").each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      const items: any[] = Array.isArray(data) ? data : data["@graph"] ?? [data];
      for (const item of items) {
        if (item["@type"] !== "JobPosting") continue;
        const title = item.title ?? "";
        const company = item.hiringOrganization?.name ?? "Company not listed";
        if (!title) continue;
        const salMin = item.baseSalary?.value?.minValue ?? undefined;
        const salMax = item.baseSalary?.value?.maxValue ?? undefined;
        jobs.push(normalizeJob({
          title,
          company,
          location: params.location,
          source: "internshala",
          platform: "internshala",
          applyChannel: "site",
          applyUrl: item.url ?? url,
          salaryMin: salMin,
          salaryMax: salMax,
          workMode: item.jobLocationType === "TELECOMMUTE" || params.location === "Remote India" ? "remote" : "office",
          jobType: "fresher",
          description: stripHtml(item.description ?? "").slice(0, 300),
          postedAt: item.datePosted ?? new Date().toISOString(),
        }));
      }
    } catch { /* skip */ }
  });

  // Strategy 2: Scrape HTML job cards
  if (jobs.length === 0) {
    $(".individual_internship, .job-internship-card, [id^='job_']").each((_, el) => {
      const card = $(el);
      const title    = card.find(".job-title, .profile, h3.job-title").first().text().trim();
      const company  = card.find(".company-name, .company_name").first().text().trim();
      const loc      = card.find(".location-name, span.location").first().text().trim();
      const salary   = card.find(".salary, .stipend").first().text().trim();
      const applyUrl = card.find("a.view_detail_button, a[href*='/jobs/details/']").attr("href") ?? "";
      const desc     = card.find(".job-description, ul.other_detail_item li")
        .map((_, li) => $(li).text().trim()).get().join(" | ");

      if (!title || !company) return;

      jobs.push(normalizeJob({
        title,
        company,
        location: params.location,
        source: "internshala",
        platform: "internshala",
        applyChannel: "site",
        applyUrl: applyUrl.startsWith("http") ? applyUrl : `https://internshala.com${applyUrl}`,
        workMode: loc.toLowerCase().includes("remote") || params.location === "Remote India" ? "remote" : "office",
        jobType: "fresher",
        description: [salary, desc].filter(Boolean).join(" | ").slice(0, 300),
        postedAt: new Date().toISOString(),
      }));
    });
  }

  console.log(`[Internshala] scraped ${jobs.length} jobs from ${url}`);
  return jobs;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
