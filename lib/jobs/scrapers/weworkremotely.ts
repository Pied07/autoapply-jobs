import type { NormalizedJob } from "@/types/job";
import { normalizeJob } from "../normalizer";
import type { IndianLocation } from "@/types/profile";

// We Work Remotely — public RSS feed, no key required
// https://weworkremotely.com/remote-jobs.rss

export async function scrapeWeWorkRemotely(params: {
  keyword: string;
  location: IndianLocation;
}): Promise<NormalizedJob[]> {
  // WWR supports category-filtered feeds; fall back to general
  const url = "https://weworkremotely.com/remote-jobs.rss";

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      cache: "no-store",
    });
  } catch (e) {
    console.error("[WWR] fetch error:", e);
    return [];
  }

  if (!res.ok) {
    console.error("[WWR] HTTP", res.status);
    return [];
  }

  const xml = await res.text();
  const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

  const kw = params.keyword.toLowerCase();
  const jobs: NormalizedJob[] = [];

  for (const item of items) {
    const title   = stripCdata(extractTag(item, "title"));
    const company = stripCdata(extractTag(item, "region")) || extractCompanyFromTitle(title);
    const link    = extractTag(item, "link");
    const pubDate = extractTag(item, "pubDate");
    const desc    = stripHtml(stripCdata(extractTag(item, "description")));
    const region  = stripCdata(extractTag(item, "region"));

    if (!title) continue;

    // Filter by keyword relevance
    const combined = (title + " " + desc).toLowerCase();
    if (kw && !kw.split(/[\s,]+/).some((k) => k.length > 2 && combined.includes(k))) continue;

    jobs.push(normalizeJob({
      title,
      company: company || "Company not listed",
      location: "Remote India",
      source: "weworkremotely",
      platform: "weworkremotely",
      applyChannel: "site",
      applyUrl: link,
      workMode: "remote",
      jobType: "experienced",
      description: (region ? `Region: ${region}. ` : "") + desc.slice(0, 250),
      postedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
    }));

    if (jobs.length >= 15) break;
  }

  console.log(`[WWR] scraped ${jobs.length} jobs for "${kw}"`);
  return jobs;
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.trim() ?? "";
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractCompanyFromTitle(title: string): string {
  // WWR titles often have "Company: Role" or "Role at Company"
  const atMatch = title.match(/ at (.+)$/i);
  if (atMatch) return atMatch[1].trim();
  const colonMatch = title.match(/^([^:]+):/);
  if (colonMatch) return colonMatch[1].trim();
  return "";
}
