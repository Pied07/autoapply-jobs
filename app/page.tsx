"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { collection, doc, getDocs, getDoc, limit, orderBy, query, setDoc, where, updateDoc } from "firebase/firestore";
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
  jobAlertTime: "09:00",
  timezone: "Asia/Kolkata",
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
  const [dashboardStats, setDashboardStats] = useState<{
    newRelevant: number;
    appliedToday: number;
    failedToday: number;
    sources: Record<string, number>;
    platforms: Record<string, number>;
    locations: Record<string, number>;
    types: Record<string, number>;
    modes: Record<string, number>;
    companies: Record<string, number>;
    daily: { day: string; jobs: number }[];
    salaries: { min: number; max: number };
  }>({
    newRelevant: 0,
    appliedToday: 0,
    failedToday: 0,
    sources: {},
    platforms: {},
    locations: {},
    types: {},
    modes: {},
    companies: {},
    daily: [],
    salaries: { min: 0, max: 0 },
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
      getDocs(query(collection(db, "users", uid, "applications"), orderBy("createdAt", "desc"), limit(500))).catch(
        () => undefined,
      ),
    ]);

    const todayRows = todaySnapshot?.docs.map((applicationDoc) => ({ id: applicationDoc.id, ...applicationDoc.data() } as ApplicationRecord)) ?? [];
    const recentRows = recentSnapshot?.docs.map((applicationDoc) => ({ id: applicationDoc.id, ...applicationDoc.data() } as ApplicationRecord)) ?? [];

    const merged = [...todayRows, ...recentRows];
    // Deduplicate by ID
    const uniqueApplications = Array.from(new Map(merged.map(item => [item.id, item])).values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setApplications(uniqueApplications);
    const sources = todayRows.reduce((acc, row) => { acc[row.source] = (acc[row.source] || 0) + 1; return acc; }, {} as Record<string, number>);
    const platforms = todayRows.reduce((acc, row) => { acc[row.platform] = (acc[row.platform] || 0) + 1; return acc; }, {} as Record<string, number>);
    const locations = todayRows.reduce((acc, row) => { const loc = row.job?.location || 'Unknown'; acc[loc] = (acc[loc] || 0) + 1; return acc; }, {} as Record<string, number>);
    const modes = todayRows.reduce((acc, row) => { const mode = row.job?.workMode || 'unknown'; acc[mode] = (acc[mode] || 0) + 1; return acc; }, {} as Record<string, number>);
    const companies = todayRows.reduce((acc, row) => { const c = row.job?.company || 'Unknown'; acc[c] = (acc[c] || 0) + 1; return acc; }, {} as Record<string, number>);
    
    // Aggregate by day of week for the past 7 days
    const dailyMap = {} as Record<string, number>;
    recentRows.forEach(row => {
      const day = new Date(row.createdAt).toLocaleDateString('en-US', {weekday: 'short'});
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    });
    const daily = Object.entries(dailyMap).map(([day, jobs]) => ({ day, jobs }));

    const minS = todayRows.reduce((min, row) => Math.min(min, row.job?.salaryMin || Infinity), Infinity);
    const maxS = todayRows.reduce((max, row) => Math.max(max, row.job?.salaryMax || 0), 0);

    setDashboardStats({
      newRelevant: todayRows.length,
      appliedToday: todayRows.filter((row) => row.status === "applied").length,
      failedToday: todayRows.filter((row) => row.status === "failed").length,
      sources,
      platforms,
      locations,
      types: {},
      modes,
      companies,
      daily,
      salaries: { min: minS === Infinity ? 0 : minS, max: maxS }
    });
  }, []);

  const applicationAction = useCallback(
    (application: ApplicationRecord) => {
      const fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(application.job.company + ' careers')}`;
      const url = application.job.applyUrl || fallbackUrl;

      if (application.status === "applied") {
        return {
          href: url,
          label: "View Application",
          disabled: false,
        };
      }

      if (application.channel === "email" && !application.job.applyUrl) {
        const email = buildApplicationEmail(profile, application.job.company, application.job.title);
        const recipient = application.job.applyEmail || "";

        return {
          href: `mailto:${recipient}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.text)}`,
          label: "Open email",
          disabled: !recipient,
        };
      }

      return {
        href: url,
        label: application.channel === "site" ? "Apply Manually" : `Open ${application.source}`,
        disabled: false,
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
        setDashboardStats({ newRelevant: 0, appliedToday: 0, failedToday: 0, sources: {}, platforms: {}, locations: {}, types: {}, modes: {}, companies: {}, daily: [], salaries: {min:0, max:0} });
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

      if (!response.ok) {
        setStatus(`Resume parsing failed (Server Error ${response.status}). Trying to upload anyway...`);
        // We will continue to save the uploaded file, but without parsing
      }

      let data: any = null;
      if (response.ok) {
        try {
          data = await response.json();
        } catch (e) {
          console.error("Failed to parse API response", e);
          setStatus("Resume parsing failed. The server returned an invalid response.");
          return;
        }
      }

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

      if (!response.ok || !data?.parsed) {
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

  async function toggleAutoApply() {
    if (!user) return;
    const newValue = !profile.autoApplyEnabled;
    setStatus(newValue ? "Enabling auto apply..." : "Disabling auto apply...");
    try {
      await setDoc(doc(db, "users", user.uid), { autoApplyEnabled: newValue }, { merge: true });
      setProfile((current) => ({ ...current, autoApplyEnabled: newValue }));
      setStatus(`Auto apply is now ${newValue ? "ON" : "OFF"}`);
    } catch (e) {
      setStatus("Failed to update auto apply setting.");
    }
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
            {user ? `Logged in: ${user.email}` : `Guest`}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit border border-[#d9e1ec] bg-white p-4">
          {(user ? ["logout", "profile", "dashboard"] : ["login", "profile", "dashboard"]).map((item, index) => (
            <button 
              key={item} 
              onClick={() => item === "logout" ? handleLogout() : setStep(item as "login" | "profile" | "dashboard" | "logs")}
              className="flex w-full items-center gap-3 py-3 px-2 rounded-md text-left transition-colors hover:bg-[#f7f8fb]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#e7f1ef] text-sm font-semibold text-[#245b59]">
                {index + 1}
              </span>
              <span className={step === item ? "font-semibold text-[#17202a]" : "text-[#607083]"}>
                {item === "login" ? "Login" : item === "logout" ? "Logout" : item === "profile" ? "Profile completion" : "Reports"}
              </span>
            </button>
          ))}
          {user && (
            <button 
              onClick={() => setStep("logs")} 
              className="flex w-full items-center gap-3 py-3 px-2 rounded-md text-left transition-colors hover:bg-[#f7f8fb]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#e7f1ef] text-sm font-semibold text-[#245b59]">
                4
              </span>
              <span className={step === "logs" ? "font-semibold text-[#17202a]" : "text-[#607083]"}>Cron logs</span>
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
              {profile.resumeUrl && (
                <div className="mt-4 border border-[#e1e7ef] rounded-md overflow-hidden bg-gray-50 p-2">
                  <p className="text-sm font-medium mb-2 text-[#4b5b6c]">Current Resume Preview:</p>
                  <iframe src={profile.resumeUrl} className="w-full h-96 border-0" title="Resume Preview" />
                </div>
              )}
            </div>

            <div className="grid gap-4 border border-[#d9e1ec] bg-white p-5 lg:grid-cols-2">
              <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Full name" className="h-11 border border-[#cfd8e5] px-3" />
              <input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="Email" className="h-11 border border-[#cfd8e5] px-3" />
              <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="Phone" className="h-11 border border-[#cfd8e5] px-3" />
              <input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} placeholder="Address" className="h-11 border border-[#cfd8e5] px-3" />
              
              <div className="flex gap-4">
                <select value={profile.gender || ""} onChange={(e) => setProfile({ ...profile, gender: e.target.value as any })} className="h-11 flex-1 border border-[#cfd8e5] px-3 text-[#607083]">
                  <option value="" disabled>Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
                <div className="flex h-11 flex-1 items-center border border-[#cfd8e5] px-3 text-[#607083] bg-white">
                  <input type="date" value={profile.birthDate || ""} onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })} className="flex-1 outline-none bg-transparent" />
                  {profile.birthDate && <span className="ml-2 text-xs font-semibold whitespace-nowrap text-[#245b59]">{Math.floor((new Date().getTime() - new Date(profile.birthDate).getTime()) / 31557600000)} yrs</span>}
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex flex-col flex-1">
                  <label className="text-xs text-[#607083] mb-1">Daily Alert Time</label>
                  <input type="time" value={profile.jobAlertTime || "09:00"} onChange={(e) => setProfile({ ...profile, jobAlertTime: e.target.value })} className="h-11 border border-[#cfd8e5] px-3 text-[#607083]" />
                </div>
                <div className="flex flex-col flex-1">
                  <label className="text-xs text-[#607083] mb-1">Timezone</label>
                  <select value={profile.timezone || "Asia/Kolkata"} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} className="h-11 border border-[#cfd8e5] px-3 text-[#607083]">
                    <option value="Asia/Kolkata">IST (Asia/Kolkata)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">EST (America/New_York)</option>
                    <option value="America/Los_Angeles">PST (America/Los_Angeles)</option>
                    <option value="Europe/London">GMT (Europe/London)</option>
                  </select>
                </div>
              </div>
              
              <input value={profile.school} onChange={(e) => setProfile({ ...profile, school: e.target.value })} placeholder="School" className="h-11 border border-[#cfd8e5] px-3" />
              <input value={profile.college} onChange={(e) => setProfile({ ...profile, college: e.target.value })} placeholder="College" className="h-11 border border-[#cfd8e5] px-3" />
              <textarea value={profile.experience} onChange={(e) => setProfile({ ...profile, experience: e.target.value })} placeholder="Experience" className="min-h-28 border border-[#cfd8e5] p-3 lg:col-span-2" />
              <input value={profile.skills.join(", ")} onChange={(e) => setProfile({ ...profile, skills: textToList(e.target.value) })} placeholder="Skills, comma separated" className="h-11 border border-[#cfd8e5] px-3 lg:col-span-2" />
              <textarea value={profile.projects.join(", ")} onChange={(e) => setProfile({ ...profile, projects: textToList(e.target.value) })} placeholder="Projects, comma separated" className="min-h-24 border border-[#cfd8e5] p-3" />
            </div>

            <div className="grid gap-5 border border-[#d9e1ec] bg-white p-5">
              <h2 className="text-xl font-semibold">Job preferences</h2>
              <div className="grid gap-4 lg:grid-cols-2">
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
              </div>

              <div className="grid gap-4 lg:grid-cols-4 mt-4">
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
                <label className="grid gap-2 text-sm font-medium">
                  Years of Exp.
                  <input type="number" min="0" max="50" value={profile.yearsOfExperience || ""} onChange={(e) => setProfile({ ...profile, yearsOfExperience: e.target.value })} placeholder="e.g. 4" className="h-11 border border-[#cfd8e5] px-3 font-normal" />
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


              <button onClick={saveProfile} className="h-11 w-fit rounded-md bg-[#245b59] px-5 font-semibold text-white">Save profile</button>
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
            <div className="border border-[#d9e1ec] bg-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Daily Job Alerts</h3>
                <p className="text-sm text-[#4b5b6c]">When enabled, the system will email you new matching jobs everyday at your configured time.</p>
              </div>
              <button 
                onClick={toggleAutoApply}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${profile.autoApplyEnabled ? 'bg-[#245b59]' : 'bg-[#cfd8e5]'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profile.autoApplyEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                ["New relevant", dashboardStats.newRelevant.toString()],
                ["Applied today", dashboardStats.appliedToday.toString()],
                ["Pending applications", dashboardStats.failedToday.toString()],
                ["Cooldown", "30 days"],
              ].map(([label, value]) => (
                <div key={label} className="border border-[#d9e1ec] bg-white p-4 md:p-5">
                  <p className="text-xs md:text-sm text-[#607083]">{label}</p>
                  <p className="mt-1 md:mt-2 text-2xl md:text-3xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
            
            
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <div className="border border-[#1e293b] bg-[#0f172a] p-5 rounded-lg md:col-span-2">
                <h3 className="mb-4 text-lg font-semibold text-[#38bdf8]">Jobs By Platform</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={Object.entries(dashboardStats.platforms).map(([name, value]) => ({ name, value }))} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                        {Object.keys(dashboardStats.platforms).map((_, index) => <Cell key={index} fill={['#38bdf8', '#818cf8', '#c084fc', '#f472b6'][index % 4]} />)}
                      </Pie>
                      <Tooltip cursor={false} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-[#1e293b] bg-[#0f172a] p-5 rounded-lg md:col-span-2">
                <h3 className="mb-4 text-lg font-semibold text-[#38bdf8]">Daily Found Trend</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardStats.daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="day" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip cursor={false} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
                      <Bar dataKey="jobs" fill="#818cf8" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-[#1e293b] bg-[#0f172a] p-5 rounded-lg md:col-span-2">
                <h3 className="mb-4 text-lg font-semibold text-[#38bdf8]">Top Sources</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={Object.entries(dashboardStats.sources).map(([name, value]) => ({ name, value }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} />
                      <Tooltip cursor={false} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
                      <Bar dataKey="value" fill="#c084fc" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-[#1e293b] bg-[#0f172a] p-5 rounded-lg md:col-span-2">
                <h3 className="mb-4 text-lg font-semibold text-[#38bdf8]">Work Modes</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={Object.entries(dashboardStats.modes).map(([name, value]) => ({ name, value }))} dataKey="value" cx="50%" cy="50%" outerRadius={80}>
                        {Object.keys(dashboardStats.modes).map((_, index) => <Cell key={index} fill={['#f472b6', '#38bdf8', '#4ade80'][index % 3]} />)}
                      </Pie>
                      <Tooltip cursor={false} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="border border-[#1e293b] bg-[#0f172a] p-5 rounded-lg md:col-span-2">
                <h3 className="mb-4 text-lg font-semibold text-[#38bdf8]">Location Heatmap</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(dashboardStats.locations).map(([loc, jobs]) => ({ loc, jobs }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="loc" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip cursor={false} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
                      <Bar dataKey="jobs" fill="#4ade80" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-[#1e293b] bg-[#0f172a] p-5 rounded-lg md:col-span-2">
                <h3 className="mb-4 text-lg font-semibold text-[#38bdf8]">Salary Expectations</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{type:'Min', val: dashboardStats.salaries.min}, {type:'Max', val: dashboardStats.salaries.max}]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="type" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip cursor={false} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
                      <Bar dataKey="val" fill="#fb7185" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-[#1e293b] bg-[#0f172a] p-5 rounded-lg md:col-span-2">
                <h3 className="mb-4 text-lg font-semibold text-[#38bdf8]">Top Companies</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={Object.entries(dashboardStats.companies).sort((a,b)=>b[1]-a[1]).slice(0, 5).map(([name, v]) => ({ name, v }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" width={60} />
                      <Tooltip cursor={false} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
                      <Bar dataKey="v" fill="#e879f9" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-[#1e293b] bg-[#0f172a] p-5 rounded-lg md:col-span-2">
                <h3 className="mb-4 text-lg font-semibold text-[#38bdf8]">Applied Status</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{name: "Applied", value: dashboardStats.appliedToday}, {name: "Pending", value: dashboardStats.newRelevant - dashboardStats.appliedToday}]} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip cursor={false} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
<div className="border border-[#d9e1ec] bg-white p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-semibold text-[#245b59]">Successfully Applied Jobs</h3>
                <p className="text-sm text-[#607083]">{applications.filter(a => a.status === 'applied').length} records</p>
              </div>

              {applications.filter(a => a.status === 'applied').length === 0 ? (
                <p className="text-sm text-[#4b5b6c]">No successful applications yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#d9e1ec] text-[#607083]">
                        <th className="py-3 pr-4 font-medium">#</th>
                        <th className="py-3 pr-4 font-medium">Job</th>
                        <th className="py-3 pr-4 font-medium">Company</th>
                        <th className="py-3 pr-4 font-medium">Source</th>
                        <th className="py-3 pr-4 font-medium">Applied at</th>
                        <th className="py-3 pr-4 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.filter(a => a.status === 'applied').map((application, idx) => {
                        const action = applicationAction(application);
                        return (
                          <tr key={application.id} className="border-b border-[#edf1f6]">
                            <td className="py-3 pr-4 font-medium text-[#17202a]">{idx + 1}</td>
                            <td className="py-3 pr-4 font-medium text-[#17202a]">{application.job.title}</td>
                            <td className="py-3 pr-4 text-[#4b5b6c]">{application.job.company}</td>
                            <td className="py-3 pr-4 text-[#4b5b6c]">{application.source}</td>
                            <td className="py-3 pr-4 text-[#4b5b6c]">{new Date(application.createdAt).toLocaleString()}</td>
                            <td className="py-3 pr-4">
                              {action.disabled ? (
                                <button disabled className="rounded-md border border-[#d9e1ec] px-3 py-2 text-xs font-medium text-[#8a98aa]">No link</button>
                              ) : (
                                <div className="flex gap-2">
                                  <a href={action.href} target="_blank" rel="noreferrer" className="inline-flex rounded-md border border-[#b9c7d8] px-3 py-2 text-xs font-medium">
                                    {action.label}
                                  </a>
                                  {application.status === 'applied' && (
                                    <a href={application.job.applyUrl || `https://www.google.com/search?q=${encodeURIComponent(application.job.company + ' careers')}`} target="_blank" rel="noreferrer" className="inline-flex rounded-md border border-[#2563eb] text-[#2563eb] px-3 py-2 text-xs font-medium">
                                      Apply Link
                                    </a>
                                  )}
                                </div>
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

            <div className="border border-[#d9e1ec] bg-white p-4 md:p-5 mt-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-semibold text-[#2563eb]">Pending Jobs</h3>
                <p className="text-sm text-[#607083]">{applications.filter(a => a.status === 'failed').length} records</p>
              </div>

              {applications.filter(a => a.status === 'failed').length === 0 ? (
                <p className="text-sm text-[#4b5b6c]">No pending jobs.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#d9e1ec] text-[#607083]">
                        <th className="py-3 pr-4 font-medium">#</th>
                        <th className="py-3 pr-4 font-medium">Job</th>
                        <th className="py-3 pr-4 font-medium">Company</th>
                        <th className="py-3 pr-4 font-medium">Source</th>
                        <th className="py-3 pr-4 font-medium">Alerted at</th>
                        <th className="py-3 pr-4 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.filter(a => a.status === 'failed').map((application, idx) => {
                        const action = applicationAction(application);
                        return (
                          <tr key={application.id} className="border-b border-[#edf1f6]">
                            <td className="py-3 pr-4 font-medium text-[#17202a]">{idx + 1}</td>
                            <td className="py-3 pr-4 font-medium text-[#17202a]">{application.job.title}</td>
                            <td className="py-3 pr-4 text-[#4b5b6c]">{application.job.company}</td>
                            <td className="py-3 pr-4 text-[#4b5b6c]">{application.source}</td>
                            <td className="py-3 pr-4 text-[#4b5b6c]">{new Date(application.createdAt).toLocaleString()}</td>
                            <td className="py-3 pr-4">
                              {action.disabled ? (
                                <button disabled className="rounded-md border border-[#d9e1ec] px-3 py-2 text-xs font-medium text-[#8a98aa]">No link</button>
                              ) : (
                                <a 
                                  href={action.href} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  onClick={() => {
                                    updateDoc(doc(db, "users", profile.uid, "applications", application.id), { status: "applied" })
                                      .then(() => refreshDashboard(profile.uid));
                                  }}
                                  className="inline-flex rounded-md border border-[#2563eb] text-[#2563eb] px-3 py-2 text-xs font-medium hover:bg-[#2563eb] hover:text-white transition-colors">
                                  Apply Manually
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
                <p><span className="font-semibold text-[#17202a]">Gender:</span> {profile.gender || "Not set"}</p>
                <p><span className="font-semibold text-[#17202a]">Birth Date:</span> {profile.birthDate || "Not set"}</p>
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
