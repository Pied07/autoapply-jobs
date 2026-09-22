import { NextResponse } from "next/server";
import { fetchJobs } from "@/lib/jobs/fetchers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, keyword, jobTitle, location, experience, sources } = body;

    if (!uid) {
      return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 });
    }

    // Optional: could validate user subscription limits here if needed

    const searchKeyword = jobTitle ? `${jobTitle} ${keyword}`.trim() : keyword;

    const allJobs = await fetchJobs({
      keyword: searchKeyword || "developer",
      location: location || "Remote India",
      experience: experience || "",
      sources: sources || []
    });

    // We can do advanced filtering here based on workModes, jobTypes, salaryMin/Max
    // For now, return all raw matched jobs
    return NextResponse.json({ jobs: allJobs });
  } catch (error: unknown) {
    console.error("Job API error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch jobs" }, { status: 500 });
  }
}
