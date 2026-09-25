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
exports.scrapeRemoteOK = scrapeRemoteOK;
var normalizer_1 = require("../normalizer");
// RemoteOK public JSON API — no key required
// https://remoteok.com/api — returns array of job objects
function scrapeRemoteOK(params) {
    return __awaiter(this, void 0, void 0, function () {
        var tags, jobs;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    tags = params.keyword
                        .split(/[\s,]+/)
                        .map(function (k) { return k.trim().toLowerCase(); })
                        .filter(Boolean)
                        .slice(0, 3)
                        .join(",");
                    return [4 /*yield*/, fetchRemoteOK(tags)];
                case 1:
                    jobs = _a.sent();
                    if (!(jobs.length === 0 && tags)) return [3 /*break*/, 3];
                    console.log("[RemoteOK] no jobs found for tags=\"".concat(tags, "\", falling back to all jobs"));
                    return [4 /*yield*/, fetchRemoteOK("")];
                case 2:
                    jobs = _a.sent();
                    _a.label = 3;
                case 3:
                    console.log("[RemoteOK] scraped ".concat(jobs.length, " jobs"));
                    return [2 /*return*/, jobs];
            }
        });
    });
}
function fetchRemoteOK(tags) {
    return __awaiter(this, void 0, void 0, function () {
        var url, res, e_1, data, _a, jobsList;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    url = tags
                        ? "https://remoteok.com/api?tags=".concat(encodeURIComponent(tags))
                        : "https://remoteok.com/api";
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch(url, {
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
                                "Accept": "application/json",
                                "Referer": "https://remoteok.com/",
                            },
                            cache: "no-store",
                        })];
                case 2:
                    res = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _b.sent();
                    console.error("[RemoteOK] fetch error:", e_1);
                    return [2 /*return*/, []];
                case 4:
                    if (!res.ok) {
                        console.error("[RemoteOK] HTTP", res.status);
                        return [2 /*return*/, []];
                    }
                    _b.label = 5;
                case 5:
                    _b.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, res.json()];
                case 6:
                    data = _b.sent();
                    return [3 /*break*/, 8];
                case 7:
                    _a = _b.sent();
                    return [2 /*return*/, []];
                case 8:
                    jobsList = (Array.isArray(data) ? data : [])
                        .filter(function (j) { return j.position || j.company; })
                        .slice(0, 20)
                        .map(function (job) {
                        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                        var title = (_a = job.position) !== null && _a !== void 0 ? _a : "";
                        var company = (_b = job.company) !== null && _b !== void 0 ? _b : "";
                        if (!title || !company)
                            return null;
                        return (0, normalizer_1.normalizeJob)({
                            title: title,
                            company: company,
                            location: "Remote",
                            source: "remoteok",
                            platform: "remoteok",
                            applyChannel: "site",
                            applyUrl: (_c = job.url) !== null && _c !== void 0 ? _c : "https://remoteok.com/remote-jobs/".concat(job.id),
                            salaryMin: (_d = job.salary_min) !== null && _d !== void 0 ? _d : undefined,
                            salaryMax: (_e = job.salary_max) !== null && _e !== void 0 ? _e : undefined,
                            workMode: "remote",
                            jobType: "experienced",
                            description: ((_h = (_f = job.description) !== null && _f !== void 0 ? _f : (_g = job.tags) === null || _g === void 0 ? void 0 : _g.join(", ")) !== null && _h !== void 0 ? _h : "").slice(0, 300),
                            postedAt: (_j = job.date) !== null && _j !== void 0 ? _j : new Date().toISOString(),
                        });
                    })
                        .filter(function (j) { return j !== null; });
                    console.log("[RemoteOK] scraped ".concat(jobsList.length, " jobs for tags=\"").concat(tags, "\""));
                    return [2 /*return*/, jobsList];
            }
        });
    });
}
