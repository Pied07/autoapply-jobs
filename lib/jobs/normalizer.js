"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeJob = normalizeJob;
exports.getDemoIndianJobs = getDemoIndianJobs;
function normalizeJob(job) {
    var id = "".concat(job.source, "-").concat(job.company, "-").concat(job.title, "-").concat(job.location)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    return __assign(__assign({}, job), { id: id, discoveredAt: new Date().toISOString() });
}
function getDemoIndianJobs() {
    var today = new Date().toISOString();
    return [
        normalizeJob({
            title: "Software Developer Fresher",
            company: "Eastern Code Labs",
            location: "Kolkata",
            source: "naukri",
            platform: "naukri",
            applyChannel: "email",
            applyEmail: "careers@example.com",
            salaryMin: 250000,
            salaryMax: 600000,
            workMode: "hybrid",
            jobType: "fresher",
            description: "Laravel, React.js, Node.js, MySQL, API integration and dashboard development.",
            postedAt: today,
        }),
        normalizeJob({
            title: "React Developer Intern",
            company: "Kolkata Product Studio",
            location: "Kolkata",
            source: "linkedin",
            platform: "linkedin",
            applyChannel: "platform",
            applyUrl: "https://www.linkedin.com/jobs/",
            salaryMin: 12000,
            salaryMax: 25000,
            workMode: "hybrid",
            jobType: "internship",
            description: "React, Next.js, TypeScript, HTML, CSS and frontend feature implementation.",
            postedAt: today,
        }),
        normalizeJob({
            title: "Junior Laravel React Engineer",
            company: "Durgapur WebWorks",
            location: "Kolkata",
            source: "indeed",
            platform: "indeed",
            applyChannel: "site",
            applyUrl: "https://in.indeed.com/",
            salaryMin: 300000,
            salaryMax: 700000,
            workMode: "remote",
            jobType: "fresher",
            description: "Laravel, PHP, React.js, MySQL, REST APIs and maintenance of web applications.",
            postedAt: today,
        }),
        normalizeJob({
            title: "Frontend Developer Intern",
            company: "BrightApps",
            location: "Bengaluru",
            source: "linkedin",
            platform: "linkedin",
            applyChannel: "platform",
            applyUrl: "https://www.linkedin.com/jobs/",
            salaryMin: 10000,
            salaryMax: 25000,
            workMode: "hybrid",
            jobType: "internship",
            description: "React, Next.js, Firebase and UI implementation for SaaS dashboards.",
            postedAt: today,
        }),
        normalizeJob({
            title: "Junior Full Stack Engineer",
            company: "LedgerStack",
            location: "Pune",
            source: "indeed",
            platform: "indeed",
            applyChannel: "site",
            applyUrl: "https://in.indeed.com/",
            salaryMin: 350000,
            salaryMax: 650000,
            workMode: "office",
            jobType: "fresher",
            description: "Build APIs, dashboards and workflow automations using TypeScript.",
            postedAt: today,
        }),
        normalizeJob({
            title: "Remote React Developer",
            company: "CloudHire India",
            location: "Remote India",
            source: "naukri",
            platform: "naukri",
            applyChannel: "email",
            applyEmail: "careers@example.com",
            salaryMin: 500000,
            salaryMax: 900000,
            workMode: "remote",
            jobType: "experienced",
            description: "React, accessibility, component systems and production support.",
            postedAt: today,
        }),
    ];
}
