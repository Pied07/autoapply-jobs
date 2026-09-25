import { getAdminDb } from "./lib/firebase/admin";

async function clearAllData() {
  const db = getAdminDb();
  const users = await db.collection("users").get();
  
  const subcollections = ["jobHashes", "applications", "reports", "cronLogs"];
  
  let totalDeleted = 0;

  for (const user of users.docs) {
    for (const sub of subcollections) {
      const colRef = db.collection("users").doc(user.id).collection(sub);
      const docs = await colRef.get();
      
      let batch = db.batch();
      let batchCount = 0;
      
      for (const doc of docs.docs) {
        batch.delete(doc.ref);
        batchCount++;
        totalDeleted++;
        
        if (batchCount === 400) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
    }
  }
  
  console.log(`Successfully cleared ${totalDeleted} documents across all subcollections for ${users.docs.length} users.`);
}

clearAllData().catch(console.error);
