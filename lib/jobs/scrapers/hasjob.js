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
exports.scrapeHasjob = scrapeHasjob;
var normalizer_1 = require("../normalizer");
// Hasjob (HasGeek) public Atom Feed
// https://hasjob.co/feed
function scrapeHasjob(params) {
    return __awaiter(this, void 0, void 0, function () {
        var url, res, e_1, xml, entries, jobs, keywordLower, _i, entries_1, entry, titleRaw, linkMatch, link, updated, content, title, company, parts, parts, t, c, d, isRemote;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    url = "https://hasjob.co/feed";
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch(url, {
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
                                "Accept": "application/atom+xml, application/xml, text/xml, */*",
                            },
                            cache: "no-store",
                        })];
                case 2:
                    res = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _b.sent();
                    console.error("[Hasjob] fetch error:", e_1);
                    return [2 /*return*/, []];
                case 4:
                    if (!res.ok) {
                        console.error("[Hasjob] HTTP", res.status);
                        return [2 /*return*/, []];
                    }
                    return [4 /*yield*/, res.text()];
                case 5:
                    xml = _b.sent();
                    entries = (_a = xml.match(/<entry>([\s\S]*?)<\/entry>/g)) !== null && _a !== void 0 ? _a : [];
                    jobs = [];
                    keywordLower = params.keyword.toLowerCase();
                    for (_i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                        entry = entries_1[_i];
                        titleRaw = extractTag(entry, "title");
                        linkMatch = entry.match(/<link[^>]*href="([^"]+)"/);
                        link = linkMatch ? linkMatch[1] : "";
                        updated = extractTag(entry, "updated");
                        content = stripHtml(stripCdata(extractTag(entry, "content")));
                        title = titleRaw;
                        company = "Company not listed";
                        if (titleRaw.includes(" at ")) {
                            parts = titleRaw.split(" at ");
                            title = parts[0].trim();
                            company = parts.slice(1).join(" at ").trim();
                        }
                        else if (titleRaw.includes(" is hiring ")) {
                            parts = titleRaw.split(" is hiring ");
                            company = parts[0].trim();
                            title = parts.slice(1).join(" is hiring ").trim();
                        }
                        if (!title)
                            continue;
                        t = title.toLowerCase();
                        c = company.toLowerCase();
                        d = content.toLowerCase();
                        if (keywordLower && !t.includes(keywordLower) && !c.includes(keywordLower) && !d.includes(keywordLower)) {
                            continue;
                        }
                        isRemote = t.includes("remote") || d.includes("remote");
                        jobs.push((0, normalizer_1.normalizeJob)({
                            title: title,
                            company: company,
                            location: isRemote ? "Remote" : params.location,
                            source: "hasjob", // Add to JobSource
                            platform: "hasjob",
                            applyChannel: "site",
                            applyUrl: link,
                            workMode: isRemote ? "remote" : "office",
                            jobType: "experienced",
                            description: content.slice(0, 300),
                            postedAt: updated ? new Date(updated).toISOString() : new Date().toISOString(),
                        }));
                    }
                    console.log("[Hasjob] scraped ".concat(jobs.length, " jobs"));
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
