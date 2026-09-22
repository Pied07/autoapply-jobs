"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { NormalizedJob, JobSource } from "@/types/job";
import type { CandidateProfile, IndianLocation, WorkMode, JobType } from "@/types/profile";

const LOCATIONS: IndianLocation[] = [
  "Bengaluru", "Chennai", "Delhi NCR", "Hyderabad",
  "Kolkata", "Mumbai", "Pune", "Ahmedabad", "Jaipur", "Remote India",
];
const WORK_MODES: WorkMode[] = ["remote", "hybrid", "office"];
const JOB_TYPES: JobType[] = ["internship", "fresher", "experienced", "part-time"];

const INDIAN_SOURCES: JobSource[] = ["google", "linkedin", "indeed", "naukri", "internshala", "timesjobs", "foundit", "hasjob"];
const REMOTE_SOURCES: JobSource[] = ["remoteok", "remotive", "weworkremotely", "arbeitnow", "jobicy"];
const ALL_SOURCES: JobSource[] = [...INDIAN_SOURCES, ...REMOTE_SOURCES];

const SOURCE_LABEL: Record<JobSource, string> = {
  google: "Google",
  linkedin: "LinkedIn",
  indeed: "Indeed",
  naukri: "Naukri",
  internshala: "Internshala",
  timesjobs: "TimesJobs",
  foundit: "Foundit",
  hasjob: "Hasjob",
  remoteok: "RemoteOK",
  remotive: "Remotive",
  weworkremotely: "WeWorkRemotely",
  arbeitnow: "Arbeitnow",
  jobicy: "Jobicy",
  freshersworld: "FreshersWorld",
};

const SOURCE_COLOR: Record<JobSource, string> = {
  google: "bg-slate-100 text-slate-700",
  linkedin: "bg-blue-100 text-blue-700",
  indeed: "bg-purple-100 text-purple-700",
  naukri: "bg-orange-100 text-orange-700",
  internshala: "bg-green-100 text-green-700",
  timesjobs: "bg-red-100 text-red-700",
  foundit: "bg-yellow-100 text-yellow-800",
  hasjob: "bg-emerald-100 text-emerald-800",
  remoteok: "bg-cyan-100 text-cyan-700",
  remotive: "bg-pink-100 text-pink-700",
  weworkremotely: "bg-indigo-100 text-indigo-700",
  arbeitnow: "bg-teal-100 text-teal-800",
  jobicy: "bg-sky-100 text-sky-800",
  freshersworld: "bg-gray-100 text-gray-700",
};

export default function JobsExplorer() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [jobs, setJobs] = useState<NormalizedJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [sourceStats, setSourceStats] = useState<Record<string, number>>({});

  // Filters
  const [keyword, setKeyword] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState<IndianLocation>("Remote India");
  const [workModes, setWorkModes] = useState<WorkMode[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [salaryMin, setSalaryMin] = useState(0);
  const [salaryMax, setSalaryMax] = useState(1200000);
  const [sources, setSources] = useState<JobSource[]>([...ALL_SOURCES]);
  const [withEmailsOnly, setWithEmailsOnly] = useState(false);
  const [applyingJobIds, setApplyingJobIds] = useState<Record<string, boolean>>({});
  const [applyMessages, setApplyMessages] = useState<Record<string, string>>({});

  const [activeSourceFilter, setActiveSourceFilter] = useState<JobSource | "all">("all");

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid)).catch(() => undefined);
        if (snap?.exists()) {
          const p = snap.data() as CandidateProfile;
          if (p.skills?.length) setKeyword(p.skills.slice(0, 3).join(", "));
          if (p.preferredLocations?.[0]) setLocation(p.preferredLocations[0]);
          if (p.workModes?.length) setWorkModes(p.workModes);
          if (p.jobTypes?.length) setJobTypes(p.jobTypes);
          if (p.salaryRange?.min != null) setSalaryMin(p.salaryRange.min);
          if (p.salaryRange?.max != null) setSalaryMax(p.salaryRange.max);
        }
      }
    });
  }, []);

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  function toggleGroup(group: JobSource[], select: boolean) {
    if (select) {
      setSources((prev) => Array.from(new Set([...prev, ...group])));
    } else {
      setSources((prev) => prev.filter((s) => !group.includes(s)));
    }
  }

  async function searchJobs() {
    if (!user) return;
    setLoadingJobs(true);
    setError(null);
    setSearched(true);
    setJobs([]);
    setSourceStats({});
    setActiveSourceFilter("all"); // Reset filter on new search

    try {
      const res = await fetch("/api/jobs/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, keyword, jobTitle, location, experience, workModes, jobTypes, salaryMin, salaryMax, sources }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch jobs");

      const allJobs: NormalizedJob[] = data.jobs ?? [];
      setJobs(allJobs);

      const stats: Record<string, number> = {};
      for (const src of sources) stats[src] = allJobs.filter((j) => j.source === src).length;
      setSourceStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingJobs(false);
    }
  }

  async function applyByEmail(job: NormalizedJob, applyEmail: string) {
    if (!user) return;

    setApplyingJobIds((prev) => ({ ...prev, [job.id]: true }));
    setApplyMessages((prev) => ({ ...prev, [job.id]: "" }));

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/jobs/apply-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: user.uid, job, applyEmail }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to send application email");

      setApplyMessages((prev) => ({ ...prev, [job.id]: "Application email sent." }));
      setJobs((prev) => prev.map((item) => item.id === job.id ? { ...item, applyChannel: "email", applyEmail } : item));
    } catch (err) {
      setApplyMessages((prev) => ({
        ...prev,
        [job.id]: err instanceof Error ? err.message : "Failed to send application email.",
      }));
    } finally {
      setApplyingJobIds((prev) => ({ ...prev, [job.id]: false }));
    }
  }

  if (authLoading) return <div className="p-8 text-center text-[#607083]">Loading...</div>;
  if (!user) return (
    <div className="p-8 text-center">
      <p className="text-[#4b5b6c]">Please log in to explore jobs.</p>
      <Link href="/" className="mt-4 inline-block text-[#31706f] hover:underline">Go to Dashboard</Link>
    </div>
  );

  const filteredJobs = jobs
    .filter((job) => activeSourceFilter === "all" || job.source === activeSourceFilter)
    .filter((job) => !withEmailsOnly || job.applyChannel === "email");

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#17202a]">
      {/* Header */}
      <section className="border-b border-[#d9e1ec] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#31706f]">AutoApply AI</p>
            <h1 className="text-2xl font-semibold">Job Explorer <span className="text-sm font-normal text-[#607083]">— 9 sources</span></h1>
          </div>
          <a href="/" className="rounded-md border border-[#cfd8e5] px-3 py-2 text-sm text-[#4b5b6c] hover:bg-[#e7edf5]">← Dashboard</a>
        </div>
      </section>

      <div className="mx-auto max-w-7xl p-5 space-y-5">
        {/* Filters */}
        <div className="rounded border border-[#d9e1ec] bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Search Filters</h2>

          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <label className="flex flex-col text-sm font-medium">
              Job Title
              <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} 
                     placeholder="e.g. Frontend Developer" onKeyDown={(e) => e.key === "Enter" && searchJobs()}
                     className="h-10 rounded border border-[#cfd8e5] px-3 text-sm outline-[#31706f] mt-1" />
            </label>
            <label className="flex flex-col text-sm font-medium">
              Keywords / Skills
              <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} 
                     placeholder="e.g. React, Node.js" onKeyDown={(e) => e.key === "Enter" && searchJobs()}
                     className="h-10 rounded border border-[#cfd8e5] px-3 text-sm outline-[#31706f] mt-1" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Experience (years)
              <input type="text" value={experience} onChange={(e) => setExperience(e.target.value)}
                placeholder="e.g. 0, 1, 2-3, fresher" onKeyDown={(e) => e.key === "Enter" && searchJobs()}
                className="h-10 rounded border border-[#cfd8e5] px-3 text-sm outline-[#31706f]" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Location
              <select value={location} onChange={(e) => setLocation(e.target.value as IndianLocation)}
                className="h-10 rounded border border-[#cfd8e5] px-3 text-sm outline-[#31706f]">
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-4 flex items-center">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer text-[#31706f]">
              <input type="checkbox" checked={withEmailsOnly} onChange={(e) => setWithEmailsOnly(e.target.checked)} className="h-4 w-4 rounded border-[#cfd8e5] accent-[#4d90fe]" />
              Show Only Jobs with Emails
            </label>
          </div>

          {/* Sources — Indian */}
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-3">
              <p className="text-sm font-medium">🇮🇳 Indian Portals</p>
              <button type="button" onClick={() => toggleGroup(INDIAN_SOURCES, INDIAN_SOURCES.every((s) => sources.includes(s)) ? false : true)}
                className="text-xs text-[#31706f] hover:underline">
                {INDIAN_SOURCES.every((s) => sources.includes(s)) ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {INDIAN_SOURCES.map((src) => (
                <button key={src} type="button" onClick={() => setSources(toggle(sources, src))}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${sources.includes(src) ? "border-[#245b59] bg-[#e7f1ef] text-[#245b59]" : "border-[#cfd8e5] text-[#9aabb8]"}`}>
                  {SOURCE_LABEL[src]}
                  {searched && sourceStats[src] !== undefined && (
                    <span className="ml-1.5 text-xs opacity-70">({sourceStats[src]})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Sources — Remote */}
          <div className="mt-3">
            <div className="mb-2 flex items-center gap-3">
              <p className="text-sm font-medium">🌍 Remote Global</p>
              <button type="button" onClick={() => toggleGroup(REMOTE_SOURCES, REMOTE_SOURCES.every((s) => sources.includes(s)) ? false : true)}
                className="text-xs text-[#31706f] hover:underline">
                {REMOTE_SOURCES.every((s) => sources.includes(s)) ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {REMOTE_SOURCES.map((src) => (
                <button key={src} type="button" onClick={() => setSources(toggle(sources, src))}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${sources.includes(src) ? "border-[#245b59] bg-[#e7f1ef] text-[#245b59]" : "border-[#cfd8e5] text-[#9aabb8]"}`}>
                  {SOURCE_LABEL[src]}
                  {searched && sourceStats[src] !== undefined && (
                    <span className="ml-1.5 text-xs opacity-70">({sourceStats[src]})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Work Mode & Job Type */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium">Work Mode</p>
              <div className="flex flex-wrap gap-2">
                {WORK_MODES.map((m) => (
                  <button key={m} type="button" onClick={() => setWorkModes(toggle(workModes, m))}
                    className={`rounded-md border px-3 py-1.5 text-sm capitalize ${workModes.includes(m) ? "border-[#245b59] bg-[#e7f1ef] text-[#245b59] font-medium" : "border-[#cfd8e5] text-[#607083]"}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Job Type</p>
              <div className="flex flex-wrap gap-2">
                {JOB_TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => setJobTypes(toggle(jobTypes, t))}
                    className={`rounded-md border px-3 py-1.5 text-sm capitalize ${jobTypes.includes(t) ? "border-[#245b59] bg-[#e7f1ef] text-[#245b59] font-medium" : "border-[#cfd8e5] text-[#607083]"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Salary */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Min Salary (₹/year)
              <input type="number" value={salaryMin} onChange={(e) => setSalaryMin(Number(e.target.value))} step={50000} min={0}
                className="h-10 rounded border border-[#cfd8e5] px-3 text-sm outline-[#31706f]" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Max Salary (₹/year)
              <input type="number" value={salaryMax} onChange={(e) => setSalaryMax(Number(e.target.value))} step={50000} min={0}
                className="h-10 rounded border border-[#cfd8e5] px-3 text-sm outline-[#31706f]" />
            </label>
          </div>

          <button type="button" onClick={searchJobs} disabled={loadingJobs || sources.length === 0}
            className="mt-5 rounded-md bg-[#245b59] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#1e4d4b] transition-colors">
            {loadingJobs ? `Searching ${sources.length} sources...` : `Search Jobs (${sources.length} sources)`}
          </button>
        </div>

        {/* Source result badges */}
        {searched && !loadingJobs && Object.keys(sourceStats).length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveSourceFilter("all")}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold ${
                activeSourceFilter === "all"
                  ? "bg-[#245b59] text-white"
                  : "bg-[#e7f1ef] text-[#245b59] hover:bg-[#d0e5e2]"
              }`}
            >
              All Jobs ({jobs.length})
            </button>
            {ALL_SOURCES.filter((s) => sources.includes(s)).map((src) => (
              <button
                key={src}
                onClick={() => setActiveSourceFilter(src)}
                disabled={(sourceStats[src] ?? 0) === 0}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  activeSourceFilter === src
                    ? "bg-[#245b59] text-white"
                    : (sourceStats[src] ?? 0) > 0
                    ? "bg-[#e7f1ef] text-[#245b59] hover:bg-[#d0e5e2]"
                    : "bg-[#f2f4f7] text-[#9aabb8] opacity-50 cursor-not-allowed"
                }`}
              >
                {SOURCE_LABEL[src]}: {sourceStats[src] ?? 0}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && <div className="rounded-md bg-[#fdecec] p-4 text-sm text-[#9b1c1c]"><strong>Error:</strong> {error}</div>}

        {/* Loading */}
        {loadingJobs && (
          <div className="py-12 text-center text-[#607083]">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#245b59] border-r-transparent" />
            <p className="font-medium">Scraping {sources.length} job sources in parallel...</p>
            <p className="mt-1 text-xs">LinkedIn · Indeed · Naukri · Internshala · TimesJobs · Foundit · Hasjob · RemoteOK · Remotive · WWR · Arbeitnow · Jobicy</p>
          </div>
        )}

        {/* No results */}
        {!loadingJobs && searched && jobs.length === 0 && !error && (
          <div className="rounded border border-[#d9e1ec] bg-white p-12 text-center">
            <p className="text-lg font-medium text-[#4b5b6c]">No jobs found across any source.</p>
            <p className="mt-2 text-sm text-[#607083]">Try different keywords or select more sources.</p>
          </div>
        )}

        {/* Results */}
        {!loadingJobs && jobs.length > 0 && (
          <>
            <p className="text-sm text-[#607083]">
              <strong className="text-[#17202a]">{filteredJobs.length}</strong> jobs found 
              {activeSourceFilter === "all" ? ` across ${Object.values(sourceStats).filter((n) => n > 0).length} sources` : ` from ${SOURCE_LABEL[activeSourceFilter]}`}
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredJobs.map((job, idx) => {
                const emails = Array.from(new Set([
                  job.applyEmail,
                  ...(job.description?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []),
                ].filter(Boolean) as string[]));
                const primaryEmail = job.applyEmail ?? emails[0];
                const isApplying = applyingJobIds[job.id] === true;
                const applyMessage = applyMessages[job.id];
                return (
                  <div key={job.id ?? idx} className="flex flex-col justify-between rounded border border-[#d9e1ec] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-[#17202a] leading-snug">{job.title}</h3>
                        <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold uppercase ${SOURCE_COLOR[job.source] ?? "bg-gray-100 text-gray-600"}`}>
                          {SOURCE_LABEL[job.source] ?? job.source}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-[#4b5b6c]">{job.company}</p>
                      <p className="mt-0.5 text-xs text-[#607083]">{[job.location, job.workMode, job.jobType].filter(Boolean).join(" • ")}</p>
                      {(job.salaryMin || job.salaryMax) && (
                        <p className="mt-1.5 text-xs font-semibold text-[#245b59]">
                          ₹{job.salaryMin?.toLocaleString("en-IN")} – ₹{job.salaryMax?.toLocaleString("en-IN")}
                        </p>
                      )}
                      {job.description && <p className="mt-3 line-clamp-2 text-xs text-[#607083]">{job.description}</p>}
                      
                      {emails.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {emails.map((email) => (
                            <a 
                              key={email} 
                              href={`mailto:${email}`}
                              className="inline-flex items-center gap-1 rounded bg-[#f2f4f7] px-2 py-1 text-[11px] font-medium text-[#4b5b6c] hover:bg-[#e7edf5]"
                            >
                              📧 {email}
                            </a>
                          ))}
                        </div>
                      )}
                      {applyMessage && (
                        <p className={`mt-2 text-xs font-medium ${applyMessage.includes("sent") ? "text-[#245b59]" : "text-[#9b1c1c]"}`}>
                          {applyMessage}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-[#edf1f6] pt-4">
                      <span className="text-xs text-[#9aabb8]">
                        {new Date(job.postedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                      {primaryEmail && (
                        <button
                          type="button"
                          onClick={() => applyByEmail(job, primaryEmail)}
                          disabled={isApplying}
                          className="rounded bg-[#245b59] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1e4d4b] disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                        >
                          {isApplying ? "Applying..." : applyMessage?.includes("sent") ? "Applied" : "Apply by Email"}
                        </button>
                      )}
                      {job.applyUrl && (
                        <a href={job.applyUrl} target="_blank" rel="noreferrer"
                          className="rounded border border-[#b9c7d8] px-3 py-1.5 text-xs font-medium hover:bg-[#f7f8fb] transition-colors">
                          Apply →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
