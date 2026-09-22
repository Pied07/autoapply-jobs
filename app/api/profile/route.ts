import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { CandidateProfile } from "@/types/profile";

export async function POST(request: Request) {
  const profile = (await request.json()) as CandidateProfile;
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!profile.uid || !profile.email) {
    return NextResponse.json({ error: "uid and email are required." }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "Firebase ID token is required." }, { status: 401 });
  }

  const decoded = await getAdminAuth().verifyIdToken(token).catch(() => undefined);

  if (!decoded || decoded.uid !== profile.uid) {
    return NextResponse.json({ error: "Unauthorized profile write." }, { status: 403 });
  }

  const now = new Date().toISOString();
  const payload = {
    ...profile,
    profileCompleted: true,
    createdAt: profile.createdAt || now,
    updatedAt: now,
  };

  await getAdminDb().collection("users").doc(profile.uid).set(payload, { merge: true });
  return NextResponse.json({ profile: payload });
}
