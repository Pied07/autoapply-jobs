import { NextResponse } from "next/server";
import { sendDailyJobAlerts } from "@/lib/applications/engine";
import { buildJobAlertEmail } from "@/lib/email/templates";
import { sendMail } from "@/lib/email/sender";
import { getAdminDb } from "@/lib/firebase/admin";
import { writeUserCronLog } from "@/lib/cron/logs";
import type { CandidateProfile } from "@/types/profile";

export const maxDuration = 60;

function authorize(request: Request) {
  const expected = process.env.CRON_SECRET;
  return !expected || request.headers.get("authorization") === `Bearer ${expected}`;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const users = await db
      .collection("users")
      .where("profileCompleted", "==", true)
      .where("autoApplyEnabled", "==", true)
      .get();
    
    const reports = [];
    const currentUtcHour = new Date().getUTCHours();

    for (const doc of users.docs) {
      const startedAt = new Date().toISOString();
      const profile = doc.data() as CandidateProfile;
      
      // Calculate user's current local hour
      // Example: jobAlertTime is "09:00"
      const targetTime = profile.jobAlertTime || "09:00";
      const targetHour = parseInt(targetTime.split(":")[0] || "9", 10);
      
      // If no timezone is provided, default to UTC
      const userDate = new Date().toLocaleString("en-US", { timeZone: profile.timezone || "UTC" });
      const userCurrentHour = new Date(userDate).getHours();
      const userCurrentDate = new Date(userDate).getDate();

      if (userCurrentHour !== targetHour) {
        continue;
      }

      // If it's the first day of the month, wipe all job hashes so the user gets all scraped jobs again
      if (userCurrentDate === 1) {
        const hashes = await db.collection("users").doc(profile.uid).collection("jobHashes").get();
        
        let batch = db.batch();
        let count = 0;
        
        for (const doc of hashes.docs) {
          batch.delete(doc.ref);
          count++;
          if (count === 400) {
            await batch.commit();
            batch = db.batch();
            count = 0;
          }
        }
        if (count > 0) {
          await batch.commit();
        }
      }

      try {
        const jobs = await sendDailyJobAlerts(db, profile);
        
        // Count how many total applications they have clicked historically
        const appsRef = await db.collection("users").doc(profile.uid).collection("applications").get();
        const appliedCount = appsRef.docs.length;
        
        const { createReportPdf } = await import("@/lib/reports/pdf");
        const pdf = await createReportPdf(jobs, appliedCount, null);

        const email = buildJobAlertEmail(jobs);

        await sendMail(profile.email, email.subject, email.text, [
          { filename: "daily-nexus-intel.pdf", content: pdf, contentType: "application/pdf" },
        ]);

        await writeUserCronLog(db, {
          uid: profile.uid,
          job: "daily",
          status: "success",
          startedAt,
          finishedAt: new Date().toISOString(),
          usersProcessed: 1,
          applied: 0,
          failed: 0,
          skipped: 0,
          message: `Daily alert cron completed. Found ${jobs.length} new jobs.`,
        });

        // Clear previous cron logs to keep the cache clear
        const oldLogs = await db.collection("users").doc(profile.uid).collection("cronLogs").get();
        const batch = db.batch();
        oldLogs.docs.forEach((d) => {
          if (d.data().startedAt !== startedAt) batch.delete(d.ref);
        });
        await batch.commit();

        reports.push({ uid: profile.uid, foundJobs: jobs.length });
      } catch (error) {
        await writeUserCronLog(db, {
          uid: profile.uid,
          job: "daily",
          status: "failed",
          startedAt,
          finishedAt: new Date().toISOString(),
          usersProcessed: 1,
          message: "Daily alert cron failed for this user.",
          error: error instanceof Error ? error.message : "Unknown daily cron error",
        });

        reports.push({ uid: profile.uid, foundJobs: 0, failed: true });
      }
    }

    return NextResponse.json({ ok: true, reports });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown daily cron startup error",
      },
      { status: 500 },
    );
  }
}
