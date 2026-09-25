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
exports.scrapeFoundit = scrapeFoundit;
var normalizer_1 = require("../normalizer");
// Foundit (formerly Monster India) — scrapes their public search page
var FOUNDIT_LOCATIONS = {
    "Bengaluru": "Bengaluru",
    "Chennai": "Chennai",
    "Delhi NCR": "Delhi NCR",
    "Hyderabad": "Hyderabad",
    "Kolkata": "Kolkata",
    "Mumbai": "Mumbai",
    "Pune": "Pune",
    "Ahmedabad": "Ahmedabad",
    "Jaipur": "Jaipur",
    "Remote India": "",
};
function scrapeFoundit(params) {
    return __awaiter(this, void 0, void 0, function () {
        var load, fetchWithPuppeteer, loc, kwSlug, locSlug, seoKey, url, html, $, jobs, nextData, parsed, jobList, _i, jobList_1, job, title, company;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
        return __generator(this, function (_z) {
            switch (_z.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require("cheerio")); })];
                case 1:
                    load = (_z.sent()).load;
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require("./puppeteer")); })];
                case 2:
                    fetchWithPuppeteer = (_z.sent()).fetchWithPuppeteer;
                    loc = (_a = FOUNDIT_LOCATIONS[params.location]) !== null && _a !== void 0 ? _a : "";
                    kwSlug = params.keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                    locSlug = loc.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                    seoKey = locSlug ? "".concat(kwSlug, "-jobs-in-").concat(locSlug) : "".concat(kwSlug, "-jobs");
                    url = new URL("https://www.foundit.in/srp/results");
                    url.searchParams.set("query", params.keyword || "developer");
                    if (loc)
                        url.searchParams.set("locationPreference", loc);
                    url.searchParams.set("seoKey", seoKey);
                    if (params.experience)
                        url.searchParams.set("experienceRanges", params.experience);
                    return [4 /*yield*/, fetchWithPuppeteer(url.toString(), ".jobCard, .card-apply-content, [class*='JobCard']")];
                case 3:
                    html = _z.sent();
                    if (!html)
                        return [2 /*return*/, []];
                    $ = load(html);
                    jobs = [];
                    // Strategy 1: JSON-LD
                    $("script[type='application/ld+json']").each(function (_, el) {
                        var _a, _b, _c, _d, _e, _f, _g, _h;
                        try {
                            var data = JSON.parse((_a = $(el).html()) !== null && _a !== void 0 ? _a : "");
                            var items = Array.isArray(data) ? data : (_b = data["@graph"]) !== null && _b !== void 0 ? _b : [data];
                            for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                                var item = items_1[_i];
                                if (item["@type"] !== "JobPosting")
                                    continue;
                                var title = (_c = item.title) !== null && _c !== void 0 ? _c : "";
                                var company = (_e = (_d = item.hiringOrganization) === null || _d === void 0 ? void 0 : _d.name) !== null && _e !== void 0 ? _e : "Company not listed";
                                if (!title)
                                    continue;
                                jobs.push((0, normalizer_1.normalizeJob)({
                                    title: title,
                                    company: company,
                                    location: params.location,
                                    source: "foundit",
                                    platform: "foundit",
                                    applyChannel: "site",
                                    applyUrl: (_f = item.url) !== null && _f !== void 0 ? _f : "",
                                    workMode: params.location === "Remote India" ? "remote" : "office",
                                    jobType: "experienced",
                                    description: stripHtml((_g = item.description) !== null && _g !== void 0 ? _g : "").slice(0, 300),
                                    postedAt: (_h = item.datePosted) !== null && _h !== void 0 ? _h : new Date().toISOString(),
                                }));
                            }
                        }
                        catch ( /* skip */_j) { /* skip */ }
                    });
                    // Strategy 2: Embedded JSON in Next.js __NEXT_DATA__
                    if (jobs.length === 0) {
                        nextData = (_b = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/)) === null || _b === void 0 ? void 0 : _b[1];
                        if (nextData) {
                            try {
                                parsed = JSON.parse(nextData);
                                jobList = (_p = (_k = (_f = (_e = (_d = (_c = parsed === null || parsed === void 0 ? void 0 : parsed.props) === null || _c === void 0 ? void 0 : _c.pageProps) === null || _d === void 0 ? void 0 : _d.jobSearchResults) === null || _e === void 0 ? void 0 : _e.jobListings) !== null && _f !== void 0 ? _f : (_j = (_h = (_g = parsed === null || parsed === void 0 ? void 0 : parsed.props) === null || _g === void 0 ? void 0 : _g.pageProps) === null || _h === void 0 ? void 0 : _h.searchResults) === null || _j === void 0 ? void 0 : _j.jobs) !== null && _k !== void 0 ? _k : (_o = (_m = (_l = parsed === null || parsed === void 0 ? void 0 : parsed.props) === null || _l === void 0 ? void 0 : _l.pageProps) === null || _m === void 0 ? void 0 : _m.data) === null || _o === void 0 ? void 0 : _o.jobs) !== null && _p !== void 0 ? _p : [];
                                for (_i = 0, jobList_1 = jobList; _i < jobList_1.length; _i++) {
                                    job = jobList_1[_i];
                                    title = (_r = (_q = job.title) !== null && _q !== void 0 ? _q : job.jobTitle) !== null && _r !== void 0 ? _r : "";
                                    company = (_u = (_t = (_s = job.company) === null || _s === void 0 ? void 0 : _s.name) !== null && _t !== void 0 ? _t : job.companyName) !== null && _u !== void 0 ? _u : "";
                                    if (!title || !company)
                                        continue;
                                    jobs.push((0, normalizer_1.normalizeJob)({
                                        title: title,
                                        company: company,
                                        location: params.location,
                                        source: "foundit",
                                        platform: "foundit",
                                        applyChannel: "site",
                                        applyUrl: ((_v = job.applyUrl) !== null && _v !== void 0 ? _v : job.detailUrl) ? "https://www.foundit.in".concat(job.detailUrl) : "https://www.foundit.in",
                                        workMode: params.location === "Remote India" ? "remote" : "office",
                                        jobType: "experienced",
                                        description: stripHtml((_x = (_w = job.snippet) !== null && _w !== void 0 ? _w : job.description) !== null && _x !== void 0 ? _x : "").slice(0, 300),
                                        postedAt: (_y = job.postedDate) !== null && _y !== void 0 ? _y : new Date().toISOString(),
                                    }));
                                }
                            }
                            catch ( /* skip */_0) { /* skip */ }
                        }
                    }
                    // Strategy 3: HTML cards
                    if (jobs.length === 0) {
                        $(".jobCard, .card-apply-content, [class*='JobCard']").each(function (_, el) {
                            var _a;
                            var card = $(el);
                            var title = card.find("[class*='jobTitle'], h3, .job-title").first().text().trim();
                            var company = card.find("[class*='companyName'], .company").first().text().trim();
                            var applyUrl = (_a = card.find("a").first().attr("href")) !== null && _a !== void 0 ? _a : "";
                            var desc = card.find("[class*='description'], .skills").first().text().trim();
                            if (!title || !company)
                                return;
                            jobs.push((0, normalizer_1.normalizeJob)({
                                title: title,
                                company: company,
                                location: params.location,
                                source: "foundit",
                                platform: "foundit",
                                applyChannel: "site",
                                applyUrl: applyUrl.startsWith("http") ? applyUrl : "https://www.foundit.in".concat(applyUrl),
                                workMode: params.location === "Remote India" ? "remote" : "office",
                                jobType: "experienced",
                                description: desc.slice(0, 300),
                                postedAt: new Date().toISOString(),
                            }));
                        });
                    }
                    console.log("[Foundit] scraped ".concat(jobs.length, " jobs"));
                    return [2 /*return*/, jobs];
            }
        });
    });
}
function stripHtml(s) {
    return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
