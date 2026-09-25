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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWithPuppeteer = fetchWithPuppeteer;
exports.extractFromPage = extractFromPage;
var puppeteer_1 = __importDefault(require("puppeteer"));
var chromium_1 = __importDefault(require("@sparticuz/chromium"));
var puppeteer_core_1 = __importDefault(require("puppeteer-core"));
var executablePathPromise = null;
function getBrowser() {
    return __awaiter(this, void 0, void 0, function () {
        var executablePath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(process.env.NODE_ENV === "production" || process.env.VERCEL)) return [3 /*break*/, 3];
                    if (!executablePathPromise) {
                        executablePathPromise = chromium_1.default.executablePath("https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar");
                    }
                    return [4 /*yield*/, executablePathPromise];
                case 1:
                    executablePath = _a.sent();
                    return [4 /*yield*/, puppeteer_core_1.default.launch({
                            args: __spreadArray(__spreadArray([], chromium_1.default.args, true), ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'], false),
                            defaultViewport: chromium_1.default.defaultViewport || { width: 1280, height: 720 },
                            executablePath: executablePath,
                            headless: chromium_1.default.headless || "new",
                        })];
                case 2: return [2 /*return*/, _a.sent()];
                case 3: return [4 /*yield*/, puppeteer_1.default.launch({
                        headless: "new",
                        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                    })];
                case 4: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function fetchWithPuppeteer(url, waitForSelector, headers) {
    return __awaiter(this, void 0, void 0, function () {
        var browser, page, e_1, content, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getBrowser()];
                case 1:
                    browser = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 14, 15, 17]);
                    return [4 /*yield*/, browser.newPage()];
                case 3:
                    page = _a.sent();
                    // Set a common user agent to bypass simple blocks
                    return [4 /*yield*/, page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")];
                case 4:
                    // Set a common user agent to bypass simple blocks
                    _a.sent();
                    return [4 /*yield*/, page.setRequestInterception(true)];
                case 5:
                    _a.sent();
                    page.on("request", function (req) {
                        var type = req.resourceType();
                        if (type === "image" || type === "stylesheet" || type === "font" || type === "media")
                            req.abort();
                        else
                            req.continue();
                    });
                    if (!headers) return [3 /*break*/, 7];
                    return [4 /*yield*/, page.setExtraHTTPHeaders(headers)];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7: return [4 /*yield*/, page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })];
                case 8:
                    _a.sent();
                    if (!waitForSelector) return [3 /*break*/, 12];
                    _a.label = 9;
                case 9:
                    _a.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, page.waitForSelector(waitForSelector, { timeout: 5000 })];
                case 10:
                    _a.sent();
                    return [3 /*break*/, 12];
                case 11:
                    e_1 = _a.sent();
                    console.warn("[Puppeteer] timeout waiting for ".concat(waitForSelector, " on ").concat(url));
                    return [3 /*break*/, 12];
                case 12: return [4 /*yield*/, page.content()];
                case 13:
                    content = _a.sent();
                    return [2 /*return*/, content];
                case 14:
                    error_1 = _a.sent();
                    console.error("[Puppeteer] failed to fetch ".concat(url), error_1);
                    return [2 /*return*/, ""];
                case 15: return [4 /*yield*/, browser.close()];
                case 16:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 17: return [2 /*return*/];
            }
        });
    });
}
function extractFromPage(url, evaluateFn) {
    return __awaiter(this, void 0, void 0, function () {
        var browser, page, result, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getBrowser()];
                case 1:
                    browser = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 9, 10, 12]);
                    return [4 /*yield*/, browser.newPage()];
                case 3:
                    page = _a.sent();
                    return [4 /*yield*/, page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, page.setRequestInterception(true)];
                case 5:
                    _a.sent();
                    page.on("request", function (req) {
                        var type = req.resourceType();
                        if (type === "image" || type === "stylesheet" || type === "font" || type === "media")
                            req.abort();
                        else
                            req.continue();
                    });
                    return [4 /*yield*/, page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })];
                case 6:
                    _a.sent();
                    // Give it a second to render
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 2000); })];
                case 7:
                    // Give it a second to render
                    _a.sent();
                    return [4 /*yield*/, page.evaluate("(".concat(evaluateFn, ")()"))];
                case 8:
                    result = _a.sent();
                    return [2 /*return*/, result];
                case 9:
                    error_2 = _a.sent();
                    console.error("[Puppeteer] failed to extract from ".concat(url), error_2);
                    return [2 /*return*/, null];
                case 10: return [4 /*yield*/, browser.close()];
                case 11:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 12: return [2 /*return*/];
            }
        });
    });
}
