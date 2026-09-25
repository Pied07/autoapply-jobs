"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCareerEmails = extractCareerEmails;
exports.guessCareerEmailForCompany = guessCareerEmailForCompany;
exports.findCareerEmailForJob = findCareerEmailForJob;
exports.enrichJobsWithCareerEmails = enrichJobsWithCareerEmails;
var EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
var PRIORITY_PREFIXES = ["careers@", "career@", "jobs@", "hr@", "recruitment@", "recruiting@", "talent@", "people@"];
var CAREER_LINK_PATTERN = /\b(careers?|jobs?|join-us|work-with-us|contact|about)\b/i;
var BLOCKED_DOMAINS = [
    "linkedin.com",
    "glassdoor.com",
    "google.com",
];
var PORTAL_OR_UTILITY_DOMAINS = __spreadArray(__spreadArray([], BLOCKED_DOMAINS, true), [
    "indeed.com",
    "naukri.com",
    "foundit.in",
    "monster.com",
    "timesjobs.com",
    "internshala.com",
    "hasjob.co",
    "remoteok.com",
    "remotive.com",
    "weworkremotely.com",
    "arbeitnow.com",
    "jobicy.com",
    "facebook.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "youtube.com",
    "schema.org",
    "w3.org",
    "googleapis.com",
    "gstatic.com",
], false);
function isLikelyRealEmail(email) {
    var lower = email.toLowerCase().replace(/[),.;:]+$/, "");
    return (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(lower) &&
        !lower.endsWith(".png") &&
        !lower.endsWith(".jpg") &&
        !lower.endsWith(".jpeg") &&
        !lower.endsWith(".gif") &&
        !lower.endsWith(".webp") &&
        !lower.includes("example.") &&
        !lower.includes("domain.") &&
        !lower.includes("sentry") &&
        !lower.includes("wixpress") &&
        !lower.includes("schema.org") &&
        !lower.includes("email.com"));
}
function rankEmail(email) {
    var lower = email.toLowerCase();
    var priority = PRIORITY_PREFIXES.findIndex(function (prefix) { return lower.startsWith(prefix); });
    if (priority >= 0)
        return priority;
    if (lower.includes("career") || lower.includes("recruit") || lower.includes("talent"))
        return 20;
    if (lower.startsWith("info@") || lower.startsWith("contact@"))
        return 50;
    return 100;
}
function extractCareerEmails(text) {
    var _a;
    var found = (_a = text.match(EMAIL_PATTERN)) !== null && _a !== void 0 ? _a : [];
    return Array.from(new Set(found.map(function (email) { return email.toLowerCase().replace(/[),.;:]+$/, ""); }).filter(isLikelyRealEmail))).sort(function (a, b) { return rankEmail(a) - rankEmail(b); });
}
function shouldFetchUrl(rawUrl) {
    if (!rawUrl)
        return false;
    try {
        var url = new URL(rawUrl);
        return url.protocol === "http:" || url.protocol === "https:";
    }
    catch (_a) {
        return false;
    }
}
function isBlockedHost(rawUrl) {
    try {
        var host_1 = new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
        return BLOCKED_DOMAINS.some(function (domain) { return host_1 === domain || host_1.endsWith(".".concat(domain)); });
    }
    catch (_a) {
        return true;
    }
}
function sameHostOrSubdomain(baseUrl, href) {
    try {
        var baseHost = new URL(baseUrl).hostname.replace(/^www\./, "").toLowerCase();
        var linkHost = new URL(href, baseUrl).hostname.replace(/^www\./, "").toLowerCase();
        return linkHost === baseHost || linkHost.endsWith(".".concat(baseHost));
    }
    catch (_a) {
        return false;
    }
}
function extractCandidateLinks(html, baseUrl) {
    var links = Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi))
        .map(function (match) {
        var _a, _b, _c, _d;
        var href = (_b = (_a = match[1]) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : "";
        var text = (_d = (_c = match[2]) === null || _c === void 0 ? void 0 : _c.replace(/<[^>]+>/g, " ").trim()) !== null && _d !== void 0 ? _d : "";
        if (href.startsWith("mailto:"))
            return href;
        if (!CAREER_LINK_PATTERN.test("".concat(href, " ").concat(text)))
            return "";
        try {
            var absolute = new URL(href, baseUrl).toString();
            return sameHostOrSubdomain(baseUrl, absolute) ? absolute : "";
        }
        catch (_e) {
            return "";
        }
    })
        .filter(Boolean);
    return Array.from(new Set(links)).slice(0, 3);
}
function fetchText(url_1) {
    return __awaiter(this, arguments, void 0, function (url, timeoutMs) {
        var controller, timeout, res, _a;
        if (timeoutMs === void 0) { timeoutMs = 4500; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    controller = new AbortController();
                    timeout = setTimeout(function () { return controller.abort(); }, timeoutMs);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch(url, {
                            signal: controller.signal,
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
                                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                            },
                        })];
                case 2:
                    res = _b.sent();
                    if (!res.ok)
                        return [2 /*return*/, ""];
                    return [4 /*yield*/, res.text()];
                case 3: return [2 /*return*/, _b.sent()];
                case 4:
                    _a = _b.sent();
                    return [2 /*return*/, ""];
                case 5:
                    clearTimeout(timeout);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function isUsefulCompanyDomain(domain) {
    var lower = domain.replace(/^www\./, "").toLowerCase();
    return (lower.includes(".") &&
        !PORTAL_OR_UTILITY_DOMAINS.some(function (blocked) { return lower === blocked || lower.endsWith(".".concat(blocked)); }) &&
        !lower.includes("cloudfront.net") &&
        !lower.includes("amazonaws.com") &&
        !lower.includes("doubleclick.net"));
}
function companySlug(company) {
    return company
        .toLowerCase()
        .replace(/\b(private|pvt|limited|ltd|inc|llc|llp|technologies|technology|solutions|services|software|systems|india|global|corp|corporation|company|co)\b/g, " ")
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .join("");
}
function getDomainFromUrl(rawUrl) {
    try {
        var domain = new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
        return isUsefulCompanyDomain(domain) ? domain : undefined;
    }
    catch (_a) {
        return undefined;
    }
}
function extractCompanyDomains(html, baseUrl) {
    var hrefDomains = Array.from(html.matchAll(/href=["']([^"']+)["']/gi))
        .map(function (match) {
        var _a;
        try {
            return getDomainFromUrl(new URL((_a = match[1]) !== null && _a !== void 0 ? _a : "", baseUrl).toString());
        }
        catch (_b) {
            return undefined;
        }
    })
        .filter(function (domain) { return Boolean(domain); });
    var textDomains = Array.from(html.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})(?:[/:?#"')\s]|$)/gi))
        .map(function (match) {
        var _a;
        var domain = (_a = match[1]) === null || _a === void 0 ? void 0 : _a.replace(/^www\./, "").toLowerCase();
        return domain && isUsefulCompanyDomain(domain) ? domain : undefined;
    })
        .filter(function (domain) { return Boolean(domain); });
    return Array.from(new Set(__spreadArray(__spreadArray([], hrefDomains, true), textDomains, true)));
}
function guessedCareerEmailForDomain(domain) {
    return "careers@".concat(domain);
}
function guessCareerEmailForCompany(company) {
    var slug = companySlug(company);
    if (!slug || slug.length < 3 || slug === "companynotlisted")
        return undefined;
    return "careers@".concat(slug, ".com");
}
function findCareerEmailForJob(job) {
    return __awaiter(this, void 0, void 0, function () {
        var descriptionEmails, pageHtml, pageEmails, companyDomain, mailto, _i, _a, link, linkedHtml, linkedEmails, linkedDomain;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (job.applyEmail)
                        return [2 /*return*/, { email: job.applyEmail, isGuessed: !!job.isGuessedEmail }];
                    descriptionEmails = extractCareerEmails((_b = job.description) !== null && _b !== void 0 ? _b : "");
                    if (descriptionEmails[0])
                        return [2 /*return*/, { email: descriptionEmails[0], isGuessed: false }];
                    if (!shouldFetchUrl(job.applyUrl) || isBlockedHost(job.applyUrl))
                        return [2 /*return*/, undefined];
                    return [4 /*yield*/, fetchText(job.applyUrl)];
                case 1:
                    pageHtml = _d.sent();
                    pageEmails = extractCareerEmails(pageHtml);
                    if (pageEmails[0])
                        return [2 /*return*/, { email: pageEmails[0], isGuessed: false }];
                    companyDomain = extractCompanyDomains(pageHtml, job.applyUrl)[0];
                    if (companyDomain)
                        return [2 /*return*/, { email: guessedCareerEmailForDomain(companyDomain), isGuessed: true }];
                    mailto = (_c = extractCandidateLinks(pageHtml, job.applyUrl)
                        .find(function (href) { return href.startsWith("mailto:"); })) === null || _c === void 0 ? void 0 : _c.replace(/^mailto:/i, "").split("?")[0];
                    if (mailto && isLikelyRealEmail(mailto))
                        return [2 /*return*/, { email: mailto.toLowerCase(), isGuessed: false }];
                    _i = 0, _a = extractCandidateLinks(pageHtml, job.applyUrl).filter(function (href) { return !href.startsWith("mailto:"); });
                    _d.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    link = _a[_i];
                    if (isBlockedHost(link))
                        return [3 /*break*/, 4];
                    return [4 /*yield*/, fetchText(link, 3500)];
                case 3:
                    linkedHtml = _d.sent();
                    linkedEmails = extractCareerEmails(linkedHtml);
                    if (linkedEmails[0])
                        return [2 /*return*/, { email: linkedEmails[0], isGuessed: false }];
                    linkedDomain = extractCompanyDomains(linkedHtml, link)[0];
                    if (linkedDomain)
                        return [2 /*return*/, { email: guessedCareerEmailForDomain(linkedDomain), isGuessed: true }];
                    _d.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/, undefined];
            }
        });
    });
}
function enrichJobsWithCareerEmails(jobs_1) {
    return __awaiter(this, arguments, void 0, function (jobs, maxJobs) {
        function worker() {
            return __awaiter(this, void 0, void 0, function () {
                var current, job, found, guessed, shouldOverrideChannel;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(index < Math.min(enriched.length, maxJobs))) return [3 /*break*/, 2];
                            current = index++;
                            job = enriched[current];
                            return [4 /*yield*/, findCareerEmailForJob(job)];
                        case 1:
                            found = _a.sent();
                            if (!found) {
                                guessed = guessCareerEmailForCompany(job.company);
                                if (guessed)
                                    found = { email: guessed, isGuessed: true };
                            }
                            if (found) {
                                shouldOverrideChannel = job.applyChannel === "email" || !job.applyUrl;
                                enriched[current] = __assign(__assign({}, job), { applyChannel: shouldOverrideChannel ? "email" : job.applyChannel, applyEmail: found.email, isGuessedEmail: found.isGuessed, description: job.description.includes(found.email) ? job.description : "".concat(job.description, " ").concat(found.isGuessed ? 'Guessed' : 'Suggested', " email: ").concat(found.email).trim() });
                            }
                            return [3 /*break*/, 0];
                        case 2: return [2 /*return*/];
                    }
                });
            });
        }
        var enriched, index, workerCount;
        if (maxJobs === void 0) { maxJobs = 60; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    enriched = __spreadArray([], jobs, true);
                    index = 0;
                    workerCount = Math.min(5, enriched.length);
                    return [4 /*yield*/, Promise.all(Array.from({ length: workerCount }, worker))];
                case 1:
                    _a.sent();
                    return [2 /*return*/, enriched];
            }
        });
    });
}
