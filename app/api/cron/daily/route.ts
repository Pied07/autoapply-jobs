import { NextResponse } from "next/server";
import { runDailyApplications } from "@/lib/applications/engine";
import { buildReportEmail } from "@/lib/email/templates";
import { sendMail } from "@/lib/email/sender";
import { getAdminDb } from "@/lib/firebase/admin";
import { createReportPdf } from "@/lib/reports/pdf";
import { writeUserCronLog } from "@/lib/cron/logs";
import type { CandidateProfile } from "@/types/profile";

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

    for (const doc of users.docs) {
      const startedAt = new Date().toISOString();
      const profile = doc.data() as CandidateProfile;

      try {
        const report = await runDailyApplications(db, profile);
        const email = buildReportEmail(report);
        const pdf = await createReportPdf(report);

        await sendMail(profile.email, email.subject, email.text, [
          { filename: "daily-job-report.pdf", content: pdf, contentType: "application/pdf" },
        ]);

        await writeUserCronLog(db, {
          uid: profile.uid,
          job: "daily",
          status: "success",
          startedAt,
          finishedAt: new Date().toISOString(),
          usersProcessed: 1,
          applied: report.applied,
          failed: report.failed,
          skipped: report.skipped,
          message: `Daily cron completed. ${report.newRelevantJobs} relevant jobs found, ${report.applied} applied, ${report.failed} failed.`,
        });

        reports.push({ uid: profile.uid, applied: report.applied, failed: report.failed });
      } catch (error) {
        await writeUserCronLog(db, {
          uid: profile.uid,
          job: "daily",
          status: "failed",
          startedAt,
          finishedAt: new Date().toISOString(),
          usersProcessed: 1,
          message: "Daily cron failed for this user.",
          error: error instanceof Error ? error.message : "Unknown daily cron error",
        });

        reports.push({ uid: profile.uid, applied: 0, failed: 1 });
      }
    }

    return NextResponse.json({ ok: true, reports });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown daily cron startup error",
        hint: "Check FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY from the Firebase service account JSON.",
      },
      { status: 500 },
    );
  }
}
