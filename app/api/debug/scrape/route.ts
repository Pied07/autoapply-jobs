import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = url.searchParams.get("url");
  if (!target) return NextResponse.json({ error: "pass ?url=" }, { status: 400 });

  try {
    const res = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
      },
      cache: "no-store",
    });

    const body = await res.text();

    // Find all script tags and check which contain job data
    const scriptMatches: string[] = [];
    const scriptRegex = /<script[^>]*>([\s\S]{0,2000}?)<\/script>/gi;
    let m;
    while ((m = scriptRegex.exec(body)) !== null) {
      const content = m[1];
      if (content.includes("jobTitle") || content.includes("jobDetails") || content.includes("title") && content.includes("company")) {
        scriptMatches.push(content.slice(0, 500));
      }
    }

    // Find all class names that look like job containers
    const classMatches = (body.match(/class="([^"]{0,80}job[^"]{0,80})"/gi) ?? []).slice(0, 20);
    const articleMatches = (body.match(/<article[^>]{0,200}>/gi) ?? []).slice(0, 5);
    const ldJson = (body.match(/<script type="application\/ld\+json">([\s\S]{0,2000}?)<\/script>/gi) ?? []).slice(0, 3);

    return NextResponse.json({
      status: res.status,
      bodyLength: body.length,
      isCloudflare: body.includes("cf-browser-verification") || body.includes("cloudflare"),
      scriptTagsWithJobData: scriptMatches.length,
      scriptPreviews: scriptMatches.slice(0, 3),
      jobClassNames: classMatches,
      articleTags: articleMatches,
      ldJsonBlocks: ldJson,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
