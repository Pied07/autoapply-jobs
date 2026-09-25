import type { ApplicationReport } from "@/types/application";
import type { CandidateProfile } from "@/types/profile";

export function buildApplicationEmail(profile: CandidateProfile, company: string, title: string) {
  const firstName = profile.name.split(" ")[0] || profile.name;
  const skills = profile.skills.length ? profile.skills.slice(0, 6).join(", ") : "modern web development";
  const experience = profile.experience || "building scalable and user-friendly web applications";

  const lines = [
    `Dear Hiring Manager,`,
    ``,
    `I am writing to apply for the ${title} position at ${company}. I have hands-on experience in ${experience}. My core skills include ${skills}, and I enjoy building efficient, maintainable, and user-friendly software.`,
    ``,
    `I am eager to bring my technical skills, problem-solving mindset, and enthusiasm for learning to your team. My resume is attached for your consideration, and I would be glad to discuss how I can contribute to ${company}'s success.`,
    ``,
  ];

  if (profile.noticePeriod || profile.currentSalary || profile.expectedSalary) {
    lines.push(`Additional Information:`);
    if (profile.noticePeriod) lines.push(`- Notice Period: ${profile.noticePeriod}`);
    if (profile.currentSalary) lines.push(`- Current Salary: ${profile.currentSalary}`);
    if (profile.expectedSalary) lines.push(`- Expected Salary: ${profile.expectedSalary}`);
    lines.push(``);
  }

  lines.push(`Best regards,`);
  lines.push(`${profile.name || firstName}`);
  if (profile.phone) lines.push(`${profile.phone}`);

  return {
    subject: `Application for ${title}`,
    text: lines.join("\n"),
  };
}

export function buildReportEmail(report: ApplicationReport) {
  return {
    subject: `${report.period === "weekly" ? "Weekly" : "Daily"} job application report`,
    text: `New relevant jobs: ${report.newRelevantJobs}
Applied: ${report.applied}
Failed: ${report.failed}
Skipped: ${report.skipped}

Platform applications: ${report.byChannel.platform}
Company site applications: ${report.byChannel.site}
Email applications: ${report.byChannel.email}

LinkedIn: ${report.bySource.linkedin || 0}
Indeed: ${report.bySource.indeed || 0}
Naukri: ${report.bySource.naukri || 0}`,
  };
}

export function buildJobAlertEmail(jobs: any[]) {
  if (jobs.length === 0) {
    return {
      subject: `No new jobs today`,
      text: `We checked the job boards, but there were no new matches for your profile today. We'll check again tomorrow!`,
    };
  }

  const jobList = jobs.map(j => `- ${j.title} at ${j.company} [Location: ${j.location}]\n  Apply here: ${j.applyUrl}`).join('\n\n');

  return {
    subject: `Your Daily Job Alerts (${jobs.length} new jobs)`,
    text: `Here are the latest jobs matching your profile:\n\n${jobList}\n\nGood luck with your applications!\n\n- AutoApply AI`,
  };
}
