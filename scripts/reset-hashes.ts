import { getAdminDb } from "../lib/firebase/admin";

async function run() {
  const db = getAdminDb();
  const uid = "demo-user"; // Or get all users
  const users = await db.collection("users").get();
  for (const user of users.docs) {
    const hashes = await user.ref.collection("jobHashes").get();
    for (const hash of hashes.docs) {
      await hash.ref.delete();
    }
    console.log(`Deleted ${hashes.docs.length} hashes for user ${user.id}`);
  }
}

run().then(() => console.log("Done")).catch(console.error);
