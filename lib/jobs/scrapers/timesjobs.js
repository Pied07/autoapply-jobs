"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.scrapeTimesJobs = scrapeTimesJobs;
var normalizer_1 = require("../normalizer");
// TimesJobs — scrapes their public search page
function scrapeTimesJobs(params) {
    return __awaiter(this, void 0, void 0, function () {
        var load, fetchWithPuppeteer, loc, url, html, $, jobs;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require("cheerio")); })];
                case 1:
                    load = (_a.sent()).load;
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require("./puppeteer")); })];
                case 2:
                    fetchWithPuppeteer = (_a.sent()).fetchWithPuppeteer;
                    loc = params.location === "Remote India" ? "" : params.location;
                    url = new URL("https://www.timesjobs.com/candidate/job-search.html");
                    url.searchParams.set("searchType", "personalizedSearch");
                    url.searchParams.set("from", "submit");
                    url.searchParams.set("txtKeywords", params.keyword || "developer");
                    url.searchParams.set("txtLocation", loc);
                    if (params.experience)
                        url.searchParams.set("cboWorkExp1", params.experience);
                    return [4 /*yield*/, fetchWithPuppeteer(url.toString(), "li.clearfix")];
                case 3:
                    html = _a.sent();
                    if (!html)
                        return [2 /*return*/, []];
                    $ = load(html);
                    jobs = [];
                    // Strategy 1: JSON-LD
                    $("script[type='application/ld+json']").each(function (_, el) {
                        var _a, _b, _c, _d, _e, _f, _g;
                        try {
                            var data = JSON.parse((_a = $(el).html()) !== null && _a !== void 0 ? _a : "");
                            var items = Array.isArray(data) ? data : [data];
                            for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                                var item = items_1[_i];
                                if (item["@type"] !== "JobPosting")
                                    continue;
                                var title = (_b = item.title) !== null && _b !== void 0 ? _b : "";
                                var company = (_d = (_c = item.hiringOrganization) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : "Company not listed";
                                if (!title)
                                    continue;
                                jobs.push((0, normalizer_1.normalizeJob)({
                                    title: title,
                                    company: company,
                                    location: params.location,
                                    source: "timesjobs",
                                    platform: "timesjobs",
                                    applyChannel: "site",
                                    applyUrl: (_e = item.url) !== null && _e !== void 0 ? _e : "",
                                    workMode: params.location === "Remote India" ? "remote" : "office",
                                    jobType: "experienced",
                                    description: stripHtml((_f = item.description) !== null && _f !== void 0 ? _f : "").slice(0, 300),
                                    postedAt: (_g = item.datePosted) !== null && _g !== void 0 ? _g : new Date().toISOString(),
                                }));
                            }
                        }
                        catch ( /* skip */_h) { /* skip */ }
                    });
                    // Strategy 2: HTML cards
                    if (jobs.length === 0) {
                        $("li.clearfix[data-job-id], .job-bx, article.srp-jobtuple-wrapper").each(function (_, el) {
                            var _a, _b;
                            var card = $(el);
                            var title = card.find("h2 a, .heading-trun, .job-title").first().text().trim();
                            var company = card.find(".joblist-comp-name, .company-name, h3.joblist-comp-name").first().text().trim();
                            var loc = card.find(".srp-skills, span.sim-posted").first().text().trim();
                            var salary = card.find(".salary, .CTC").first().text().trim();
                            var exp = card.find(".experience, span.yoe").first().text().trim();
                            var applyUrl = (_b = (_a = card.find("a[href*='timesjobs.com/view']").attr("href")) !== null && _a !== void 0 ? _a : card.find("h2 a").attr("href")) !== null && _b !== void 0 ? _b : "";
                            var desc = card.find(".list-skills span, .srp-skills").map(function (_, s) { return $(s).text().trim(); }).get().join(", ");
                            if (!title || !company)
                                return;
                            jobs.push((0, normalizer_1.normalizeJob)({
                                title: title,
                                company: company,
                                location: params.location,
                                source: "timesjobs",
                                platform: "timesjobs",
                                applyChannel: "site",
                                applyUrl: applyUrl.startsWith("http") ? applyUrl : "https://www.timesjobs.com".concat(applyUrl),
                                workMode: loc.toLowerCase().includes("remote") || params.location === "Remote India" ? "remote" : "office",
                                jobType: "experienced",
                                description: [exp, salary, desc].filter(Boolean).join(" | ").slice(0, 300),
                                postedAt: new Date().toISOString(),
                            }));
                        });
                    }
                    console.log("[TimesJobs] scraped ".concat(jobs.length, " jobs"));
                    return [2 /*return*/, jobs];
            }
        });
    });
}
function stripHtml(s) {
    return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
