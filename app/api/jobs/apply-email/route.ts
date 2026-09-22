import { NextResponse } from "next/server";
import type Mail from "nodemailer/lib/mailer";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { buildApplicationEmail } from "@/lib/email/templates";
import { sendMail } from "@/lib/email/sender";
import type { ApplicationRecord } from "@/types/application";
import type { NormalizedJob } from "@/types/job";
import type { CandidateProfile } from "@/types/profile";

type ApplyEmailRequest = {
  uid?: string;
  job?: NormalizedJob;
  applyEmail?: string;
};

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getResumeFileName(profile: CandidateProfile): string {
  const fallbackName = `${profile.name || "resume"}-resume.pdf`;
  if (profile.resumeFileName) return profile.resumeFileName.replace(/[^a-z0-9_.-]+/gi, "-");
  if (!profile.resumeUrl) return fallbackName.replace(/[^a-z0-9_.-]+/gi, "-");

  try {
    const urlPath = new URL(profile.resumeUrl).pathname;
    const nameFromUrl = decodeURIComponent(urlPath.split("/").filter(Boolean).at(-1) ?? "");
    if (nameFromUrl.includes(".")) return nameFromUrl.replace(/[^a-z0-9_.-]+/gi, "-");
  } catch {
    // Fall back to profile name.
  }

  return fallbackName.replace(/[^a-z0-9_.-]+/gi, "-");
}

function getResumeContentType(filename: string, savedContentType?: string): string | undefined {
  if (savedContentType) return savedContentType;
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".txt")) return "text/plain";
  return undefined;
}

async function buildResumeAttachment(profile: CandidateProfile): Promise<Mail.Attachment[]> {
  if (!profile.resumeUrl) throw new Error("Resume is missing from your profile.");

  const resumeUrl = new URL(profile.resumeUrl);
  const isCloudinaryHost = resumeUrl.hostname === "res.cloudinary.com" || resumeUrl.hostname.endsWith(".cloudinary.com");
  if (resumeUrl.protocol !== "https:" || !isCloudinaryHost) {
    throw new Error("The saved resume file is not from the approved upload service.");
  }

  const response = await fetch(resumeUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("The saved resume file could not be downloaded.");

  const content = Buffer.from(await response.arrayBuffer());
  if (content.length === 0 || content.length > 10 * 1024 * 1024) {
    throw new Error("The saved resume file is empty or exceeds the 10 MB email attachment limit.");
  }

  const filename = getResumeFileName(profile);

  return [
    {
      filename,
      content,
      contentType: response.headers.get("content-type") || getResumeContentType(filename, profile.resumeContentType),
    },
  ];
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  const body = (await request.json()) as ApplyEmailRequest;
  const { uid, job } = body;
  const applyEmail = body.applyEmail || job?.applyEmail;

  if (!uid || !job || !applyEmail) {
    return NextResponse.json({ error: "uid, job, and applyEmail are required." }, { status: 400 });
  }

  if (!isEmail(applyEmail)) {
    return NextResponse.json({ error: "Apply email is not valid." }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "Firebase ID token is required." }, { status: 401 });
  }

  const decoded = await getAdminAuth().verifyIdToken(token).catch(() => undefined);
  if (!decoded || decoded.uid !== uid) {
    return NextResponse.json({ error: "Unauthorized email application." }, { status: 403 });
  }

  const db = getAdminDb();
  const profileSnap = await db.collection("users").doc(uid).get();
  if (!profileSnap.exists) {
    return NextResponse.json({ error: "Complete your profile before applying." }, { status: 404 });
  }

  const profile = profileSnap.data() as CandidateProfile;
  if (!profile.resumeUrl) {
    return NextResponse.json({ error: "Upload your resume before applying by email." }, { status: 400 });
  }

  const email = buildApplicationEmail(profile, job.company, job.title);
  let attachments: Mail.Attachment[];
  try {
    attachments = await buildResumeAttachment(profile);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The saved resume file could not be attached." },
      { status: 400 },
    );
  }

  const sent = await sendMail(applyEmail, email.subject, email.text, attachments, { replyTo: profile.email });

  const now = new Date().toISOString();
  const record: ApplicationRecord = {
    id: `${uid}-${job.id}-${Date.now()}`,
    uid,
    job: {
      ...job,
      applyChannel: "email",
      applyEmail,
    },
    status: sent.sent ? "applied" : "failed",
    channel: "email",
    platform: job.platform,
    source: job.source,
    message: sent.sent
      ? `Application email sent to ${applyEmail}.`
      : sent.reason ?? `Application email could not be sent to ${applyEmail}.`,
    createdAt: now,
  };

  await db.collection("users").doc(uid).collection("applications").doc(record.id).set(record);

  if (!sent.sent) {
    return NextResponse.json({ error: record.message, record }, { status: 500 });
  }

  return NextResponse.json({ ok: true, record });
}
