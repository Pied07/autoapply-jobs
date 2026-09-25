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
exports.scrapeInternshala = scrapeInternshala;
var normalizer_1 = require("../normalizer");
// Internshala — scrapes their public jobs search page HTML
var CITY_SLUG = {
    "Bengaluru": "bangalore",
    "Chennai": "chennai",
    "Delhi NCR": "delhi",
    "Hyderabad": "hyderabad",
    "Kolkata": "kolkata",
    "Mumbai": "mumbai",
    "Pune": "pune",
    "Ahmedabad": "ahmedabad",
    "Jaipur": "jaipur",
    "Remote India": "",
};
function scrapeInternshala(params) {
    return __awaiter(this, void 0, void 0, function () {
        var load, fetchWithPuppeteer, kwSlug, citySlug, url, html, $, jobs;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require("cheerio")); })];
                case 1:
                    load = (_b.sent()).load;
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require("./puppeteer")); })];
                case 2:
                    fetchWithPuppeteer = (_b.sent()).fetchWithPuppeteer;
                    kwSlug = params.keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                    citySlug = (_a = CITY_SLUG[params.location]) !== null && _a !== void 0 ? _a : "";
                    url = citySlug
                        ? "https://internshala.com/jobs/keywords-".concat(kwSlug, "/in-").concat(citySlug, "/")
                        : "https://internshala.com/jobs/keywords-".concat(kwSlug, "/");
                    return [4 /*yield*/, fetchWithPuppeteer(url, ".individual_internship, .job-internship-card, [id^='job_']")];
                case 3:
                    html = _b.sent();
                    if (!html)
                        return [2 /*return*/, []];
                    $ = load(html);
                    jobs = [];
                    // Strategy 1: Extract JSON-LD structured data
                    $("script[type='application/ld+json']").each(function (_, el) {
                        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
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
                                var salMin = (_h = (_g = (_f = item.baseSalary) === null || _f === void 0 ? void 0 : _f.value) === null || _g === void 0 ? void 0 : _g.minValue) !== null && _h !== void 0 ? _h : undefined;
                                var salMax = (_l = (_k = (_j = item.baseSalary) === null || _j === void 0 ? void 0 : _j.value) === null || _k === void 0 ? void 0 : _k.maxValue) !== null && _l !== void 0 ? _l : undefined;
                                jobs.push((0, normalizer_1.normalizeJob)({
                                    title: title,
                                    company: company,
                                    location: params.location,
                                    source: "internshala",
                                    platform: "internshala",
                                    applyChannel: "site",
                                    applyUrl: (_m = item.url) !== null && _m !== void 0 ? _m : url,
                                    salaryMin: salMin,
                                    salaryMax: salMax,
                                    workMode: item.jobLocationType === "TELECOMMUTE" || params.location === "Remote India" ? "remote" : "office",
                                    jobType: "fresher",
                                    description: stripHtml((_o = item.description) !== null && _o !== void 0 ? _o : "").slice(0, 300),
                                    postedAt: (_p = item.datePosted) !== null && _p !== void 0 ? _p : new Date().toISOString(),
                                }));
                            }
                        }
                        catch ( /* skip */_q) { /* skip */ }
                    });
                    // Strategy 2: Scrape HTML job cards
                    if (jobs.length === 0) {
                        $(".individual_internship, .job-internship-card, [id^='job_']").each(function (_, el) {
                            var _a;
                            var card = $(el);
                            var title = card.find(".job-title, .profile, h3.job-title").first().text().trim();
                            var company = card.find(".company-name, .company_name").first().text().trim();
                            var loc = card.find(".location-name, span.location").first().text().trim();
                            var salary = card.find(".salary, .stipend").first().text().trim();
                            var applyUrl = (_a = card.find("a.view_detail_button, a[href*='/jobs/details/']").attr("href")) !== null && _a !== void 0 ? _a : "";
                            var desc = card.find(".job-description, ul.other_detail_item li")
                                .map(function (_, li) { return $(li).text().trim(); }).get().join(" | ");
                            if (!title || !company)
                                return;
                            jobs.push((0, normalizer_1.normalizeJob)({
                                title: title,
                                company: company,
                                location: params.location,
                                source: "internshala",
                                platform: "internshala",
                                applyChannel: "site",
                                applyUrl: applyUrl.startsWith("http") ? applyUrl : "https://internshala.com".concat(applyUrl),
                                workMode: loc.toLowerCase().includes("remote") || params.location === "Remote India" ? "remote" : "office",
                                jobType: "fresher",
                                description: [salary, desc].filter(Boolean).join(" | ").slice(0, 300),
                                postedAt: new Date().toISOString(),
                            }));
                        });
                    }
                    console.log("[Internshala] scraped ".concat(jobs.length, " jobs from ").concat(url));
                    return [2 /*return*/, jobs];
            }
        });
    });
}
function stripHtml(s) {
    return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
