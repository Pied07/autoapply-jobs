import type { Firestore } from "firebase-admin/firestore";

export async function deleteExpiredJobHashes(db: Firestore, uid: string) {
  const now = new Date();
  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("jobHashes")
    .where("expiresAt", "<=", now)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  return snapshot.size;
}
