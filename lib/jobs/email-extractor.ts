import type { NormalizedJob } from "@/types/job";

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PRIORITY_PREFIXES = ["careers@", "career@", "jobs@", "hr@", "recruitment@", "recruiting@", "talent@", "people@"];
const CAREER_LINK_PATTERN = /\b(careers?|jobs?|join-us|work-with-us|contact|about)\b/i;
const BLOCKED_DOMAINS = [
  "linkedin.com",
  "glassdoor.com",
  "google.com",
];
const PORTAL_OR_UTILITY_DOMAINS = [
  ...BLOCKED_DOMAINS,
  "indeed.com",
  "naukri.com",
  "foundit.in",
  "monster.com",
  "timesjobs.com",
  "internshala.com",
  "hasjob.co",
  "remoteok.com",
  "remotive.com",
  "weworkremotely.com",
  "arbeitnow.com",
  "jobicy.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "youtube.com",
  "schema.org",
  "w3.org",
  "googleapis.com",
  "gstatic.com",
];

function isLikelyRealEmail(email: string): boolean {
  const lower = email.toLowerCase().replace(/[),.;:]+$/, "");
  return (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(lower) &&
    !lower.endsWith(".png") &&
    !lower.endsWith(".jpg") &&
    !lower.endsWith(".jpeg") &&
    !lower.endsWith(".gif") &&
    !lower.endsWith(".webp") &&
    !lower.includes("example.") &&
    !lower.includes("domain.") &&
    !lower.includes("sentry") &&
    !lower.includes("wixpress") &&
    !lower.includes("schema.org") &&
    !lower.includes("email.com")
  );
}

function rankEmail(email: string): number {
  const lower = email.toLowerCase();
  const priority = PRIORITY_PREFIXES.findIndex((prefix) => lower.startsWith(prefix));
  if (priority >= 0) return priority;
  if (lower.includes("career") || lower.includes("recruit") || lower.includes("talent")) return 20;
  if (lower.startsWith("info@") || lower.startsWith("contact@")) return 50;
  return 100;
}

export function extractCareerEmails(text: string): string[] {
  const found = text.match(EMAIL_PATTERN) ?? [];
  return Array.from(
    new Set(found.map((email) => email.toLowerCase().replace(/[),.;:]+$/, "")).filter(isLikelyRealEmail)),
  ).sort((a, b) => rankEmail(a) - rankEmail(b));
}

function shouldFetchUrl(rawUrl?: string): rawUrl is string {
  if (!rawUrl) return false;
  try {
    const url = new URL(rawUrl);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isBlockedHost(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
    return BLOCKED_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return true;
  }
}

function sameHostOrSubdomain(baseUrl: string, href: string): boolean {
  try {
    const baseHost = new URL(baseUrl).hostname.replace(/^www\./, "").toLowerCase();
    const linkHost = new URL(href, baseUrl).hostname.replace(/^www\./, "").toLowerCase();
    return linkHost === baseHost || linkHost.endsWith(`.${baseHost}`);
  } catch {
    return false;
  }
}

function extractCandidateLinks(html: string, baseUrl: string): string[] {
  const links = Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi))
    .map((match) => {
      const href = match[1]?.trim() ?? "";
      const text = match[2]?.replace(/<[^>]+>/g, " ").trim() ?? "";
      if (href.startsWith("mailto:")) return href;
      if (!CAREER_LINK_PATTERN.test(`${href} ${text}`)) return "";
      try {
        const absolute = new URL(href, baseUrl).toString();
        return sameHostOrSubdomain(baseUrl, absolute) ? absolute : "";
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  return Array.from(new Set(links)).slice(0, 3);
}

async function fetchText(url: string, timeoutMs = 4500): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function isUsefulCompanyDomain(domain: string): boolean {
  const lower = domain.replace(/^www\./, "").toLowerCase();
  return (
    lower.includes(".") &&
    !PORTAL_OR_UTILITY_DOMAINS.some((blocked) => lower === blocked || lower.endsWith(`.${blocked}`)) &&
    !lower.includes("cloudfront.net") &&
    !lower.includes("amazonaws.com") &&
    !lower.includes("doubleclick.net")
  );
}

function companySlug(company: string): string {
  return company
    .toLowerCase()
    .replace(/\b(private|pvt|limited|ltd|inc|llc|llp|technologies|technology|solutions|services|software|systems|india|global|corp|corporation|company|co)\b/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join("");
}

function getDomainFromUrl(rawUrl: string): string | undefined {
  try {
    const domain = new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
    return isUsefulCompanyDomain(domain) ? domain : undefined;
  } catch {
    return undefined;
  }
}

function extractCompanyDomains(html: string, baseUrl: string): string[] {
  const hrefDomains = Array.from(html.matchAll(/href=["']([^"']+)["']/gi))
    .map((match) => {
      try {
        return getDomainFromUrl(new URL(match[1] ?? "", baseUrl).toString());
      } catch {
        return undefined;
      }
    })
    .filter((domain): domain is string => Boolean(domain));

  const textDomains = Array.from(html.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})(?:[/:?#"')\s]|$)/gi))
    .map((match) => {
      const domain = match[1]?.replace(/^www\./, "").toLowerCase();
      return domain && isUsefulCompanyDomain(domain) ? domain : undefined;
    })
    .filter((domain): domain is string => Boolean(domain));

  return Array.from(new Set([...hrefDomains, ...textDomains]));
}

function guessedCareerEmailForDomain(domain: string): string {
  return `careers@${domain}`;
}

export function guessCareerEmailForCompany(company: string): string | undefined {
  const slug = companySlug(company);
  if (!slug || slug.length < 3 || slug === "companynotlisted") return undefined;
  return `careers@${slug}.com`;
}

export async function findCareerEmailForJob(job: NormalizedJob): Promise<{ email: string; isGuessed: boolean } | undefined> {
  if (job.applyEmail) return { email: job.applyEmail, isGuessed: !!job.isGuessedEmail };

  const descriptionEmails = extractCareerEmails(job.description ?? "");
  if (descriptionEmails[0]) return { email: descriptionEmails[0], isGuessed: false };
  if (!shouldFetchUrl(job.applyUrl) || isBlockedHost(job.applyUrl)) return undefined;

  const pageHtml = await fetchText(job.applyUrl);
  const pageEmails = extractCareerEmails(pageHtml);
  if (pageEmails[0]) return { email: pageEmails[0], isGuessed: false };

  const companyDomain = extractCompanyDomains(pageHtml, job.applyUrl)[0];
  if (companyDomain) return { email: guessedCareerEmailForDomain(companyDomain), isGuessed: true };

  const mailto = extractCandidateLinks(pageHtml, job.applyUrl)
    .find((href) => href.startsWith("mailto:"))
    ?.replace(/^mailto:/i, "")
    .split("?")[0];
  if (mailto && isLikelyRealEmail(mailto)) return { email: mailto.toLowerCase(), isGuessed: false };

  for (const link of extractCandidateLinks(pageHtml, job.applyUrl).filter((href) => !href.startsWith("mailto:"))) {
    if (isBlockedHost(link)) continue;
    const linkedHtml = await fetchText(link, 3500);
    const linkedEmails = extractCareerEmails(linkedHtml);
    if (linkedEmails[0]) return { email: linkedEmails[0], isGuessed: false };

    const linkedDomain = extractCompanyDomains(linkedHtml, link)[0];
    if (linkedDomain) return { email: guessedCareerEmailForDomain(linkedDomain), isGuessed: true };
  }

  return undefined;
}

export async function enrichJobsWithCareerEmails(jobs: NormalizedJob[], maxJobs = 60): Promise<NormalizedJob[]> {
  const enriched = [...jobs];
  let index = 0;
  const workerCount = Math.min(5, enriched.length);

  async function worker() {
    while (index < Math.min(enriched.length, maxJobs)) {
      const current = index++;
      const job = enriched[current];
      
      let found = await findCareerEmailForJob(job);
      if (!found) {
        const guessed = guessCareerEmailForCompany(job.company);
        if (guessed) found = { email: guessed, isGuessed: true };
      }

      if (found) {
        // Only set applyChannel to email if the job didn't already have a valid platform/site link
        // Otherwise, just attach the email as a backup/metadata
        const shouldOverrideChannel = job.applyChannel === "email" || !job.applyUrl;
        
        enriched[current] = {
          ...job,
          applyChannel: shouldOverrideChannel ? "email" : job.applyChannel,
          applyEmail: found.email,
          isGuessedEmail: found.isGuessed,
          description: job.description.includes(found.email) ? job.description : `${job.description} ${found.isGuessed ? 'Guessed' : 'Suggested'} email: ${found.email}`.trim(),
        };
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
  return enriched;
}
