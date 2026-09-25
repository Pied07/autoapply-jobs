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
exports.scrapeRemotive = scrapeRemotive;
var normalizer_1 = require("../normalizer");
// Remotive free JSON API — no key required
// https://remotive.com/api/remote-jobs?search=react&limit=20
function scrapeRemotive(params) {
    return __awaiter(this, void 0, void 0, function () {
        var url, res, e_1, data, _a, jobList, jobs;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    url = new URL("https://remotive.com/api/remote-jobs");
                    url.searchParams.set("search", params.keyword || "developer");
                    url.searchParams.set("limit", "20");
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch(url.toString(), {
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
                                "Accept": "application/json",
                            },
                            cache: "no-store",
                        })];
                case 2:
                    res = _c.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _c.sent();
                    console.error("[Remotive] fetch error:", e_1);
                    return [2 /*return*/, []];
                case 4:
                    if (!res.ok) {
                        console.error("[Remotive] HTTP", res.status);
                        return [2 /*return*/, []];
                    }
                    _c.label = 5;
                case 5:
                    _c.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, res.json()];
                case 6:
                    data = _c.sent();
                    return [3 /*break*/, 8];
                case 7:
                    _a = _c.sent();
                    return [2 /*return*/, []];
                case 8:
                    jobList = (_b = data === null || data === void 0 ? void 0 : data.jobs) !== null && _b !== void 0 ? _b : [];
                    jobs = jobList
                        .map(function (job) {
                        var _a, _b, _c, _d, _e;
                        var title = (_a = job.title) !== null && _a !== void 0 ? _a : "";
                        var company = (_b = job.company_name) !== null && _b !== void 0 ? _b : "";
                        if (!title || !company)
                            return null;
                        return (0, normalizer_1.normalizeJob)({
                            title: title,
                            company: company,
                            location: "Remote India",
                            source: "remotive",
                            platform: "remotive",
                            applyChannel: "site",
                            applyUrl: (_c = job.url) !== null && _c !== void 0 ? _c : "",
                            workMode: "remote",
                            jobType: "experienced",
                            description: stripHtml((_d = job.description) !== null && _d !== void 0 ? _d : "").slice(0, 300),
                            postedAt: (_e = job.publication_date) !== null && _e !== void 0 ? _e : new Date().toISOString(),
                        });
                    })
                        .filter(function (j) { return j !== null; });
                    console.log("[Remotive] scraped ".concat(jobs.length, " jobs for \"").concat(params.keyword, "\""));
                    return [2 /*return*/, jobs];
            }
        });
    });
}
function stripHtml(s) {
    return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
