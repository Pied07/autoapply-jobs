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
exports.scrapeGoogleJobs = scrapeGoogleJobs;
var normalizer_1 = require("../normalizer");
var puppeteer_1 = require("./puppeteer");
function scrapeGoogleJobs(params) {
    return __awaiter(this, void 0, void 0, function () {
        var query, url, scrapedJobs, normalizedJobs, _i, scrapedJobs_1, item, parts, title, company, locationAndSource, isRemote, originalSource, applyUrl, jobDesc, job, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    query = encodeURIComponent("".concat(params.keyword, " jobs in ").concat(params.location === "Remote India" ? "India" : params.location));
                    url = "https://www.google.com/search?q=".concat(query, "&ibp=htl;jobs");
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, puppeteer_1.extractFromPage)(url, "() => {\n      // Scroll down repeatedly to load more jobs\n      return new Promise((resolve) => {\n        let lastHeight = 0;\n        let scrolls = 0;\n        \n        // Find the scrollable container (usually role=\"tree\" or a specific div)\n        const scrollContainer = document.querySelector('div[role=\"tree\"]') || window;\n\n        const timer = setInterval(() => {\n          if (scrollContainer === window) {\n            window.scrollBy(0, 1000);\n          } else {\n            scrollContainer.scrollTop += 1000;\n          }\n          scrolls++;\n          \n          if (scrolls >= 10) { // Try 10 scrolls to load up to 100 jobs\n            clearInterval(timer);\n            \n            // Extract the jobs from 'li' elements which represent the job cards\n            const items = Array.from(document.querySelectorAll('li')).map(li => {\n              const textParts = li.innerText.split('\\n').map(t => t.trim()).filter(Boolean);\n              \n              // We also want to find the apply link. Usually it's in a button or anchor.\n              // Google Jobs obscures this, but sometimes we can find an href\n              const hrefs = Array.from(li.querySelectorAll('a')).map(a => a.href).filter(h => h && h.startsWith('http'));\n              \n              return {\n                textParts,\n                hrefs\n              };\n            });\n            \n            resolve(items);\n          }\n        }, 800);\n      });\n    }")];
                case 2:
                    scrapedJobs = _b.sent();
                    if (!scrapedJobs || !Array.isArray(scrapedJobs)) {
                        console.warn("[Google Jobs Crawler] No jobs returned or Puppeteer failed.");
                        return [2 /*return*/, []];
                    }
                    normalizedJobs = [];
                    for (_i = 0, scrapedJobs_1 = scrapedJobs; _i < scrapedJobs_1.length; _i++) {
                        item = scrapedJobs_1[_i];
                        parts = item.textParts;
                        if (parts.length < 3)
                            continue;
                        title = parts[0];
                        company = parts[1];
                        locationAndSource = parts[2] || "";
                        isRemote = locationAndSource.toLowerCase().includes("remote") || params.location === "Remote India";
                        originalSource = "google";
                        if (locationAndSource.includes("via ")) {
                            originalSource = locationAndSource.split("via ")[1].toLowerCase().replace(/\\.com|\\.in/g, "").trim();
                        }
                        applyUrl = ((_a = item.hrefs) === null || _a === void 0 ? void 0 : _a[0]) || "";
                        if (!applyUrl) {
                            applyUrl = "https://www.google.com/search?q=".concat(encodeURIComponent(company + ' careers'), "&btnI");
                        }
                        jobDesc = "Found directly via Google Jobs organic crawler.\\nOriginal source: ".concat(originalSource, "\\nPosted: ").concat(parts[3] || 'Recently');
                        job = (0, normalizer_1.normalizeJob)({
                            title: title,
                            company: company,
                            location: isRemote ? "Remote" : params.location,
                            source: params.platformName,
                            platform: params.platformName,
                            applyChannel: "site",
                            applyEmail: undefined,
                            applyUrl: applyUrl,
                            workMode: isRemote ? "remote" : "office",
                            jobType: "experienced",
                            description: jobDesc,
                            postedAt: new Date().toISOString(),
                        });
                        normalizedJobs.push(job);
                    }
                    return [2 /*return*/, normalizedJobs];
                case 3:
                    error_1 = _b.sent();
                    console.error("[Google Jobs Crawler] error:", error_1);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
