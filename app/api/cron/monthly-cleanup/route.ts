import { NextResponse } from "next/server";
import { deleteExpiredJobHashes } from "@/lib/cleanup/monthly";
import { writeUserCronLog } from "@/lib/cron/logs";
import { getAdminDb } from "@/lib/firebase/admin";

function authorize(request: Request) {
  const expected = process.env.CRON_SECRET;
  return !expected || request.headers.get("authorization") === `Bearer ${expected}`;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const users = await db.collection("users").get();
  let deleted = 0;

  for (const user of users.docs) {
    const startedAt = new Date().toISOString();

    try {
      const deletedForUser = await deleteExpiredJobHashes(db, user.id);
      deleted += deletedForUser;

      await writeUserCronLog(db, {
        uid: user.id,
        job: "monthly-cleanup",
        status: "success",
        startedAt,
        finishedAt: new Date().toISOString(),
        usersProcessed: 1,
        deletedJobHashes: deletedForUser,
        message: `Monthly cleanup completed. Deleted ${deletedForUser} expired job hashes.`,
      });
    } catch (error) {
      await writeUserCronLog(db, {
        uid: user.id,
        job: "monthly-cleanup",
        status: "failed",
        startedAt,
        finishedAt: new Date().toISOString(),
        usersProcessed: 1,
        message: "Monthly cleanup failed for this user.",
        error: error instanceof Error ? error.message : "Unknown monthly cleanup error",
      });
    }
  }

  return NextResponse.json({ ok: true, deletedJobHashes: deleted });
}
