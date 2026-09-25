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
exports.scrapeArbeitnow = scrapeArbeitnow;
var normalizer_1 = require("../normalizer");
// Arbeitnow public API (English Speaking Jobs in Germany / Global Remote)
// https://arbeitnow.com/api/job-board-api
function scrapeArbeitnow(params) {
    return __awaiter(this, void 0, void 0, function () {
        var url, res, e_1, data, _a, keywordLower, jobs;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    url = "https://arbeitnow.com/api/job-board-api";
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
                    console.error("[Arbeitnow] fetch error:", e_1);
                    return [2 /*return*/, []];
                case 4:
                    if (!res.ok) {
                        console.error("[Arbeitnow] HTTP", res.status);
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
                    jobs = (Array.isArray(data.data) ? data.data : [])
                        .filter(function (j) {
                        // Basic keyword filtering if a keyword exists
                        if (!keywordLower)
                            return true;
                        var job = j;
                        var t = (typeof job.title === "string" ? job.title : "").toLowerCase();
                        var d = (typeof job.description === "string" ? job.description : "").toLowerCase();
                        return t.includes(keywordLower) || d.includes(keywordLower);
                    })
                        .slice(0, 20)
                        .map(function (j) {
                        var job = j;
                        var title = typeof job.title === "string" ? job.title : "";
                        var company = typeof job.company_name === "string" ? job.company_name : "";
                        if (!title || !company)
                            return null;
                        var isRemote = job.remote === true || String(job.location).toLowerCase().includes("remote");
                        return (0, normalizer_1.normalizeJob)({
                            title: title,
                            company: company,
                            location: typeof job.location === "string" ? job.location : "Remote",
                            source: "arbeitnow", // Hacky cast for JobSource compatibility if strict
                            platform: "arbeitnow",
                            applyChannel: "site",
                            applyUrl: typeof job.url === "string" ? job.url : "",
                            workMode: isRemote ? "remote" : "office",
                            jobType: "experienced",
                            description: (typeof job.description === "string" ? job.description : "").replace(/<[^>]+>/g, " ").slice(0, 300),
                            postedAt: typeof job.created_at === "number" ? new Date(job.created_at * 1000).toISOString() : new Date().toISOString(),
                        });
                    })
                        .filter(function (j) { return j !== null; });
                    console.log("[Arbeitnow] scraped ".concat(jobs.length, " jobs"));
                    return [2 /*return*/, jobs];
            }
        });
    });
}
