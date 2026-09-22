import type { NormalizedJob } from "@/types/job";
import type { CandidateProfile } from "@/types/profile";

export function isRelevantJob(job: NormalizedJob, profile: CandidateProfile) {
  const salaryOk =
    !job.salaryMin ||
    !job.salaryMax ||
    (job.salaryMax >= profile.salaryRange.min && job.salaryMin <= profile.salaryRange.max);

  return (
    (profile.preferredLocations as string[]).includes(job.location) &&
    profile.workModes.includes(job.workMode) &&
    profile.jobTypes.includes(job.jobType) &&
    salaryOk
  );
}

export function scoreJob(job: NormalizedJob, profile: CandidateProfile) {
  const text = `${job.title} ${job.description}`.toLowerCase();
  const skillHits = profile.skills.filter((skill) => text.includes(skill.toLowerCase())).length;
  return skillHits * 10 + ((profile.preferredLocations as string[]).includes(job.location) ? 5 : 0);
}
