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
exports.scrapeWeWorkRemotely = scrapeWeWorkRemotely;
var normalizer_1 = require("../normalizer");
// We Work Remotely — public RSS feed, no key required
// https://weworkremotely.com/remote-jobs.rss
function scrapeWeWorkRemotely(params) {
    return __awaiter(this, void 0, void 0, function () {
        var url, res, e_1, xml, items, kw, jobs, _loop_1, _i, items_1, item, state_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    url = "https://weworkremotely.com/remote-jobs.rss";
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch(url, {
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
                                "Accept": "application/rss+xml, application/xml, text/xml, */*",
                            },
                            cache: "no-store",
                        })];
                case 2:
                    res = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _b.sent();
                    console.error("[WWR] fetch error:", e_1);
                    return [2 /*return*/, []];
                case 4:
                    if (!res.ok) {
                        console.error("[WWR] HTTP", res.status);
                        return [2 /*return*/, []];
                    }
                    return [4 /*yield*/, res.text()];
                case 5:
                    xml = _b.sent();
                    items = (_a = xml.match(/<item>([\s\S]*?)<\/item>/g)) !== null && _a !== void 0 ? _a : [];
                    kw = params.keyword.toLowerCase();
                    jobs = [];
                    _loop_1 = function (item) {
                        var title = stripCdata(extractTag(item, "title"));
                        var company = stripCdata(extractTag(item, "region")) || extractCompanyFromTitle(title);
                        var link = extractTag(item, "link");
                        var pubDate = extractTag(item, "pubDate");
                        var desc = stripHtml(stripCdata(extractTag(item, "description")));
                        var region = stripCdata(extractTag(item, "region"));
                        if (!title)
                            return "continue";
                        // Filter by keyword relevance
                        var combined = (title + " " + desc).toLowerCase();
                        if (kw && !kw.split(/[\s,]+/).some(function (k) { return k.length > 2 && combined.includes(k); }))
                            return "continue";
                        jobs.push((0, normalizer_1.normalizeJob)({
                            title: title,
                            company: company || "Company not listed",
                            location: "Remote India",
                            source: "weworkremotely",
                            platform: "weworkremotely",
                            applyChannel: "site",
                            applyUrl: link,
                            workMode: "remote",
                            jobType: "experienced",
                            description: (region ? "Region: ".concat(region, ". ") : "") + desc.slice(0, 250),
                            postedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                        }));
                        if (jobs.length >= 15)
                            return "break";
                    };
                    for (_i = 0, items_1 = items; _i < items_1.length; _i++) {
                        item = items_1[_i];
                        state_1 = _loop_1(item);
                        if (state_1 === "break")
                            break;
                    }
                    console.log("[WWR] scraped ".concat(jobs.length, " jobs for \"").concat(kw, "\""));
                    return [2 /*return*/, jobs];
            }
        });
    });
}
function extractTag(xml, tag) {
    var _a, _b;
    var match = xml.match(new RegExp("<".concat(tag, "[^>]*>([\\s\\S]*?)<\\/").concat(tag, ">"), "i"));
    return (_b = (_a = match === null || match === void 0 ? void 0 : match[1]) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : "";
}
function stripCdata(s) {
    return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}
function stripHtml(s) {
    return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function extractCompanyFromTitle(title) {
    // WWR titles often have "Company: Role" or "Role at Company"
    var atMatch = title.match(/ at (.+)$/i);
    if (atMatch)
        return atMatch[1].trim();
    var colonMatch = title.match(/^([^:]+):/);
    if (colonMatch)
        return colonMatch[1].trim();
    return "";
}
