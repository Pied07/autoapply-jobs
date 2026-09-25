"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REMOTE_SOURCES = exports.INDIAN_SOURCES = exports.ALL_SOURCES = void 0;
exports.fetchJobs = fetchJobs;
exports.fetchJobsFromJSearch = fetchJobsFromJSearch;
var linkedin_1 = require("./scrapers/linkedin");
var indeed_1 = require("./scrapers/indeed");
var naukri_1 = require("./scrapers/naukri");
var internshala_1 = require("./scrapers/internshala");
var timesjobs_1 = require("./scrapers/timesjobs");
var foundit_1 = require("./scrapers/foundit");
var remoteok_1 = require("./scrapers/remoteok");
var remotive_1 = require("./scrapers/remotive");
var weworkremotely_1 = require("./scrapers/weworkremotely");
var arbeitnow_1 = require("./scrapers/arbeitnow");
var jobicy_1 = require("./scrapers/jobicy");
var hasjob_1 = require("./scrapers/hasjob");
var email_extractor_1 = require("./email-extractor");
var google_1 = require("./scrapers/google");
exports.ALL_SOURCES = [
    "google", "linkedin", "indeed", "naukri",
    "internshala", "timesjobs", "foundit", "hasjob",
    "remoteok", "remotive", "weworkremotely", "arbeitnow", "jobicy"
];
exports.INDIAN_SOURCES = ["google", "linkedin", "indeed", "naukri", "internshala", "timesjobs", "foundit", "hasjob"];
exports.REMOTE_SOURCES = ["remoteok", "remotive", "weworkremotely", "arbeitnow", "jobicy"];
// Run all selected scrapers in parallel and dedupe by title+company
function fetchJobs(params) {
    return __awaiter(this, void 0, void 0, function () {
        var sources, scraperMap, timeoutPromise, tasks, results, all, seen, deduped;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    sources = (_a = params.sources) !== null && _a !== void 0 ? _a : exports.ALL_SOURCES;
                    scraperMap = {
                        linkedin: function () { return (0, linkedin_1.scrapeLinkedIn)({ keyword: params.keyword, location: params.location, experience: params.experience }).catch(function () { return []; }); },
                        indeed: function () { return (0, indeed_1.scrapeIndeed)({ keyword: params.keyword, location: params.location, experience: params.experience }).catch(function () { return []; }); },
                        naukri: function () { return (0, naukri_1.scrapeNaukri)({ keyword: params.keyword, location: params.location, experience: params.experience }).catch(function () { return []; }); },
                        google: function () { return (0, google_1.scrapeGoogleJobs)({ keyword: params.keyword, location: params.location, platformName: "google" }).catch(function () { return []; }); },
                        internshala: function () { return (0, internshala_1.scrapeInternshala)({ keyword: params.keyword, location: params.location, experience: params.experience }).catch(function () { return []; }); },
                        timesjobs: function () { return (0, timesjobs_1.scrapeTimesJobs)({ keyword: params.keyword, location: params.location, experience: params.experience }).catch(function () { return []; }); },
                        foundit: function () { return (0, foundit_1.scrapeFoundit)({ keyword: params.keyword, location: params.location, experience: params.experience }).catch(function () { return []; }); },
                        hasjob: function () { return (0, hasjob_1.scrapeHasjob)({ keyword: params.keyword, location: params.location }).catch(function () { return []; }); },
                        remoteok: function () { return (0, remoteok_1.scrapeRemoteOK)({ keyword: params.keyword, location: params.location, experience: params.experience }).catch(function () { return []; }); },
                        remotive: function () { return (0, remotive_1.scrapeRemotive)({ keyword: params.keyword, location: params.location, experience: params.experience }).catch(function () { return []; }); },
                        weworkremotely: function () { return (0, weworkremotely_1.scrapeWeWorkRemotely)({ keyword: params.keyword, location: params.location }).catch(function () { return []; }); },
                        arbeitnow: function () { return (0, arbeitnow_1.scrapeArbeitnow)({ keyword: params.keyword, location: params.location }).catch(function () { return []; }); },
                        jobicy: function () { return (0, jobicy_1.scrapeJobicy)({ keyword: params.keyword, location: params.location }).catch(function () { return []; }); },
                        freshersworld: function () { return Promise.resolve([]); },
                    };
                    timeoutPromise = function (promise, ms, fallback) {
                        return Promise.race([
                            promise,
                            new Promise(function (resolve) { return setTimeout(function () { return resolve(fallback); }, ms); })
                        ]);
                    };
                    tasks = sources
                        .filter(function (s) { return s in scraperMap; })
                        .map(function (s) { return timeoutPromise(scraperMap[s](), 30000, []); });
                    return [4 /*yield*/, Promise.allSettled(tasks)];
                case 1:
                    results = _b.sent();
                    all = results
                        .map(function (r) { return r.status === 'fulfilled' ? r.value : []; })
                        .flat();
                    seen = new Set();
                    deduped = all.filter(function (job) {
                        var key = "".concat(job.title.toLowerCase().trim(), "-").concat(job.company.toLowerCase().trim());
                        if (seen.has(key))
                            return false;
                        seen.add(key);
                        return true;
                    });
                    return [2 /*return*/, (0, email_extractor_1.enrichJobsWithCareerEmails)(deduped)];
            }
        });
    });
}
// Legacy wrapper used by engine.ts
function fetchJobsFromJSearch(profile) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            return [2 /*return*/, fetchJobs({
                    keyword: ((_a = profile.skills) === null || _a === void 0 ? void 0 : _a.slice(0, 3).join(" ")) || "developer",
                    location: (_c = (_b = profile.preferredLocations) === null || _b === void 0 ? void 0 : _b[0]) !== null && _c !== void 0 ? _c : "Remote India",
                    workModes: profile.workModes,
                    jobTypes: profile.jobTypes,
                    salaryMin: (_d = profile.salaryRange) === null || _d === void 0 ? void 0 : _d.min,
                    salaryMax: (_e = profile.salaryRange) === null || _e === void 0 ? void 0 : _e.max,
                })];
        });
    });
}
