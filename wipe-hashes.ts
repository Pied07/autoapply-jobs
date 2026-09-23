import { config } from "dotenv";
config({ path: ".env.local" });

import { getAdminDb } from "./lib/firebase/admin";

async function clearHashes() {
  const db = getAdminDb();
  const users = await db.collection("users").get();
  let count = 0;
  for (const user of users.docs) {
    const hashes = await db.collection("users").doc(user.id).collection("jobHashes").get();
    for (const hash of hashes.docs) {
      await hash.ref.delete();
      count++;
    }
  }
  console.log(`Deleted ${count} job hashes. The cron will now treat all jobs as completely new!`);
}

clearHashes().catch(console.error);
