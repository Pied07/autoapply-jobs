import type { NormalizedJob } from "@/types/job";
import { normalizeJob } from "../normalizer";
import type { IndianLocation } from "@/types/profile";

// TimesJobs — scrapes their public search page

export async function scrapeTimesJobs(params: {
  keyword: string;
  location: IndianLocation;
  experience?: string;
}): Promise<NormalizedJob[]> {
  const { load } = await import("cheerio");
  const { fetchWithPuppeteer } = await import("./puppeteer");

  const loc = params.location === "Remote India" ? "" : params.location;

  const url = new URL("https://www.timesjobs.com/candidate/job-search.html");
  url.searchParams.set("searchType", "personalizedSearch");
  url.searchParams.set("from", "submit");
  url.searchParams.set("txtKeywords", params.keyword || "developer");
  url.searchParams.set("txtLocation", loc);
  if (params.experience) url.searchParams.set("cboWorkExp1", params.experience);

  const html = await fetchWithPuppeteer(url.toString(), "li.clearfix");
  if (!html) return [];

  const $ = load(html);
  const jobs: NormalizedJob[] = [];

  // Strategy 1: JSON-LD
  $("script[type='application/ld+json']").each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      const items: any[] = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] !== "JobPosting") continue;
        const title = item.title ?? "";
        const company = item.hiringOrganization?.name ?? "Company not listed";
        if (!title) continue;
        jobs.push(normalizeJob({
          title,
          company,
          location: params.location,
          source: "timesjobs",
          platform: "timesjobs",
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

  // Strategy 2: HTML cards
  if (jobs.length === 0) {
    $("li.clearfix[data-job-id], .job-bx, article.srp-jobtuple-wrapper").each((_, el) => {
      const card = $(el);
      const title   = card.find("h2 a, .heading-trun, .job-title").first().text().trim();
      const company = card.find(".joblist-comp-name, .company-name, h3.joblist-comp-name").first().text().trim();
      const loc     = card.find(".srp-skills, span.sim-posted").first().text().trim();
      const salary  = card.find(".salary, .CTC").first().text().trim();
      const exp     = card.find(".experience, span.yoe").first().text().trim();
      const applyUrl = card.find("a[href*='timesjobs.com/view']").attr("href")
                    ?? card.find("h2 a").attr("href") ?? "";
      const desc    = card.find(".list-skills span, .srp-skills").map((_, s) => $(s).text().trim()).get().join(", ");

      if (!title || !company) return;

      jobs.push(normalizeJob({
        title,
        company,
        location: params.location,
        source: "timesjobs",
        platform: "timesjobs",
        applyChannel: "site",
        applyUrl: applyUrl.startsWith("http") ? applyUrl : `https://www.timesjobs.com${applyUrl}`,
        workMode: loc.toLowerCase().includes("remote") || params.location === "Remote India" ? "remote" : "office",
        jobType: "experienced",
        description: [exp, salary, desc].filter(Boolean).join(" | ").slice(0, 300),
        postedAt: new Date().toISOString(),
      }));
    });
  }

  console.log(`[TimesJobs] scraped ${jobs.length} jobs`);
  return jobs;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
