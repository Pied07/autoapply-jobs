"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { collection, doc, getDocs, getDoc, limit, orderBy, query, setDoc, where } from "firebase/firestore";
import { buildApplicationEmail } from "@/lib/email/templates";
import { auth, db } from "@/lib/firebase/client";
import type { ApplicationRecord, CronLog } from "@/types/application";
import type { CandidateProfile, IndianLocation, JobType, ParsedResumeProfile, WorkMode } from "@/types/profile";

const locations: IndianLocation[] = [
  "Bengaluru",
  "Chennai",
  "Delhi NCR",
  "Hyderabad",
  "Kolkata",
  "Mumbai",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Remote India",
];

const workModes: { value: WorkMode; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "office", label: "Office" },
];

const jobTypes: { value: JobType; label: string }[] = [
  { value: "part-time", label: "Part time" },
  { value: "internship", label: "Internship" },
  { value: "fresher", label: "Fresher" },
  { value: "experienced", label: "Experienced" },
];

const emptyProfile: CandidateProfile = {
  uid: "demo-user",
  name: "",
  email: "",
  phone: "",
  address: "",
  school: "",
  college: "",
  experience: "",
  skills: [],
  projects: [],
  preferredLocations: ["Remote India"],
  workModes: ["remote", "hybrid"],
  jobTypes: ["internship", "fresher"],
  salaryRange: { min: 0, max: 800000 },
  currentSalary: "",
  expectedSalary: "",
  noticePeriod: "",
  dailyApplyTime: "09:00",
  profileCompleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function profileForUser(firebaseUser: User): CandidateProfile {
  const now = new Date().toISOString();

  return {
    ...emptyProfile,
    uid: firebaseUser.uid,
    email: firebaseUser.email || "",
    createdAt: now,
    updatedAt: now,
  };
}

function toggleValue<T extends string>(items: T[], value: T) {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

function textToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function removeUndefinedFields<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)) as T;
}

export default function Home() {
  const [step, setStep] = useState<"login" | "profile" | "dashboard" | "logs">("login");
  const [profile, setProfile] = useState<CandidateProfile>(emptyProfile);
  const [resumeName, setResumeName] = useState("");
  const [status, setStatus] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    newRelevant: 0,
    appliedToday: 0,
    failedToday: 0,
  });
  const [cronLogs, setCronLogs] = useState<CronLog[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [isParsingResume, setIsParsingResume] = useState(false);

  const loadApplications = useCallback(async (uid: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todaySnapshot, recentSnapshot] = await Promise.all([
      getDocs(query(collection(db, "users", uid, "applications"), where("createdAt", ">=", today.toISOString()))).catch(
        () => undefined,
      ),
      getDocs(query(collection(db, "users", uid, "applications"), orderBy("createdAt", "desc"), limit(50))).catch(
        () => undefined,
      ),
    ]);

    const todayRows = todaySnapshot?.docs.map((applicationDoc) => applicationDoc.data() as ApplicationRecord) ?? [];
    const recentRows = recentSnapshot?.docs.map((applicationDoc) => applicationDoc.data() as ApplicationRecord) ?? [];

    setApplications(recentRows);
    setDashboardStats({
      newRelevant: todayRows.length,
      appliedToday: todayRows.filter((row) => row.status === "applied").length,
      failedToday: todayRows.filter((row) => row.status === "failed").length,
    });
  }, []);

  const applicationAction = useCallback(
    (application: ApplicationRecord) => {
      if (application.channel === "email") {
        const email = buildApplicationEmail(profile, application.job.company, application.job.title);
        const recipient = application.job.applyEmail || "";

        return {
          href: `mailto:${recipient}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.text)}`,
          label: "Open email",
          disabled: !recipient,
        };
      }

      return {
        href: application.job.applyUrl || "",
        label: application.channel === "site" ? "Open site" : `Open ${application.source}`,
        disabled: !application.job.applyUrl,
      };
    },
    [profile],
  );

  const loadCronLogs = useCallback(async (uid: string) => {
    const logsSnapshot = await getDocs(
      query(collection(db, "users", uid, "cronLogs"), orderBy("startedAt", "desc"), limit(20)),
    ).catch(() => undefined);

    setCronLogs(
      logsSnapshot?.docs.map((logDoc) => ({
        id: logDoc.id,
        ...(logDoc.data() as CronLog),
      })) ?? [],
    );
  }, []);

  const refreshDashboard = useCallback(
    async (uid: string) => {
      await Promise.all([loadApplications(uid), loadCronLogs(uid)]);
    },
    [loadApplications, loadCronLogs],
  );

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);

      if (firebaseUser) {
        const fallbackProfile = profileForUser(firebaseUser);
        const profileSnapshot = await getDoc(doc(db, "users", firebaseUser.uid)).catch(() => undefined);

        const savedProfile = profileSnapshot?.exists() ? (profileSnapshot.data() as CandidateProfile) : fallbackProfile;
        setProfile(savedProfile);
        await Promise.all([loadApplications(firebaseUser.uid), loadCronLogs(firebaseUser.uid)]);
        setStep(savedProfile.profileCompleted ? "dashboard" : "profile");
      } else {
        setProfile(emptyProfile);
        setDashboardStats({ newRelevant: 0, appliedToday: 0, failedToday: 0 });
        setCronLogs([]);
        setApplications([]);
        setStep("login");
      }
    });
  }, [loadApplications, loadCronLogs]);

  const completion = useMemo(() => {
    const filled = [
      profile.name,
      profile.email,
      profile.phone,
      profile.experience,
      profile.skills.length,
      profile.preferredLocations.length,
      profile.workModes.length,
      profile.jobTypes.length,
    ].filter(Boolean).length;

    return Math.round((filled / 8) * 100);
  }, [profile]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");

    setStatus(authMode === "register" ? "Creating account..." : "Signing in...");
    setAuthLoading(true);

    try {
      const credential =
        authMode === "register"
          ? await createUserWithEmailAndPassword(auth, email, password)
          : await signInWithEmailAndPassword(auth, email, password);

      setProfile((current) => ({
        ...current,
        uid: credential.user.uid,
        email: credential.user.email || email,
      }));
      setStatus(authMode === "register" ? "Account created. Complete your profile." : "Signed in.");
      setStep("profile");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleResume(file?: File) {
    if (!file) return;
    setResumeName(file.name);
    setStatus("Reading resume and filling what can be detected...");
    setIsParsingResume(true);

    try {
      const form = new FormData();
      form.set("resume", file);
      const uploadForm = new FormData();
      uploadForm.set("resume", file);

      const [response, uploadResponse] = await Promise.all([
        fetch("/api/resume/parse", { method: "POST", body: form }),
        fetch("/api/upload/resume", { method: "POST", body: uploadForm }),
      ]);
      const data = (await response.json()) as {
        parsed: ParsedResumeProfile;
        diagnostics?: { extractedCharacters: number; method: string; error?: string; usedFileNameFallback: boolean };
      };
      const uploadData = (await uploadResponse.json().catch(() => undefined)) as
        | { url?: string; filename?: string; contentType?: string; error?: string }
        | undefined;

      if (!uploadData?.url) {
        setStatus(uploadData?.error || "Resume upload failed. Please try again.");
        return;
      }

      const resumeFields = {
        resumeUrl: uploadData.url,
        resumeFileName: uploadData.filename || file.name,
        resumeContentType: uploadData.contentType || file.type || "application/octet-stream",
      };

      setProfile((current) => ({ ...current, ...resumeFields }));

      if (user) {
        try {
          await setDoc(doc(db, "users", user.uid), { ...resumeFields, updatedAt: new Date().toISOString() }, { merge: true });
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Resume uploaded but could not be saved to your profile.");
          return;
        }
      }

      if (!response.ok || !data.parsed) {
        setStatus("Resume uploaded and saved, but its text could not be read. You can still apply by email.");
        return;
      }

      setProfile((current) => ({
        ...current,
        ...Object.fromEntries(Object.entries(data.parsed).filter(([, value]) => Boolean(value))),
        email: data.parsed.email || current.email,
        skills: data.parsed.skills?.length ? data.parsed.skills : current.skills,
        projects: data.parsed.projects?.length ? data.parsed.projects : current.projects,
        ...resumeFields,
      }));
      const filledFields = Object.values(data.parsed).filter((value) => (Array.isArray(value) ? value.length : value)).length;
      setStatus(
        data.diagnostics?.usedFileNameFallback
          ? `Could not read text from this resume. ${data.diagnostics.error || "Only the filename was used."}`
          : `Resume parsed with ${data.diagnostics?.method ?? "text extraction"}. Filled ${filledFields} fields from ${data.diagnostics?.extractedCharacters ?? 0} characters.${data.diagnostics?.error ? ` AI refinement skipped: ${data.diagnostics.error}` : ""}`,
      );
    } finally {
      setIsParsingResume(false);
    }
  }

  async function saveProfile() {
    if (!user) {
      setStatus("Please login before saving your profile.");
      return;
    }

    setStatus("Saving profile...");
    const now = new Date().toISOString();
    const payload: CandidateProfile = {
      ...profile,
      uid: user.uid,
      email: user.email || profile.email,
      profileCompleted: true,
      updatedAt: now,
      createdAt: profile.createdAt || now,
    };

    try {
      await setDoc(doc(db, "users", user.uid), removeUndefinedFields(payload), { merge: true });
      setProfile(payload);
      setStatus("Profile saved. Daily automation is ready for cron.");
      setStep("dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save profile.";
      setStatus(
        message.includes("Missing or insufficient permissions")
          ? "Firestore rules are blocking this save. Deploy firestore.rules or paste it into Firebase Console > Firestore Database > Rules."
          : message,
      );
    }
  }

  async function handleLogout() {
    await signOut(auth);
    setStatus("Signed out.");
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#17202a]">
      <section className="border-b border-[#d9e1ec] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#31706f]">AutoApply AI</p>
            <h1 className="text-2xl font-semibold">Indian job application cockpit</h1>
          </div>
          <div className="rounded-md border border-[#cfd8e5] px-3 py-2 text-sm text-[#4b5b6c]">
            {user ? `Logged in: ${user.email}` : `Daily run: ${profile.dailyApplyTime} IST`}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit border border-[#d9e1ec] bg-white p-4">
          {["login", "profile", "dashboard"].map((item, index) => (
            <div key={item} className="flex items-center gap-3 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#e7f1ef] text-sm font-semibold text-[#245b59]">
                {index + 1}
              </span>
              <span className={step === item ? "font-semibold" : "text-[#607083]"}>
                {item === "login" ? "Login" : item === "profile" ? "Profile completion" : "Reports"}
              </span>
            </div>
          ))}
          {user && (
            <button onClick={() => setStep("logs")} className="flex w-full items-center gap-3 py-3 text-left">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#e7f1ef] text-sm font-semibold text-[#245b59]">
                4
              </span>
              <span className={step === "logs" ? "font-semibold" : "text-[#607083]"}>Cron logs</span>
            </button>
          )}

          <div className="mt-4 border-t border-[#e1e7ef] pt-4">
            <p className="text-sm text-[#607083]">Completion</p>
            <div className="mt-2 h-2 rounded bg-[#e7edf5]">
              <div className="h-2 rounded bg-[#31706f]" style={{ width: `${completion}%` }} />
            </div>
            <p className="mt-2 text-sm font-medium">{completion}% ready</p>
          </div>
        </aside>

        {step === "login" && (
          <form onSubmit={handleAuth} method="POST" className="grid gap-4 border border-[#d9e1ec] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{authMode === "register" ? "Register" : "Login"}</h2>
              <div className="flex rounded-md border border-[#cfd8e5] p-1">
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className={`px-3 py-1 text-sm ${authMode === "login" ? "bg-[#245b59] text-white" : "text-[#4b5b6c]"}`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("register")}
                  className={`px-3 py-1 text-sm ${authMode === "register" ? "bg-[#245b59] text-white" : "text-[#4b5b6c]"}`}
                >
                  Register
                </button>
              </div>
            </div>
            <input
              name="email"
              type="email"
              required
              placeholder="Email address"
              className="h-11 border border-[#cfd8e5] px-3 outline-[#31706f]"
            />
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Password"
              className="h-11 border border-[#cfd8e5] px-3 outline-[#31706f]"
            />
            <button
              type="submit"
              disabled={authLoading}
              className="h-11 w-fit rounded-md bg-[#245b59] px-5 font-semibold text-white disabled:opacity-60"
            >
              {authLoading ? "Checking..." : authMode === "register" ? "Create account" : "Login"}
            </button>
            <p className="text-sm text-[#607083]">{status}</p>
          </form>
        )}

        {step === "profile" && (
          <section className="grid gap-5">
            <div className="border border-[#d9e1ec] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Resume first</h2>
                <button onClick={handleLogout} className="rounded-md border border-[#b9c7d8] px-3 py-2 text-sm font-medium">
                  Logout
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="cursor-pointer rounded-md border border-[#b9c7d8] px-4 py-2 font-medium">
                  Upload resume
                  <input
                    type="file"
                    accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={(event) => handleResume(event.target.files?.[0])}
                  />
                </label>
                <span className="text-sm text-[#607083]">
                  {resumeName || "Upload PDF, DOCX, TXT, PNG, JPG, or WEBP. Scanned resumes use OCR."}
                </span>
              </div>
            </div>

            <div className="grid gap-4 border border-[#d9e1ec] bg-white p-5 lg:grid-cols-2">
              <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Full name" className="h-11 border border-[#cfd8e5] px-3" />
              <input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="Email" className="h-11 border border-[#cfd8e5] px-3" />
              <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="Phone" className="h-11 border border-[#cfd8e5] px-3" />
              <input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} placeholder="Address" className="h-11 border border-[#cfd8e5] px-3" />
              <input value={profile.school} onChange={(e) => setProfile({ ...profile, school: e.target.value })} placeholder="School" className="h-11 border border-[#cfd8e5] px-3" />
              <input value={profile.college} onChange={(e) => setProfile({ ...profile, college: e.target.value })} placeholder="College" className="h-11 border border-[#cfd8e5] px-3" />
              <textarea value={profile.experience} onChange={(e) => setProfile({ ...profile, experience: e.target.value })} placeholder="Experience" className="min-h-28 border border-[#cfd8e5] p-3 lg:col-span-2" />
              <input value={profile.skills.join(", ")} onChange={(e) => setProfile({ ...profile, skills: textToList(e.target.value) })} placeholder="Skills, comma separated" className="h-11 border border-[#cfd8e5] px-3" />
              <textarea value={profile.projects.join(", ")} onChange={(e) => setProfile({ ...profile, projects: textToList(e.target.value) })} placeholder="Projects, comma separated" className="min-h-24 border border-[#cfd8e5] p-3" />
            </div>

            <div className="grid gap-5 border border-[#d9e1ec] bg-white p-5">
              <h2 className="text-xl font-semibold">Job preferences</h2>
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="grid gap-2 text-sm font-medium">
                  Location
                  <select
                    value={profile.preferredLocations[0]}
                    onChange={(e) => setProfile({ ...profile, preferredLocations: [e.target.value as IndianLocation] })}
                    className="h-11 border border-[#cfd8e5] px-3"
                  >
                    {locations.map((location) => (
                      <option key={location}>{location}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Salary max
                  <input
                    type="range"
                    min="0"
                    max="3000000"
                    step="50000"
                    value={profile.salaryRange.max}
                    onChange={(e) => setProfile({ ...profile, salaryRange: { ...profile.salaryRange, max: Number(e.target.value) } })}
                  />
                  <span>Rs. {profile.salaryRange.min.toLocaleString()} - Rs. {profile.salaryRange.max.toLocaleString()}</span>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Apply time
                  <input type="time" value={profile.dailyApplyTime} onChange={(e) => setProfile({ ...profile, dailyApplyTime: e.target.value })} className="h-11 border border-[#cfd8e5] px-3" />
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <label className="grid gap-2 text-sm font-medium">
                  Current salary
                  <input value={profile.currentSalary || ""} onChange={(e) => setProfile({ ...profile, currentSalary: e.target.value })} placeholder="e.g. 5 LPA" className="h-11 border border-[#cfd8e5] px-3 font-normal" />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Expected salary
                  <input value={profile.expectedSalary || ""} onChange={(e) => setProfile({ ...profile, expectedSalary: e.target.value })} placeholder="e.g. 8 LPA" className="h-11 border border-[#cfd8e5] px-3 font-normal" />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Notice period
                  <input value={profile.noticePeriod || ""} onChange={(e) => setProfile({ ...profile, noticePeriod: e.target.value })} placeholder="e.g. 30 Days" className="h-11 border border-[#cfd8e5] px-3 font-normal" />
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium">Work mode</p>
                  <div className="flex flex-wrap gap-2">
                    {workModes.map((mode) => (
                      <button key={mode.value} type="button" onClick={() => setProfile({ ...profile, workModes: toggleValue(profile.workModes, mode.value) })} className={`rounded-md border px-3 py-2 ${profile.workModes.includes(mode.value) ? "border-[#245b59] bg-[#e7f1ef]" : "border-[#cfd8e5]"}`}>
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Job type</p>
                  <div className="flex flex-wrap gap-2">
                    {jobTypes.map((type) => (
                      <button key={type.value} type="button" onClick={() => setProfile({ ...profile, jobTypes: toggleValue(profile.jobTypes, type.value) })} className={`rounded-md border px-3 py-2 ${profile.jobTypes.includes(type.value) ? "border-[#245b59] bg-[#e7f1ef]" : "border-[#cfd8e5]"}`}>
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={saveProfile} className="h-11 w-fit rounded-md bg-[#245b59] px-5 font-semibold text-white">Save and enable automation</button>
              <p className="text-sm text-[#607083]">{status}</p>
            </div>
          </section>
        )}

        {step === "dashboard" && (
          <section className="grid gap-5">
            <div className="border border-[#d9e1ec] bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Automation ready</h2>
                  <p className="mt-2 text-[#4b5b6c]">
                    Your profile is saved for {profile.email}. The next step is connecting real job source adapters and
                    deploying the cron routes.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href="/jobs" className="rounded-md border border-[#b9c7d8] px-3 py-2 text-sm font-medium bg-[#e7f1ef] text-[#245b59]">
                    Jobs Explorer
                  </a>
                  <button onClick={() => setStep("profile")} className="rounded-md border border-[#b9c7d8] px-3 py-2 text-sm font-medium">
                    Edit profile
                  </button>
                  <button onClick={() => setStep("logs")} className="rounded-md border border-[#b9c7d8] px-3 py-2 text-sm font-medium">
                    View logs
                  </button>
                  <button
                    onClick={() => user && refreshDashboard(user.uid)}
                    className="rounded-md border border-[#b9c7d8] px-3 py-2 text-sm font-medium"
                  >
                    Refresh
                  </button>
                  <button onClick={handleLogout} className="rounded-md border border-[#b9c7d8] px-3 py-2 text-sm font-medium">
                    Logout
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[#4b5b6c]">
                Daily report PDF will include new relevant jobs, applied, failed, site/platform/email counts, and
                LinkedIn/Indeed/Naukri totals. Weekly report clears that week&apos;s application history after email.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                ["New relevant", dashboardStats.newRelevant.toString()],
                ["Applied today", dashboardStats.appliedToday.toString()],
                ["Failed today", dashboardStats.failedToday.toString()],
                ["Cooldown", "30 days"],
              ].map(([label, value]) => (
                <div key={label} className="border border-[#d9e1ec] bg-white p-5">
                  <p className="text-sm text-[#607083]">{label}</p>
                  <p className="mt-2 text-3xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="border border-[#d9e1ec] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">Applied jobs</h3>
                <p className="text-sm text-[#607083]">{applications.length} records</p>
              </div>

              {applications.length === 0 ? (
                <p className="mt-4 text-sm text-[#4b5b6c]">
                  No applications have been recorded yet. This means the daily cron has not successfully created
                  application records for your account.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#d9e1ec] text-[#607083]">
                        <th className="py-3 pr-4 font-medium">Job</th>
                        <th className="py-3 pr-4 font-medium">Company</th>
                        <th className="py-3 pr-4 font-medium">Source</th>
                        <th className="py-3 pr-4 font-medium">Channel</th>
                        <th className="py-3 pr-4 font-medium">Status</th>
                        <th className="py-3 pr-4 font-medium">Applied at</th>
                        <th className="py-3 pr-4 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((application) => {
                        const action = applicationAction(application);

                        return (
                          <tr key={application.id} className="border-b border-[#edf1f6]">
                            <td className="py-3 pr-4 font-medium text-[#17202a]">{application.job.title}</td>
                            <td className="py-3 pr-4 text-[#4b5b6c]">{application.job.company}</td>
                            <td className="py-3 pr-4 text-[#4b5b6c]">{application.source}</td>
                            <td className="py-3 pr-4 text-[#4b5b6c]">{application.channel}</td>
                            <td className="py-3 pr-4">
                              <span
                                className={`rounded-md px-2 py-1 text-xs font-semibold ${
                                  application.status === "applied"
                                    ? "bg-[#e7f1ef] text-[#245b59]"
                                    : application.status === "failed"
                                      ? "bg-[#fdecec] text-[#9b1c1c]"
                                      : "bg-[#f2f4f7] text-[#4b5b6c]"
                                }`}
                              >
                                {application.status}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-[#4b5b6c]">{new Date(application.createdAt).toLocaleString()}</td>
                            <td className="py-3 pr-4">
                              {action.disabled ? (
                                <button disabled className="rounded-md border border-[#d9e1ec] px-3 py-2 text-xs font-medium text-[#8a98aa]">
                                  No link
                                </button>
                              ) : (
                                <a
                                  href={action.href}
                                  target={application.channel === "email" ? undefined : "_blank"}
                                  rel={application.channel === "email" ? undefined : "noreferrer"}
                                  className="inline-flex rounded-md border border-[#b9c7d8] px-3 py-2 text-xs font-medium"
                                >
                                  {action.label}
                                </a>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="border border-[#d9e1ec] bg-white p-5">
              <h3 className="text-lg font-semibold">Saved profile</h3>
              <div className="mt-4 grid gap-3 text-sm text-[#4b5b6c] md:grid-cols-2">
                <p><span className="font-semibold text-[#17202a]">Name:</span> {profile.name || "Not set"}</p>
                <p><span className="font-semibold text-[#17202a]">Phone:</span> {profile.phone || "Not set"}</p>
                <p><span className="font-semibold text-[#17202a]">Location:</span> {profile.preferredLocations.join(", ")}</p>
                <p><span className="font-semibold text-[#17202a]">Notice period:</span> {profile.noticePeriod || "Not set"}</p>
                <p><span className="font-semibold text-[#17202a]">Current Salary:</span> {profile.currentSalary || "Not set"}</p>
                <p><span className="font-semibold text-[#17202a]">Expected Salary:</span> {profile.expectedSalary || "Not set"}</p>
                <p className="md:col-span-2"><span className="font-semibold text-[#17202a]">Apply time:</span> {profile.dailyApplyTime} IST</p>
                <p className="md:col-span-2"><span className="font-semibold text-[#17202a]">Skills:</span> {profile.skills.join(", ") || "Not set"}</p>
              </div>
            </div>
          </section>
        )}

        {step === "logs" && (
          <section className="grid gap-5">
            <div className="border border-[#d9e1ec] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Cron logs</h2>
                  <p className="mt-2 text-[#4b5b6c]">Latest daily, weekly, and cleanup runs for your account.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => user && loadCronLogs(user.uid)}
                    className="rounded-md border border-[#b9c7d8] px-3 py-2 text-sm font-medium"
                  >
                    Refresh
                  </button>
                  <button onClick={() => setStep("dashboard")} className="rounded-md border border-[#b9c7d8] px-3 py-2 text-sm font-medium">
                    Back
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {cronLogs.length === 0 ? (
                <div className="border border-[#d9e1ec] bg-white p-5 text-[#4b5b6c]">
                  No cron runs have been logged yet. After `/api/cron/daily`, `/api/cron/weekly`, or
                  `/api/cron/monthly-cleanup` runs, entries will appear here.
                </div>
              ) : (
                cronLogs.map((log) => (
                  <div key={log.id ?? `${log.job}-${log.startedAt}`} className="border border-[#d9e1ec] bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{log.job}</p>
                        <p className="text-sm text-[#607083]">{new Date(log.startedAt).toLocaleString()}</p>
                      </div>
                      <span
                        className={`rounded-md px-3 py-1 text-sm font-semibold ${
                          log.status === "success" ? "bg-[#e7f1ef] text-[#245b59]" : "bg-[#fdecec] text-[#9b1c1c]"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-[#4b5b6c]">{log.message}</p>
                    {log.error && <p className="mt-2 text-sm text-[#9b1c1c]">{log.error}</p>}
                    <div className="mt-4 grid gap-2 text-sm text-[#4b5b6c] md:grid-cols-4">
                      <p>Applied: {log.applied ?? 0}</p>
                      <p>Failed: {log.failed ?? 0}</p>
                      <p>Skipped: {log.skipped ?? 0}</p>
                      <p>Hashes deleted: {log.deletedJobHashes ?? 0}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>

      {isParsingResume && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm transition-all duration-300">
          <div className="flex items-center gap-3 text-4xl font-bold tracking-widest text-[#245b59] uppercase">
            <span className="animate-[pulse_1.5s_ease-in-out_infinite]">Auto</span>
            <span className="animate-[pulse_1.5s_ease-in-out_0.5s_infinite]">Apply</span>
            <span className="animate-[pulse_1.5s_ease-in-out_1s_infinite]">AI</span>
          </div>
          <p className="mt-6 text-[#4b5b6c] font-medium animate-pulse">Reading and analyzing resume...</p>
        </div>
      )}
    </main>
  );
}
