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
exports.scrapeNaukri = scrapeNaukri;
var normalizer_1 = require("../normalizer");
var email_extractor_1 = require("../email-extractor");
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function asRecordArray(value) {
    return Array.isArray(value) ? value.filter(function (item) { return Boolean(item) && typeof item === "object" && !Array.isArray(item); }) : [];
}
function slug(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function naukriLocation(location) {
    if (location === "Remote India")
        return "";
    if (location === "Delhi NCR")
        return "Delhi / NCR";
    return location;
}
function pickString() {
    var values = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        values[_i] = arguments[_i];
    }
    for (var _a = 0, values_1 = values; _a < values_1.length; _a++) {
        var value = values_1[_a];
        if (typeof value === "string" && value.trim())
            return value.trim();
    }
    return "";
}
function getJobList(payload) {
    var _a;
    var root = asRecord(payload);
    var data = asRecord(root.data);
    var candidates = [
        root.jobDetails,
        root.jobs,
        data.jobDetails,
        data.jobs,
        root.jobList,
        data.jobList,
    ];
    return (_a = candidates.map(asRecordArray).find(function (items) { return items.length > 0; })) !== null && _a !== void 0 ? _a : [];
}
function buildJobUrl(job) {
    var raw = pickString(job.jdURL, job.jobUrl, job.url, job.applyUrl);
    if (!raw)
        return "https://www.naukri.com/";
    if (raw.startsWith("http"))
        return raw;
    return "https://www.naukri.com".concat(raw.startsWith("/") ? raw : "/".concat(raw));
}
function inferWorkMode(description, location) {
    var lower = description.toLowerCase();
    if (location === "Remote India" || lower.includes("remote") || lower.includes("work from home"))
        return "remote";
    if (lower.includes("hybrid"))
        return "hybrid";
    return "office";
}
function scrapeNaukri(params) {
    return __awaiter(this, void 0, void 0, function () {
        var keyword, loc, pages, results, jobs, error_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    keyword = params.keyword || "developer";
                    loc = naukriLocation(params.location);
                    pages = [1, 2, 3];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, Promise.all(pages.map(function (pageNo) { return __awaiter(_this, void 0, void 0, function () {
                            var url, res, payload;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        url = new URL("https://www.naukri.com/jobapi/v3/search");
                                        url.searchParams.set("noOfResults", "20");
                                        url.searchParams.set("urlType", "search_by_keyword");
                                        url.searchParams.set("searchType", "adv");
                                        url.searchParams.set("keyword", keyword);
                                        url.searchParams.set("pageNo", String(pageNo));
                                        url.searchParams.set("seoKey", "".concat(slug(keyword), "-jobs").concat(loc ? "-in-".concat(slug(loc)) : ""));
                                        url.searchParams.set("src", "jobsearchDesk");
                                        if (loc)
                                            url.searchParams.set("location", loc);
                                        if (params.experience)
                                            url.searchParams.set("experience", params.experience);
                                        return [4 /*yield*/, fetch(url, {
                                                headers: {
                                                    Accept: "application/json",
                                                    "AppId": "109",
                                                    "SystemId": "109",
                                                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
                                                    Referer: "https://www.naukri.com/".concat(slug(keyword), "-jobs"),
                                                },
                                                next: { revalidate: 3600 },
                                            })];
                                    case 1:
                                        res = _a.sent();
                                        if (!res.ok) {
                                            console.warn("[Naukri] page ".concat(pageNo, " failed: ").concat(res.status));
                                            return [2 /*return*/, []];
                                        }
                                        return [4 /*yield*/, res.json()];
                                    case 2:
                                        payload = _a.sent();
                                        return [2 /*return*/, getJobList(payload)];
                                }
                            });
                        }); }))];
                case 2:
                    results = _a.sent();
                    jobs = results.flat().map(function (job) {
                        var _a;
                        var companyRecord = asRecord(job.company);
                        var placeholders = asRecord(job.placeholders);
                        var title = pickString(job.title, job.jobTitle, job.designation);
                        var company = pickString(job.companyName, job.company, job.compName, companyRecord.name);
                        var description = pickString(job.jobDescription, job.description, job.jobDesc, job.tagsAndSkills, Array.isArray(job.keySkills) ? job.keySkills.join(", ") : job.keySkills);
                        var applyEmail = (0, email_extractor_1.extractCareerEmails)(description)[0];
                        var applyUrl = buildJobUrl(job);
                        if (!title || !company)
                            return null;
                        return (0, normalizer_1.normalizeJob)({
                            title: title,
                            company: company,
                            location: params.location,
                            source: "naukri",
                            platform: "naukri",
                            applyChannel: applyEmail ? "email" : "site",
                            applyEmail: applyEmail,
                            applyUrl: applyUrl,
                            workMode: inferWorkMode("".concat(description, " ").concat(pickString(placeholders.location, job.location)), params.location),
                            jobType: ((_a = params.experience) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes("fresher")) ? "fresher" : "experienced",
                            description: description.slice(0, 500),
                            postedAt: pickString(job.createdDate, job.footerPlaceholderLabel, job.postedDate) || new Date().toISOString(),
                        });
                    }).filter(function (job) { return job !== null; });
                    console.log("[Naukri API] scraped ".concat(jobs.length, " jobs"));
                    return [2 /*return*/, jobs];
                case 3:
                    error_1 = _a.sent();
                    console.error("[Naukri] fetch error:", error_1);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
