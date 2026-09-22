import type { NormalizedJob } from "@/types/job";
import { normalizeJob } from "../normalizer";
import type { IndianLocation } from "@/types/profile";

// Hasjob (HasGeek) public Atom Feed
// https://hasjob.co/feed

export async function scrapeHasjob(params: {
  keyword: string;
  location: IndianLocation;
}): Promise<NormalizedJob[]> {
  const url = "https://hasjob.co/feed";

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/atom+xml, application/xml, text/xml, */*",
      },
      cache: "no-store",
    });
  } catch (e) {
    console.error("[Hasjob] fetch error:", e);
    return [];
  }

  if (!res.ok) {
    console.error("[Hasjob] HTTP", res.status);
    return [];
  }

  const xml = await res.text();
  const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) ?? [];
  const jobs: NormalizedJob[] = [];
  const keywordLower = params.keyword.toLowerCase();

  for (const entry of entries) {
    const titleRaw = extractTag(entry, "title");
    const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/);
    const link = linkMatch ? linkMatch[1] : "";
    const updated = extractTag(entry, "updated");
    const content = stripHtml(stripCdata(extractTag(entry, "content")));

    // Hasjob titles are often format: "Role at Company" or "Company is hiring Role"
    // E.g. "Senior Frontend Developer at Tech Corp"
    let title = titleRaw;
    let company = "Company not listed";
    
    if (titleRaw.includes(" at ")) {
      const parts = titleRaw.split(" at ");
      title = parts[0].trim();
      company = parts.slice(1).join(" at ").trim();
    } else if (titleRaw.includes(" is hiring ")) {
      const parts = titleRaw.split(" is hiring ");
      company = parts[0].trim();
      title = parts.slice(1).join(" is hiring ").trim();
    }

    if (!title) continue;

    const t = title.toLowerCase();
    const c = company.toLowerCase();
    const d = content.toLowerCase();

    if (keywordLower && !t.includes(keywordLower) && !c.includes(keywordLower) && !d.includes(keywordLower)) {
      continue;
    }

    const isRemote = t.includes("remote") || d.includes("remote");

    jobs.push(normalizeJob({
      title,
      company,
      location: isRemote ? "Remote" : params.location,
      source: "hasjob", // Add to JobSource
      platform: "hasjob",
      applyChannel: "site",
      applyUrl: link,
      workMode: isRemote ? "remote" : "office",
      jobType: "experienced",
      description: content.slice(0, 300),
      postedAt: updated ? new Date(updated).toISOString() : new Date().toISOString(),
    }));
  }

  console.log(`[Hasjob] scraped ${jobs.length} jobs`);
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
