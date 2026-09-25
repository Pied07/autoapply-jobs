"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRelevantJob = isRelevantJob;
exports.scoreJob = scoreJob;
function isRelevantJob(job, profile) {
    var salaryOk = !job.salaryMin ||
        !job.salaryMax ||
        (job.salaryMax >= profile.salaryRange.min && job.salaryMin <= profile.salaryRange.max);
    return (profile.preferredLocations.includes(job.location) &&
        profile.workModes.includes(job.workMode) &&
        profile.jobTypes.includes(job.jobType) &&
        salaryOk);
}
function scoreJob(job, profile) {
    var text = "".concat(job.title, " ").concat(job.description).toLowerCase();
    var skillHits = profile.skills.filter(function (skill) { return text.includes(skill.toLowerCase()); }).length;
    return skillHits * 10 + (profile.preferredLocations.includes(job.location) ? 5 : 0);
}
