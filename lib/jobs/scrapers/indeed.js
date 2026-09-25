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
exports.scrapeIndeed = scrapeIndeed;
var normalizer_1 = require("../normalizer");
var email_extractor_1 = require("../email-extractor");
function decodeXml(value) {
    return value
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function pickTag(item, tag) {
    var _a, _b;
    return decodeXml((_b = (_a = item.match(new RegExp("<".concat(tag, "[^>]*>([\\s\\S]*?)<\\/").concat(tag, ">"), "i"))) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : "");
}
function locationForIndeed(location) {
    if (location === "Remote India")
        return "remote";
    if (location === "Delhi NCR")
        return "Delhi";
    return location;
}
function scrapeIndeed(params) {
    return __awaiter(this, void 0, void 0, function () {
        var keyword, url, res, xml, jobs, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    keyword = [params.keyword || "developer", params.experience ? "".concat(params.experience, " years") : ""]
                        .filter(Boolean)
                        .join(" ");
                    url = new URL("https://in.indeed.com/rss");
                    url.searchParams.set("q", keyword);
                    url.searchParams.set("l", locationForIndeed(params.location));
                    url.searchParams.set("sort", "date");
                    url.searchParams.set("limit", "50");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch(url, {
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
                                Accept: "application/rss+xml,application/xml,text/xml,*/*",
                            },
                            next: { revalidate: 3600 },
                        })];
                case 2:
                    res = _a.sent();
                    if (!res.ok) {
                        console.warn("[Indeed] RSS failed: ".concat(res.status));
                        return [2 /*return*/, []];
                    }
                    return [4 /*yield*/, res.text()];
                case 3:
                    xml = _a.sent();
                    jobs = Array.from(xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi))
                        .map(function (match) {
                        var _a, _b;
                        var item = (_a = match[1]) !== null && _a !== void 0 ? _a : "";
                        var rawTitle = pickTag(item, "title");
                        var _c = rawTitle.split(/\s+-\s+/), titlePart = _c[0], companyPart = _c[1];
                        var title = (titlePart || rawTitle).trim();
                        var company = (companyPart || "Company not listed").trim();
                        var description = pickTag(item, "description");
                        var applyEmail = (0, email_extractor_1.extractCareerEmails)(description)[0];
                        var applyUrl = pickTag(item, "link");
                        if (!title)
                            return null;
                        return (0, normalizer_1.normalizeJob)({
                            title: title,
                            company: company,
                            location: params.location,
                            source: "indeed",
                            platform: "indeed",
                            applyChannel: applyEmail ? "email" : "site",
                            applyEmail: applyEmail,
                            applyUrl: applyUrl,
                            workMode: params.location === "Remote India" || description.toLowerCase().includes("remote") ? "remote" : "office",
                            jobType: ((_b = params.experience) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes("fresher")) ? "fresher" : "experienced",
                            description: description.slice(0, 500),
                            postedAt: pickTag(item, "pubDate") || new Date().toISOString(),
                        });
                    })
                        .filter(function (job) { return job !== null; })
                        .slice(0, 50);
                    console.log("[Indeed RSS] scraped ".concat(jobs.length, " jobs"));
                    return [2 /*return*/, jobs];
                case 4:
                    error_1 = _a.sent();
                    console.error("[Indeed] fetch error:", error_1);
                    return [2 /*return*/, []];
                case 5: return [2 /*return*/];
            }
        });
    });
}
