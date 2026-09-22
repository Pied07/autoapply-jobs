import type { Firestore } from "firebase-admin/firestore";
import type { CronLog } from "@/types/application";

export async function writeUserCronLog(db: Firestore, log: CronLog) {
  await db.collection("users").doc(log.uid).collection("cronLogs").add(log);
}
