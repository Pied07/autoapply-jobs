import { getAdminDb } from "./lib/firebase/admin";

async function clearAllHashes() {
  const db = getAdminDb();
  const users = await db.collection("users").get();
  let count = 0;
  
  for (const user of users.docs) {
    const hashes = await db.collection("users").doc(user.id).collection("jobHashes").get();
    let batch = db.batch();
    let batchCount = 0;
    
    for (const doc of hashes.docs) {
      batch.delete(doc.ref);
      batchCount++;
      count++;
      if (batchCount === 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
    if (batchCount > 0) {
      await batch.commit();
    }
    
    // Also clear applications for a fully clean start?
    // The user said "clear the hashes", so I will just clear the hashes.
  }
  
  console.log(`Cleared ${count} job hashes across ${users.docs.length} users.`);
}

clearAllHashes().catch(console.error);
