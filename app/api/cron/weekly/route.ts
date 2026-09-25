import { NextResponse } from "next/server";
import { buildWeeklyReport } from "@/lib/applications/engine";
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

  const db = getAdminDb();
  const users = await db.collection("users").where("profileCompleted", "==", true).get();
  const reports = [];

  for (const doc of users.docs) {
    const startedAt = new Date().toISOString();
    const profile = doc.data() as CandidateProfile;

    try {
      const report = await buildWeeklyReport(db, profile.uid);
      const email = buildReportEmail(report);
      const pdf = await createReportPdf(report.rows.map(r => r.job), report.applied, null);

      await sendMail(profile.email, email.subject, email.text, [
        { filename: "weekly-job-report.pdf", content: pdf, contentType: "application/pdf" },
      ]);

      await writeUserCronLog(db, {
        uid: profile.uid,
        job: "weekly",
        status: "success",
        startedAt,
        finishedAt: new Date().toISOString(),
        usersProcessed: 1,
        applied: report.applied,
        failed: report.failed,
        skipped: report.skipped,
        deletedHistory: report.rows.length,
        message: `Weekly cron completed. Deleted ${report.rows.length} application history records.`,
      });

      reports.push({ uid: profile.uid, applied: report.applied, deletedHistory: report.rows.length });
    } catch (error) {
      await writeUserCronLog(db, {
        uid: profile.uid,
        job: "weekly",
        status: "failed",
        startedAt,
        finishedAt: new Date().toISOString(),
        usersProcessed: 1,
        message: "Weekly cron failed for this user.",
        error: error instanceof Error ? error.message : "Unknown weekly cron error",
      });

      reports.push({ uid: profile.uid, applied: 0, deletedHistory: 0 });
    }
  }

  return NextResponse.json({ ok: true, reports });
}
