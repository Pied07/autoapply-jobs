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
exports.scrapeJobicy = scrapeJobicy;
var normalizer_1 = require("../normalizer");
// Jobicy public API (Remote jobs)
// https://jobicy.com/api/v2/remote-jobs
function scrapeJobicy(params) {
    return __awaiter(this, void 0, void 0, function () {
        var url, res, e_1, data, _a, keywordLower, jobs;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    url = "https://jobicy.com/api/v2/remote-jobs";
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch(url, {
                            headers: {
                                "User-Agent": "Mozilla/5.0",
                                "Accept": "application/json",
                            },
                            cache: "no-store",
                        })];
                case 2:
                    res = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _b.sent();
                    console.error("[Jobicy] fetch error:", e_1);
                    return [2 /*return*/, []];
                case 4:
                    if (!res.ok) {
                        console.error("[Jobicy] HTTP", res.status);
                        return [2 /*return*/, []];
                    }
                    _b.label = 5;
                case 5:
                    _b.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, res.json()];
                case 6:
                    data = (_b.sent());
                    return [3 /*break*/, 8];
                case 7:
                    _a = _b.sent();
                    return [2 /*return*/, []];
                case 8:
                    keywordLower = params.keyword.toLowerCase();
                    jobs = (Array.isArray(data.jobs) ? data.jobs : [])
                        .filter(function (j) {
                        // Basic keyword filtering if a keyword exists
                        if (!keywordLower)
                            return true;
                        var job = j;
                        var t = (typeof job.jobTitle === "string" ? job.jobTitle : "").toLowerCase();
                        var d = (typeof job.jobDescription === "string" ? job.jobDescription : "").toLowerCase();
                        return t.includes(keywordLower) || d.includes(keywordLower);
                    })
                        .slice(0, 20)
                        .map(function (j) {
                        var job = j;
                        var title = typeof job.jobTitle === "string" ? job.jobTitle : "";
                        var company = typeof job.companyName === "string" ? job.companyName : "";
                        if (!title || !company)
                            return null;
                        var min = parseInt(String(job.salaryMin), 10);
                        var max = parseInt(String(job.salaryMax), 10);
                        // Convert USD to INR roughly for display if they are USD
                        if (job.salaryCurrency === "USD") {
                            min = min * 83;
                            max = max * 83;
                        }
                        return (0, normalizer_1.normalizeJob)({
                            title: title,
                            company: company,
                            location: typeof job.jobGeo === "string" ? job.jobGeo : "Remote",
                            source: "jobicy", // Needs to be added to types
                            platform: "jobicy",
                            applyChannel: "site",
                            applyUrl: typeof job.url === "string" ? job.url : "",
                            salaryMin: isNaN(min) || min === 0 ? undefined : min,
                            salaryMax: isNaN(max) || max === 0 ? undefined : max,
                            workMode: "remote",
                            jobType: "experienced",
                            description: (typeof job.jobDescription === "string" ? job.jobDescription : "").replace(/<[^>]+>/g, " ").slice(0, 300),
                            postedAt: typeof job.pubDate === "string" ? job.pubDate : new Date().toISOString(),
                        });
                    })
                        .filter(function (j) { return j !== null; });
                    console.log("[Jobicy] scraped ".concat(jobs.length, " jobs"));
                    return [2 /*return*/, jobs];
            }
        });
    });
}
