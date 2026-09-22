import type { NormalizedJob } from "@/types/job";
import type { IndianLocation } from "@/types/profile";
import { normalizeJob } from "../normalizer";
import { extractCareerEmails } from "../email-extractor";

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickTag(item: string, tag: string): string {
  return decodeXml(item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] ?? "");
}

function locationForIndeed(location: IndianLocation): string {
  if (location === "Remote India") return "remote";
  if (location === "Delhi NCR") return "Delhi";
  return location;
}

export async function scrapeIndeed(params: {
  keyword: string;
  location: IndianLocation;
  experience?: string;
  start?: number;
}): Promise<NormalizedJob[]> {
  const keyword = [params.keyword || "developer", params.experience ? `${params.experience} years` : ""]
    .filter(Boolean)
    .join(" ");
  const url = new URL("https://in.indeed.com/rss");
  url.searchParams.set("q", keyword);
  url.searchParams.set("l", locationForIndeed(params.location));
  url.searchParams.set("sort", "date");
  url.searchParams.set("limit", "50");

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        Accept: "application/rss+xml,application/xml,text/xml,*/*",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.warn(`[Indeed] RSS failed: ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const jobs = Array.from(xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi))
      .map((match) => {
        const item = match[1] ?? "";
        const rawTitle = pickTag(item, "title");
        const [titlePart, companyPart] = rawTitle.split(/\s+-\s+/);
        const title = (titlePart || rawTitle).trim();
        const company = (companyPart || "Company not listed").trim();
        const description = pickTag(item, "description");
        const applyEmail = extractCareerEmails(description)[0];
        const applyUrl = pickTag(item, "link");

        if (!title) return null;

        return normalizeJob({
          title,
          company,
          location: params.location,
          source: "indeed",
          platform: "indeed",
          applyChannel: applyEmail ? "email" : "site",
          applyEmail,
          applyUrl,
          workMode: params.location === "Remote India" || description.toLowerCase().includes("remote") ? "remote" : "office",
          jobType: params.experience?.toLowerCase().includes("fresher") ? "fresher" : "experienced",
          description: description.slice(0, 500),
          postedAt: pickTag(item, "pubDate") || new Date().toISOString(),
        });
      })
      .filter((job): job is NormalizedJob => job !== null)
      .slice(0, 50);

    console.log(`[Indeed RSS] scraped ${jobs.length} jobs`);
    return jobs;
  } catch (error) {
    console.error("[Indeed] fetch error:", error);
    return [];
  }
}
