import { config } from "dotenv";
config({ path: ".env.local" });
import { getAdminDb } from "../lib/firebase/admin";

async function run() {
  const db = getAdminDb();
  const users = await db.collection("users").get();
  let totalDeleted = 0;

  for (const user of users.docs) {
    const subcollections = ["jobHashes", "applications", "cronLogs", "reports"];
    
    for (const sub of subcollections) {
      const snap = await user.ref.collection(sub).get();
      const batch = db.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      if (snap.docs.length > 0) {
        await batch.commit();
        totalDeleted += snap.docs.length;
      }
    }
    console.log(`Cleared data for user ${user.id}`);
  }
  console.log(`Deleted ${totalDeleted} total documents.`);
}

run().then(() => console.log("Done")).catch(console.error);
