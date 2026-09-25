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
exports.scrapeLinkedIn = scrapeLinkedIn;
var normalizer_1 = require("../normalizer");
// Scrapes LinkedIn's public job search page HTML (no login, no API key)
// URL: https://www.linkedin.com/jobs/search/?keywords=...&location=...
var LOCATION_FULL = {
    "Bengaluru": "Bengaluru, Karnataka, India",
    "Chennai": "Chennai, Tamil Nadu, India",
    "Delhi NCR": "Delhi, India",
    "Hyderabad": "Hyderabad, Telangana, India",
    "Kolkata": "Kolkata, West Bengal, India",
    "Mumbai": "Mumbai, Maharashtra, India",
    "Pune": "Pune, Maharashtra, India",
    "Ahmedabad": "Ahmedabad, Gujarat, India",
    "Jaipur": "Jaipur, Rajasthan, India",
    "Remote India": "India",
};
var BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Cache-Control": "max-age=0",
};
function scrapeLinkedIn(params) {
    return __awaiter(this, void 0, void 0, function () {
        var load, fullLocation, keyword, url, res, e_1, html, $, jobs;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require("cheerio")); })];
                case 1:
                    load = (_c.sent()).load;
                    fullLocation = (_a = LOCATION_FULL[params.location]) !== null && _a !== void 0 ? _a : "India";
                    keyword = [params.keyword, params.experience ? "".concat(params.experience, " years experience") : ""]
                        .filter(Boolean).join(" ");
                    url = new URL("https://www.linkedin.com/jobs/search/");
                    url.searchParams.set("keywords", keyword);
                    url.searchParams.set("location", fullLocation);
                    url.searchParams.set("trk", "public_jobs_jobs-search-bar_search-submit");
                    url.searchParams.set("position", "1");
                    url.searchParams.set("pageNum", String(Math.floor(((_b = params.start) !== null && _b !== void 0 ? _b : 0) / 25)));
                    if (params.location === "Remote India")
                        url.searchParams.set("f_WT", "2");
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, fetch(url.toString(), { headers: BROWSER_HEADERS, cache: "no-store" })];
                case 3:
                    res = _c.sent();
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _c.sent();
                    console.error("[LinkedIn] fetch error:", e_1);
                    return [2 /*return*/, []];
                case 5:
                    if (!res.ok) {
                        console.error("[LinkedIn] HTTP", res.status);
                        return [2 /*return*/, []];
                    }
                    return [4 /*yield*/, res.text()];
                case 6:
                    html = _c.sent();
                    $ = load(html);
                    jobs = [];
                    // LinkedIn server-renders job cards in <ul class="jobs-search__results-list">
                    $("ul.jobs-search__results-list li, .base-card").each(function (_, el) {
                        var _a, _b;
                        var card = $(el);
                        var title = card.find(".base-search-card__title, h3.base-search-card__title").text().trim();
                        var company = card.find(".base-search-card__subtitle, h4.base-search-card__subtitle").text().trim();
                        var locationTxt = card.find(".job-search-card__location").text().trim();
                        var applyUrl = (_a = card.find("a.base-card__full-link, a.base-search-card__full-link").attr("href")) !== null && _a !== void 0 ? _a : "";
                        var postedAt = (_b = card.find("time").attr("datetime")) !== null && _b !== void 0 ? _b : new Date().toISOString();
                        if (!title || !company)
                            return;
                        jobs.push((0, normalizer_1.normalizeJob)({
                            title: title,
                            company: company,
                            location: params.location,
                            source: "linkedin",
                            platform: "linkedin",
                            applyChannel: "platform",
                            applyUrl: applyUrl.split("?")[0],
                            workMode: locationTxt.toLowerCase().includes("remote") || params.location === "Remote India" ? "remote" : "office",
                            jobType: "experienced",
                            description: locationTxt,
                            postedAt: postedAt,
                        }));
                    });
                    // Fallback: LinkedIn sometimes embeds JSON-LD with job data
                    if (jobs.length === 0) {
                        $("script[type='application/ld+json']").each(function (_, el) {
                            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
                            try {
                                var data = JSON.parse((_a = $(el).html()) !== null && _a !== void 0 ? _a : "");
                                var items = Array.isArray(data) ? data : (_b = data["@graph"]) !== null && _b !== void 0 ? _b : (data["@type"] ? [data] : []);
                                for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                                    var item = items_1[_i];
                                    if (item["@type"] !== "JobPosting")
                                        continue;
                                    var title = (_c = item.title) !== null && _c !== void 0 ? _c : "";
                                    var company = (_e = (_d = item.hiringOrganization) === null || _d === void 0 ? void 0 : _d.name) !== null && _e !== void 0 ? _e : "";
                                    var loc = (_h = (_g = (_f = item.jobLocation) === null || _f === void 0 ? void 0 : _f.address) === null || _g === void 0 ? void 0 : _g.addressLocality) !== null && _h !== void 0 ? _h : params.location;
                                    var applyUrl = (_k = (_j = item.url) !== null && _j !== void 0 ? _j : item.sameAs) !== null && _k !== void 0 ? _k : "";
                                    if (!title)
                                        continue;
                                    jobs.push((0, normalizer_1.normalizeJob)({
                                        title: title,
                                        company: company,
                                        location: params.location,
                                        source: "linkedin",
                                        platform: "linkedin",
                                        applyChannel: "platform",
                                        applyUrl: applyUrl,
                                        workMode: item.jobLocationType === "TELECOMMUTE" ? "remote" : "office",
                                        jobType: "experienced",
                                        description: (_m = (_l = item.description) === null || _l === void 0 ? void 0 : _l.slice(0, 300)) !== null && _m !== void 0 ? _m : loc,
                                        postedAt: (_o = item.datePosted) !== null && _o !== void 0 ? _o : new Date().toISOString(),
                                    }));
                                }
                            }
                            catch ( /* skip invalid JSON-LD */_p) { /* skip invalid JSON-LD */ }
                        });
                    }
                    console.log("[LinkedIn] scraped ".concat(jobs.length, " jobs for \"").concat(keyword, "\" in ").concat(fullLocation));
                    return [2 /*return*/, jobs];
            }
        });
    });
}
