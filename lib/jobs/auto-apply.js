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
exports.getBrowser = getBrowser;
exports.attemptAutomatedApplication = attemptAutomatedApplication;
var puppeteer_1 = __importDefault(require("puppeteer"));
var chromium_1 = __importDefault(require("@sparticuz/chromium"));
var puppeteer_core_1 = __importDefault(require("puppeteer-core"));
var puppeteer_extra_1 = require("puppeteer-extra");
var puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
var promises_1 = __importDefault(require("fs/promises"));
var path_1 = __importDefault(require("path"));
var os_1 = __importDefault(require("os"));
var puppeteerExtra = (0, puppeteer_extra_1.addExtra)(puppeteer_1.default);
var puppeteerCoreExtra = (0, puppeteer_extra_1.addExtra)(puppeteer_core_1.default);
puppeteerExtra.use((0, puppeteer_extra_plugin_stealth_1.default)());
puppeteerCoreExtra.use((0, puppeteer_extra_plugin_stealth_1.default)());
var executablePathPromise = null;
function getBrowser() {
    return __awaiter(this, void 0, void 0, function () {
        var executablePath, userDataDir;
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
                    return [4 /*yield*/, puppeteerCoreExtra.launch({
                            args: __spreadArray(__spreadArray([], chromium_1.default.args, true), ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'], false),
                            defaultViewport: chromium_1.default.defaultViewport || { width: 1280, height: 720 },
                            executablePath: executablePath,
                            headless: chromium_1.default.headless || "new",
                        })];
                case 2: return [2 /*return*/, _a.sent()];
                case 3:
                    userDataDir = path_1.default.join(process.cwd(), "chrome-profile");
                    return [4 /*yield*/, puppeteerExtra.launch({
                            headless: false, // Make it visible locally so user can log in if needed
                            userDataDir: userDataDir,
                            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                        })];
                case 4: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function attemptAutomatedApplication(jobUrl, profile, providedBrowser) {
    return __awaiter(this, void 0, void 0, function () {
        var tempResumePath, browser, _a, isOwnBrowser, context, page, res, buffer, ext, e_1, e_2, applyButtons, _i, applyButtons_1, btn, text, pages, latestPage, extButtons, _b, extButtons_1, eb, etext, e_3, e_4, currentUrl_1, isJobBoard, maxSteps, stepCount, clickedSubmit, nameFound, emailFound, resumeUploaded, allInputs, _c, allInputs_1, inEl, type, isVisible, name_1, id, val, e_5, inputs, isLoginPage, _d, inputs_1, input, type, e_6, _e, inputs_2, input, isVisible, type, name_2, id, val, e_7, attrString, e_8, e_9, nameParts, firstName, lastName, e_10, e_11, valToClick, labelText, contextStr, wantRelocate, e_12, attrLower, valToType, valToType, valToType, valToType, valToType, valToType, valToType, valToType, valToType, valToType, e_13, selects, _loop_1, _f, selects_1, sel, state_1, buttons, movedForward, reviewOrNextButton, _g, buttons_1, btn, isVisible, text, e_14, e_15, e_16, bodyText_1, successKeywords, isSuccess, e_17, error_1, e_18;
        var _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    if (!jobUrl) {
                        return [2 /*return*/, { status: "failed", message: "Job apply link is missing." }];
                    }
                    tempResumePath = null;
                    _a = providedBrowser;
                    if (_a) return [3 /*break*/, 2];
                    return [4 /*yield*/, getBrowser()];
                case 1:
                    _a = (_j.sent());
                    _j.label = 2;
                case 2:
                    browser = _a;
                    isOwnBrowser = !providedBrowser;
                    context = null;
                    page = null;
                    _j.label = 3;
                case 3:
                    _j.trys.push([3, 179, 180, 191]);
                    return [4 /*yield*/, browser.createBrowserContext().catch(function () { return browser.createIncognitoBrowserContext().catch(function () { return browser; }); })];
                case 4:
                    context = _j.sent();
                    if (!profile.resumeUrl) return [3 /*break*/, 11];
                    _j.label = 5;
                case 5:
                    _j.trys.push([5, 10, , 11]);
                    return [4 /*yield*/, fetch(profile.resumeUrl)];
                case 6:
                    res = _j.sent();
                    if (!res.ok) return [3 /*break*/, 9];
                    return [4 /*yield*/, res.arrayBuffer()];
                case 7:
                    buffer = _j.sent();
                    ext = profile.resumeFileName ? path_1.default.extname(profile.resumeFileName) : '.pdf';
                    tempResumePath = path_1.default.join(os_1.default.tmpdir(), "resume-".concat(Date.now()).concat(ext));
                    return [4 /*yield*/, promises_1.default.writeFile(tempResumePath, Buffer.from(buffer))];
                case 8:
                    _j.sent();
                    _j.label = 9;
                case 9: return [3 /*break*/, 11];
                case 10:
                    e_1 = _j.sent();
                    console.error("Failed to download resume to temp file", e_1);
                    return [3 /*break*/, 11];
                case 11: return [4 /*yield*/, context.newPage()];
                case 12:
                    page = _j.sent();
                    if (!(jobUrl.includes("linkedin.com") && process.env.LINKEDIN_SESSION_COOKIE)) return [3 /*break*/, 14];
                    return [4 /*yield*/, page.setCookie({
                            name: "li_at",
                            value: process.env.LINKEDIN_SESSION_COOKIE,
                            domain: ".linkedin.com",
                            path: "/",
                            secure: true,
                            httpOnly: true
                        })];
                case 13:
                    _j.sent();
                    console.log("[AutoApply] Injected LinkedIn session cookie for cloud authentication.");
                    _j.label = 14;
                case 14: 
                // SPEED OPTIMIZATION: Block images, fonts, and CSS to save massive CPU and Network overhead
                return [4 /*yield*/, page.setRequestInterception(true)];
                case 15:
                    // SPEED OPTIMIZATION: Block images, fonts, and CSS to save massive CPU and Network overhead
                    _j.sent();
                    page.on('request', function (req) {
                        var rt = req.resourceType();
                        if (['image', 'stylesheet', 'font', 'media', 'other'].includes(rt)) {
                            req.abort().catch(function () { });
                        }
                        else {
                            req.continue().catch(function () { });
                        }
                    });
                    return [4 /*yield*/, page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")];
                case 16:
                    _j.sent();
                    // Give it up to 15 seconds to load the job page
                    page.setDefaultTimeout(15000);
                    _j.label = 17;
                case 17:
                    _j.trys.push([17, 19, , 20]);
                    // Use domcontentloaded instead of networkidle2 to finish in 1-2 seconds instead of 15+ seconds
                    return [4 /*yield*/, page.goto(jobUrl, { waitUntil: "domcontentloaded" })];
                case 18:
                    // Use domcontentloaded instead of networkidle2 to finish in 1-2 seconds instead of 15+ seconds
                    _j.sent();
                    return [3 /*break*/, 20];
                case 19:
                    e_2 = _j.sent();
                    return [2 /*return*/, { status: "failed", message: "Failed to load the job application page (timeout or network error)." }];
                case 20: 
                // Wait a couple of seconds to ensure dynamic forms render
                return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 2000); })];
                case 21:
                    // Wait a couple of seconds to ensure dynamic forms render
                    _j.sent();
                    _j.label = 22;
                case 22:
                    _j.trys.push([22, 42, , 43]);
                    return [4 /*yield*/, page.$$("button, a")];
                case 23:
                    applyButtons = _j.sent();
                    _i = 0, applyButtons_1 = applyButtons;
                    _j.label = 24;
                case 24:
                    if (!(_i < applyButtons_1.length)) return [3 /*break*/, 41];
                    btn = applyButtons_1[_i];
                    return [4 /*yield*/, btn.evaluate(function (el) { return (el.textContent || el.value || "").toLowerCase().trim(); })];
                case 25:
                    text = _j.sent();
                    if (!(text === "easy apply" || text === "apply" || text === "apply now" || text === "apply for this job" || text.includes("apply to this") || text.includes("apply externally"))) return [3 /*break*/, 40];
                    return [4 /*yield*/, btn.evaluate(function (b) { return b.click(); })];
                case 26:
                    _j.sent();
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 5000); })];
                case 27:
                    _j.sent(); // wait for navigation, modal, or new tab
                    return [4 /*yield*/, context.pages()];
                case 28:
                    pages = _j.sent();
                    if (!(pages.length > 1)) return [3 /*break*/, 39];
                    latestPage = pages[pages.length - 1];
                    if (!(latestPage !== page)) return [3 /*break*/, 39];
                    page = latestPage;
                    page.setDefaultTimeout(15000);
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 4000); })];
                case 29:
                    _j.sent(); // wait for external ATS to fully render
                    _j.label = 30;
                case 30:
                    _j.trys.push([30, 38, , 39]);
                    return [4 /*yield*/, page.$$("button, a")];
                case 31:
                    extButtons = _j.sent();
                    _b = 0, extButtons_1 = extButtons;
                    _j.label = 32;
                case 32:
                    if (!(_b < extButtons_1.length)) return [3 /*break*/, 37];
                    eb = extButtons_1[_b];
                    return [4 /*yield*/, eb.evaluate(function (el) { return (el.textContent || "").toLowerCase().trim(); })];
                case 33:
                    etext = _j.sent();
                    if (!(etext === "apply" || etext === "apply now" || etext === "apply for this job")) return [3 /*break*/, 36];
                    return [4 /*yield*/, eb.evaluate(function (b) { return b.click(); })];
                case 34:
                    _j.sent();
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 4000); })];
                case 35:
                    _j.sent();
                    return [3 /*break*/, 37];
                case 36:
                    _b++;
                    return [3 /*break*/, 32];
                case 37: return [3 /*break*/, 39];
                case 38:
                    e_3 = _j.sent();
                    return [3 /*break*/, 39];
                case 39: return [3 /*break*/, 41];
                case 40:
                    _i++;
                    return [3 /*break*/, 24];
                case 41: return [3 /*break*/, 43];
                case 42:
                    e_4 = _j.sent();
                    return [3 /*break*/, 43];
                case 43:
                    currentUrl_1 = page.url().toLowerCase();
                    isJobBoard = ["linkedin.com", "indeed.com", "naukri.com", "foundit", "timesjobs.com", "internshala.com"].some(function (domain) { return currentUrl_1.includes(domain); });
                    if (isJobBoard) {
                        console.log("[AutoApply] Still on ".concat(currentUrl_1, ". Skipping native application to focus on external sites."));
                        return [2 /*return*/, {
                                status: "failed",
                                message: "Skipped. Job uses native application (Easy Apply) instead of an external ATS."
                            }];
                    }
                    maxSteps = 10;
                    stepCount = 0;
                    clickedSubmit = false;
                    nameFound = false;
                    emailFound = false;
                    resumeUploaded = false;
                    _j.label = 44;
                case 44:
                    if (!(stepCount < maxSteps && !clickedSubmit)) return [3 /*break*/, 174];
                    stepCount++;
                    return [4 /*yield*/, page.$$("input")];
                case 45:
                    allInputs = _j.sent();
                    console.log("\n[AutoApply Debug] Step ".concat(stepCount, ": Found ").concat(allInputs.length, " total inputs. Visible ones:"));
                    _c = 0, allInputs_1 = allInputs;
                    _j.label = 46;
                case 46:
                    if (!(_c < allInputs_1.length)) return [3 /*break*/, 56];
                    inEl = allInputs_1[_c];
                    _j.label = 47;
                case 47:
                    _j.trys.push([47, 54, , 55]);
                    return [4 /*yield*/, inEl.evaluate(function (el) { return el.getAttribute("type") || ""; })];
                case 48:
                    type = _j.sent();
                    if (type === "hidden")
                        return [3 /*break*/, 55];
                    return [4 /*yield*/, inEl.evaluate(function (el) {
                            var rect = el.getBoundingClientRect();
                            return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
                        })];
                case 49:
                    isVisible = _j.sent();
                    if (!isVisible) return [3 /*break*/, 53];
                    return [4 /*yield*/, inEl.evaluate(function (el) { return el.getAttribute("name") || ""; })];
                case 50:
                    name_1 = _j.sent();
                    return [4 /*yield*/, inEl.evaluate(function (el) { return el.id || ""; })];
                case 51:
                    id = _j.sent();
                    return [4 /*yield*/, inEl.evaluate(function (el) { return el.value || ""; })];
                case 52:
                    val = _j.sent();
                    console.log("  -> Input: type=\"".concat(type, "\" name=\"").concat(name_1, "\" id=\"").concat(id, "\" value=\"").concat(val, "\""));
                    _j.label = 53;
                case 53: return [3 /*break*/, 55];
                case 54:
                    e_5 = _j.sent();
                    return [3 /*break*/, 55];
                case 55:
                    _c++;
                    return [3 /*break*/, 46];
                case 56:
                    console.log("\n");
                    return [4 /*yield*/, page.$$("input")];
                case 57:
                    inputs = _j.sent();
                    isLoginPage = false;
                    _d = 0, inputs_1 = inputs;
                    _j.label = 58;
                case 58:
                    if (!(_d < inputs_1.length)) return [3 /*break*/, 63];
                    input = inputs_1[_d];
                    _j.label = 59;
                case 59:
                    _j.trys.push([59, 61, , 62]);
                    return [4 /*yield*/, input.evaluate(function (el) { var _a; return ((_a = el.getAttribute("type")) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || ""; })];
                case 60:
                    type = _j.sent();
                    if (type === "password") {
                        isLoginPage = true;
                        return [3 /*break*/, 63];
                    }
                    return [3 /*break*/, 62];
                case 61:
                    e_6 = _j.sent();
                    return [3 /*break*/, 62];
                case 62:
                    _d++;
                    return [3 /*break*/, 58];
                case 63:
                    if (isLoginPage) {
                        console.log("[AutoApply] Detected a password field. This is a login/signup wall.");
                        return [2 /*return*/, {
                                status: "failed",
                                message: "Encountered a login/signup page. The platform requires authentication to apply.",
                            }];
                    }
                    _e = 0, inputs_2 = inputs;
                    _j.label = 64;
                case 64:
                    if (!(_e < inputs_2.length)) return [3 /*break*/, 148];
                    input = inputs_2[_e];
                    isVisible = false;
                    type = "", name_2 = "", id = "", val = "";
                    _j.label = 65;
                case 65:
                    _j.trys.push([65, 72, , 73]);
                    return [4 /*yield*/, input.evaluate(function (el) { var _a; return ((_a = el.getAttribute("type")) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || ""; })];
                case 66:
                    type = _j.sent();
                    if (!(type !== "file")) return [3 /*break*/, 68];
                    return [4 /*yield*/, input.evaluate(function (el) {
                            var rect = el.getBoundingClientRect();
                            return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
                        })];
                case 67:
                    isVisible = _j.sent();
                    if (!isVisible)
                        return [3 /*break*/, 147];
                    _j.label = 68;
                case 68: return [4 /*yield*/, input.evaluate(function (el) { var _a; return ((_a = el.getAttribute("name")) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || ""; })];
                case 69:
                    name_2 = _j.sent();
                    return [4 /*yield*/, input.evaluate(function (el) { return el.id.toLowerCase() || ""; })];
                case 70:
                    id = _j.sent();
                    return [4 /*yield*/, input.evaluate(function (el) { return el.value; })];
                case 71:
                    val = _j.sent();
                    return [3 /*break*/, 73];
                case 72:
                    e_7 = _j.sent();
                    return [3 /*break*/, 147]; // Context destroyed or element removed, skip
                case 73:
                    attrString = "".concat(type, " ").concat(name_2, " ").concat(id);
                    if (!(type === "file" && tempResumePath && !resumeUploaded)) return [3 /*break*/, 78];
                    _j.label = 74;
                case 74:
                    _j.trys.push([74, 76, , 77]);
                    console.log("[AutoApply] Found file input for resume (".concat(attrString, "). Uploading ").concat(tempResumePath));
                    return [4 /*yield*/, input.uploadFile(tempResumePath)];
                case 75:
                    _j.sent();
                    resumeUploaded = true;
                    return [3 /*break*/, 77];
                case 76:
                    e_8 = _j.sent();
                    console.error("[AutoApply] Failed to upload resume:", e_8);
                    return [3 /*break*/, 77];
                case 77: return [3 /*break*/, 147];
                case 78:
                    if (!(attrString.includes("email") && !val)) return [3 /*break*/, 83];
                    emailFound = true;
                    _j.label = 79;
                case 79:
                    _j.trys.push([79, 81, , 82]);
                    console.log("[AutoApply] Typed field: [email] Value: ".concat(profile.email));
                    return [4 /*yield*/, input.type(profile.email || "")];
                case 80:
                    _j.sent();
                    return [3 /*break*/, 82];
                case 81:
                    e_9 = _j.sent();
                    return [3 /*break*/, 82];
                case 82: return [3 /*break*/, 147];
                case 83:
                    if (!((attrString.includes("name") || attrString.includes("first") || attrString.includes("last")) && !val)) return [3 /*break*/, 93];
                    nameFound = true;
                    _j.label = 84;
                case 84:
                    _j.trys.push([84, 91, , 92]);
                    nameParts = (profile.name || "").trim().split(/\s+/);
                    firstName = nameParts[0] || "";
                    lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : firstName;
                    if (!attrString.includes("first")) return [3 /*break*/, 86];
                    console.log("[AutoApply] Typed field: [firstName] Value: ".concat(firstName));
                    return [4 /*yield*/, input.type(firstName)];
                case 85:
                    _j.sent();
                    return [3 /*break*/, 90];
                case 86:
                    if (!attrString.includes("last")) return [3 /*break*/, 88];
                    console.log("[AutoApply] Typed field: [lastName] Value: ".concat(lastName));
                    return [4 /*yield*/, input.type(lastName)];
                case 87:
                    _j.sent();
                    return [3 /*break*/, 90];
                case 88:
                    console.log("[AutoApply] Typed field: [fullName] Value: ".concat(profile.name));
                    return [4 /*yield*/, input.type(profile.name || "")];
                case 89:
                    _j.sent();
                    _j.label = 90;
                case 90: return [3 /*break*/, 92];
                case 91:
                    e_10 = _j.sent();
                    return [3 /*break*/, 92];
                case 92: return [3 /*break*/, 147];
                case 93:
                    if (!((attrString.includes("phone") || attrString.includes("tel") || attrString.includes("mobile")) && !val)) return [3 /*break*/, 98];
                    _j.label = 94;
                case 94:
                    _j.trys.push([94, 96, , 97]);
                    console.log("[AutoApply] Typed field: [phone] Value: ".concat(profile.phone || "0000000000"));
                    return [4 /*yield*/, input.type(profile.phone || "0000000000")];
                case 95:
                    _j.sent();
                    return [3 /*break*/, 97];
                case 96:
                    e_11 = _j.sent();
                    return [3 /*break*/, 97];
                case 97: return [3 /*break*/, 147];
                case 98:
                    if (!(type === "radio" || type === "checkbox")) return [3 /*break*/, 119];
                    _j.label = 99;
                case 99:
                    _j.trys.push([99, 117, , 118]);
                    return [4 /*yield*/, input.evaluate(function (el) { var _a; return ((_a = el.value) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || ""; })];
                case 100:
                    valToClick = _j.sent();
                    return [4 /*yield*/, input.evaluate(function (el) {
                            var _a, _b;
                            var id = el.id;
                            if (id) {
                                var label = document.querySelector("label[for=\"".concat(id, "\"]"));
                                if (label)
                                    return ((_a = label.textContent) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
                            }
                            var parentLabel = el.closest('label');
                            if (parentLabel)
                                return ((_b = parentLabel.textContent) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || "";
                            return "";
                        })];
                case 101:
                    labelText = _j.sent();
                    contextStr = "".concat(attrString, " ").concat(valToClick, " ").concat(labelText).toLowerCase();
                    if (!(contextStr.includes("gender") || contextStr.includes("male") || contextStr.includes("female") || contextStr.includes("sex"))) return [3 /*break*/, 104];
                    if (!(profile.gender && contextStr.includes(profile.gender.toLowerCase()))) return [3 /*break*/, 103];
                    console.log("[AutoApply] Clicked field: [".concat(name_2 || id, "] Value: ").concat(profile.gender));
                    return [4 /*yield*/, input.evaluate(function (el) { return el.click(); })];
                case 102:
                    _j.sent();
                    _j.label = 103;
                case 103: return [3 /*break*/, 116];
                case 104:
                    if (!contextStr.includes("veteran")) return [3 /*break*/, 107];
                    if (!(profile.veteranStatus && contextStr.includes(profile.veteranStatus.toLowerCase()))) return [3 /*break*/, 106];
                    console.log("[AutoApply] Clicked field: [".concat(name_2 || id, "] Value: ").concat(profile.veteranStatus));
                    return [4 /*yield*/, input.evaluate(function (el) { return el.click(); })];
                case 105:
                    _j.sent();
                    _j.label = 106;
                case 106: return [3 /*break*/, 116];
                case 107:
                    if (!contextStr.includes("disability")) return [3 /*break*/, 110];
                    if (!(profile.disabilityStatus && contextStr.includes(profile.disabilityStatus.toLowerCase()))) return [3 /*break*/, 109];
                    console.log("[AutoApply] Clicked field: [".concat(name_2 || id, "] Value: ").concat(profile.disabilityStatus));
                    return [4 /*yield*/, input.evaluate(function (el) { return el.click(); })];
                case 108:
                    _j.sent();
                    _j.label = 109;
                case 109: return [3 /*break*/, 116];
                case 110:
                    if (!contextStr.includes("relocate")) return [3 /*break*/, 113];
                    wantRelocate = profile.willingToRelocate ? "yes" : "no";
                    if (!contextStr.includes(wantRelocate)) return [3 /*break*/, 112];
                    console.log("[AutoApply] Clicked field: [".concat(name_2 || id, "] Value: ").concat(wantRelocate));
                    return [4 /*yield*/, input.evaluate(function (el) { return el.click(); })];
                case 111:
                    _j.sent();
                    _j.label = 112;
                case 112: return [3 /*break*/, 116];
                case 113:
                    if (!(contextStr.includes("agree") || contextStr.includes("terms") || contextStr.includes("policy") || contextStr.includes("conditions") || contextStr.includes("consent"))) return [3 /*break*/, 115];
                    console.log("[AutoApply] Clicked field: [".concat(name_2 || id, "] Value: Checked (Agreed)"));
                    return [4 /*yield*/, input.evaluate(function (el) { return el.click(); })];
                case 114:
                    _j.sent();
                    return [3 /*break*/, 116];
                case 115:
                    if (contextStr.includes("yes") || contextStr.includes("no") || contextStr.includes("true") || contextStr.includes("false")) {
                        console.log("[AutoApply] Unknown radio/checkbox field encountered: ".concat(contextStr, ". System does not have a mapped value."));
                        return [2 /*return*/, { status: "failed", message: "Failed because of field [name=\"".concat(name_2, "\", id=\"").concat(id, "\"] which takes unknown input and the system does not have a value for it.") }];
                    }
                    else {
                        console.log("[AutoApply] Unknown radio/checkbox field encountered: ".concat(contextStr, ". System does not have a mapped value."));
                        return [2 /*return*/, { status: "failed", message: "Failed because of field [name=\"".concat(name_2, "\", id=\"").concat(id, "\"] which takes unknown input and the system does not have a value for it.") }];
                    }
                    _j.label = 116;
                case 116: return [3 /*break*/, 118];
                case 117:
                    e_12 = _j.sent();
                    return [3 /*break*/, 118];
                case 118: return [3 /*break*/, 147];
                case 119:
                    if (!(!val && (type === "text" || type === "number" || type === "url" || !type))) return [3 /*break*/, 147];
                    _j.label = 120;
                case 120:
                    _j.trys.push([120, 146, , 147]);
                    attrLower = attrString.toLowerCase();
                    if (!(attrLower.includes("year") || attrLower.includes("experience"))) return [3 /*break*/, 122];
                    valToType = profile.yearsOfExperience || "4";
                    console.log("[AutoApply] Typed field: [".concat(name_2 || id, "] Value: ").concat(valToType));
                    return [4 /*yield*/, input.type(valToType)];
                case 121:
                    _j.sent();
                    return [3 /*break*/, 145];
                case 122:
                    if (!(attrLower.includes("city") || attrLower.includes("loc"))) return [3 /*break*/, 124];
                    valToType = ((_h = profile.preferredLocations) === null || _h === void 0 ? void 0 : _h[0]) || "India";
                    console.log("[AutoApply] Typed field: [".concat(name_2 || id, "] Value: ").concat(valToType));
                    return [4 /*yield*/, input.type(valToType)];
                case 123:
                    _j.sent();
                    return [3 /*break*/, 145];
                case 124:
                    if (!(attrLower.includes("salary") || attrLower.includes("pay") || attrLower.includes("ctc"))) return [3 /*break*/, 126];
                    valToType = profile.expectedSalary || "1000000";
                    console.log("[AutoApply] Typed field: [".concat(name_2 || id, "] Value: ").concat(valToType));
                    return [4 /*yield*/, input.type(valToType)];
                case 125:
                    _j.sent();
                    return [3 /*break*/, 145];
                case 126:
                    if (!attrLower.includes("github")) return [3 /*break*/, 129];
                    valToType = profile.githubUrl || "";
                    console.log("[AutoApply] Typed field: [".concat(name_2 || id, "] Value: ").concat(valToType));
                    if (!valToType) return [3 /*break*/, 128];
                    return [4 /*yield*/, input.type(valToType)];
                case 127:
                    _j.sent();
                    _j.label = 128;
                case 128: return [3 /*break*/, 145];
                case 129:
                    if (!(attrLower.includes("portfolio") || attrLower.includes("website") || attrLower.includes("site"))) return [3 /*break*/, 132];
                    valToType = profile.portfolioUrl || "";
                    console.log("[AutoApply] Typed field: [".concat(name_2 || id, "] Value: ").concat(valToType));
                    if (!valToType) return [3 /*break*/, 131];
                    return [4 /*yield*/, input.type(valToType)];
                case 130:
                    _j.sent();
                    _j.label = 131;
                case 131: return [3 /*break*/, 145];
                case 132:
                    if (!attrLower.includes("linkedin")) return [3 /*break*/, 135];
                    valToType = profile.linkedinUrl || "";
                    console.log("[AutoApply] Typed field: [".concat(name_2 || id, "] Value: ").concat(valToType));
                    if (!valToType) return [3 /*break*/, 134];
                    return [4 /*yield*/, input.type(valToType)];
                case 133:
                    _j.sent();
                    _j.label = 134;
                case 134: return [3 /*break*/, 145];
                case 135:
                    if (!(attrLower.includes("notice") || attrLower.includes("period"))) return [3 /*break*/, 137];
                    valToType = profile.noticePeriod || "15 days";
                    console.log("[AutoApply] Typed field: [".concat(name_2 || id, "] Value: ").concat(valToType));
                    return [4 /*yield*/, input.type(valToType)];
                case 136:
                    _j.sent();
                    return [3 /*break*/, 145];
                case 137:
                    if (!(attrLower.includes("school") || attrLower.includes("college") || attrLower.includes("university"))) return [3 /*break*/, 140];
                    valToType = profile.college || profile.school || "";
                    console.log("[AutoApply] Typed field: [".concat(name_2 || id, "] Value: ").concat(valToType));
                    if (!valToType) return [3 /*break*/, 139];
                    return [4 /*yield*/, input.type(valToType)];
                case 138:
                    _j.sent();
                    _j.label = 139;
                case 139: return [3 /*break*/, 145];
                case 140:
                    if (!(attrLower.includes("company") || attrLower.includes("employer"))) return [3 /*break*/, 142];
                    valToType = "Self-Employed";
                    console.log("[AutoApply] Typed field: [".concat(name_2 || id, "] Value: ").concat(valToType));
                    return [4 /*yield*/, input.type(valToType)];
                case 141:
                    _j.sent();
                    return [3 /*break*/, 145];
                case 142:
                    if (!(type === "number")) return [3 /*break*/, 144];
                    valToType = "0";
                    console.log("[AutoApply] Typed field: [".concat(name_2 || id, "] Value: ").concat(valToType));
                    return [4 /*yield*/, input.type(valToType)];
                case 143:
                    _j.sent();
                    return [3 /*break*/, 145];
                case 144:
                    console.log("[AutoApply] Unknown text field encountered: ".concat(attrString, ". System does not have a mapped value."));
                    return [2 /*return*/, { status: "failed", message: "Failed because of field [name=\"".concat(name_2, "\", id=\"").concat(id, "\"] which takes unknown input and the system does not have a value for it.") }];
                case 145: return [3 /*break*/, 147];
                case 146:
                    e_13 = _j.sent();
                    return [3 /*break*/, 147];
                case 147:
                    _e++;
                    return [3 /*break*/, 64];
                case 148: return [4 /*yield*/, page.$$("select")];
                case 149:
                    selects = _j.sent();
                    _loop_1 = function (sel) {
                        var isVisible, val, name_3, id, options, contextStr, selectedValue, selectedText, target_1, opt, target_2, opt, target_3, opt, target_4, opt, opt, e_19;
                        return __generator(this, function (_k) {
                            switch (_k.label) {
                                case 0:
                                    _k.trys.push([0, 9, , 10]);
                                    return [4 /*yield*/, sel.evaluate(function (el) { return window.getComputedStyle(el).visibility !== 'hidden'; })];
                                case 1:
                                    isVisible = _k.sent();
                                    if (!isVisible)
                                        return [2 /*return*/, "continue"];
                                    return [4 /*yield*/, sel.evaluate(function (el) { return el.value; })];
                                case 2:
                                    val = _k.sent();
                                    if (!(!val || val.toLowerCase().includes("select") || val === "")) return [3 /*break*/, 8];
                                    return [4 /*yield*/, sel.evaluate(function (el) { return el.getAttribute("name") || ""; })];
                                case 3:
                                    name_3 = _k.sent();
                                    return [4 /*yield*/, sel.evaluate(function (el) { return el.id || ""; })];
                                case 4:
                                    id = _k.sent();
                                    return [4 /*yield*/, sel.evaluate(function (el) { return Array.from(el.options).map(function (o) { return ({ text: o.text.toLowerCase(), value: o.value }); }); })];
                                case 5:
                                    options = _k.sent();
                                    contextStr = "".concat(name_3, " ").concat(id).toLowerCase();
                                    selectedValue = null;
                                    selectedText = null;
                                    if (contextStr.includes("gender") || contextStr.includes("sex")) {
                                        target_1 = profile.gender ? profile.gender.toLowerCase() : "";
                                        opt = options.find(function (o) { return o.text.includes(target_1); });
                                        if (opt) {
                                            selectedValue = opt.value;
                                            selectedText = opt.text;
                                        }
                                    }
                                    else if (contextStr.includes("veteran")) {
                                        target_2 = profile.veteranStatus ? profile.veteranStatus.toLowerCase() : "";
                                        opt = options.find(function (o) { return o.text.includes(target_2); });
                                        if (opt) {
                                            selectedValue = opt.value;
                                            selectedText = opt.text;
                                        }
                                    }
                                    else if (contextStr.includes("disability")) {
                                        target_3 = profile.disabilityStatus ? profile.disabilityStatus.toLowerCase() : "";
                                        opt = options.find(function (o) { return o.text.includes(target_3); });
                                        if (opt) {
                                            selectedValue = opt.value;
                                            selectedText = opt.text;
                                        }
                                    }
                                    else if (contextStr.includes("relocate")) {
                                        target_4 = profile.willingToRelocate ? "yes" : "no";
                                        opt = options.find(function (o) { return o.text.includes(target_4) || (target_4 === "yes" && o.text.includes("will")); });
                                        if (opt) {
                                            selectedValue = opt.value;
                                            selectedText = opt.text;
                                        }
                                    }
                                    else if (contextStr.includes("country")) {
                                        opt = options.find(function (o) { return o.text.includes("india") || o.text.includes("united states") || o.text.includes("us"); });
                                        if (opt) {
                                            selectedValue = opt.value;
                                            selectedText = opt.text;
                                        }
                                    }
                                    else if (contextStr.includes("state") || contextStr.includes("province")) {
                                        selectedValue = options.length > 1 ? options[1].value : null;
                                        selectedText = options.length > 1 ? options[1].text : null;
                                    }
                                    if (!(selectedValue !== null)) return [3 /*break*/, 7];
                                    console.log("[AutoApply] Selected dropdown field: [".concat(name_3 || id, "] Value: ").concat(selectedText));
                                    return [4 /*yield*/, sel.evaluate(function (el, sVal) {
                                            el.value = sVal;
                                            el.dispatchEvent(new Event('change', { bubbles: true }));
                                        }, selectedValue)];
                                case 6:
                                    _k.sent();
                                    return [3 /*break*/, 8];
                                case 7:
                                    console.log("[AutoApply] Unknown dropdown field encountered: ".concat(contextStr, ". System does not have a mapped value."));
                                    return [2 /*return*/, { value: { status: "failed", message: "Failed because of dropdown field [name=\"".concat(name_3, "\", id=\"").concat(id, "\"] which takes unknown input and the system does not have a value for it.") } }];
                                case 8: return [3 /*break*/, 10];
                                case 9:
                                    e_19 = _k.sent();
                                    return [3 /*break*/, 10];
                                case 10: return [2 /*return*/];
                            }
                        });
                    };
                    _f = 0, selects_1 = selects;
                    _j.label = 150;
                case 150:
                    if (!(_f < selects_1.length)) return [3 /*break*/, 153];
                    sel = selects_1[_f];
                    return [5 /*yield**/, _loop_1(sel)];
                case 151:
                    state_1 = _j.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _j.label = 152;
                case 152:
                    _f++;
                    return [3 /*break*/, 150];
                case 153: return [4 /*yield*/, page.$$("button, input[type='submit'], input[type='button']")];
                case 154:
                    buttons = _j.sent();
                    movedForward = false;
                    reviewOrNextButton = null;
                    _g = 0, buttons_1 = buttons;
                    _j.label = 155;
                case 155:
                    if (!(_g < buttons_1.length)) return [3 /*break*/, 168];
                    btn = buttons_1[_g];
                    isVisible = false;
                    text = "";
                    _j.label = 156;
                case 156:
                    _j.trys.push([156, 159, , 160]);
                    return [4 /*yield*/, btn.evaluate(function (el) {
                            var rect = el.getBoundingClientRect();
                            return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden' && !el.disabled;
                        })];
                case 157:
                    isVisible = _j.sent();
                    if (!isVisible)
                        return [3 /*break*/, 167];
                    return [4 /*yield*/, btn.evaluate(function (el) { return (el.textContent || el.value || "").toLowerCase().trim(); })];
                case 158:
                    text = _j.sent();
                    return [3 /*break*/, 160];
                case 159:
                    e_14 = _j.sent();
                    return [3 /*break*/, 167];
                case 160:
                    if (!(text.includes("submit application") || text === "submit" || text === "apply" || text === "send" || text.includes("submit"))) return [3 /*break*/, 166];
                    _j.label = 161;
                case 161:
                    _j.trys.push([161, 164, , 165]);
                    console.log("[AutoApply] Found submit button (\"".concat(text, "\"). Clicking."));
                    return [4 /*yield*/, btn.evaluate(function (b) { return b.click(); })];
                case 162:
                    _j.sent();
                    clickedSubmit = true;
                    movedForward = true;
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 4000); })];
                case 163:
                    _j.sent();
                    return [3 /*break*/, 168];
                case 164:
                    e_15 = _j.sent();
                    return [3 /*break*/, 165];
                case 165: return [3 /*break*/, 167];
                case 166:
                    if (text.includes("next") || text.includes("continue") || text.includes("review")) {
                        console.log("[AutoApply] Found next/continue button (\"".concat(text, "\"). Storing for fallback."));
                        reviewOrNextButton = btn;
                    }
                    _j.label = 167;
                case 167:
                    _g++;
                    return [3 /*break*/, 155];
                case 168:
                    if (clickedSubmit)
                        return [3 /*break*/, 174];
                    if (!reviewOrNextButton) return [3 /*break*/, 173];
                    _j.label = 169;
                case 169:
                    _j.trys.push([169, 172, , 173]);
                    console.log("[AutoApply] Clicking next/continue button.");
                    return [4 /*yield*/, reviewOrNextButton.evaluate(function (b) { return b.click(); })];
                case 170:
                    _j.sent();
                    movedForward = true;
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 2000); })];
                case 171:
                    _j.sent();
                    return [3 /*break*/, 173];
                case 172:
                    e_16 = _j.sent();
                    return [3 /*break*/, 173];
                case 173:
                    // If we couldn't find a way to move forward, break the multi-step loop
                    if (!movedForward) {
                        return [3 /*break*/, 174];
                    }
                    return [3 /*break*/, 44];
                case 174:
                    if (!nameFound && !emailFound && !clickedSubmit) {
                        return [2 /*return*/, {
                                status: "failed",
                                message: "Failed to locate standard application form fields (Name, Email) on the page. The ATS might be unsupported or requires login.",
                            }];
                    }
                    if (!clickedSubmit) return [3 /*break*/, 178];
                    _j.label = 175;
                case 175:
                    _j.trys.push([175, 177, , 178]);
                    return [4 /*yield*/, page.evaluate(function () { return document.body.innerText.toLowerCase(); })];
                case 176:
                    bodyText_1 = _j.sent();
                    successKeywords = [
                        "application submitted",
                        "application received",
                        "thank you for applying",
                        "application has been sent",
                        "successfully applied",
                        "application complete"
                    ];
                    isSuccess = successKeywords.some(function (kw) { return bodyText_1.includes(kw); });
                    if (isSuccess) {
                        return [2 /*return*/, {
                                status: "applied",
                                message: "Successfully filled basic details, ".concat(resumeUploaded ? "uploaded resume," : "could not find resume upload field,", " and verified submission success."),
                            }];
                    }
                    else {
                        return [2 /*return*/, {
                                status: "failed",
                                message: "Filled details and clicked submit, but could not verify a success message. Validation might have failed due to missing required fields.",
                            }];
                    }
                    return [3 /*break*/, 178];
                case 177:
                    e_17 = _j.sent();
                    return [2 /*return*/, {
                            status: "failed",
                            message: "Found form and filled details, but failed to click the submit button.",
                        }];
                case 178: return [2 /*return*/, {
                        status: "failed",
                        message: "Filled details ".concat(resumeUploaded ? "and uploaded resume" : "", ", but could not locate a clear submit button."),
                    }];
                case 179:
                    error_1 = _j.sent();
                    return [2 /*return*/, {
                            status: "failed",
                            message: "Browser automation failed: ".concat(error_1 instanceof Error ? error_1.message : "Unknown error"),
                        }];
                case 180:
                    if (!page) return [3 /*break*/, 182];
                    return [4 /*yield*/, page.close().catch(function () { })];
                case 181:
                    _j.sent();
                    _j.label = 182;
                case 182:
                    if (!context) return [3 /*break*/, 184];
                    return [4 /*yield*/, context.close().catch(function () { })];
                case 183:
                    _j.sent();
                    _j.label = 184;
                case 184:
                    if (!(browser && isOwnBrowser)) return [3 /*break*/, 186];
                    return [4 /*yield*/, browser.close().catch(function () { })];
                case 185:
                    _j.sent();
                    _j.label = 186;
                case 186:
                    if (!tempResumePath) return [3 /*break*/, 190];
                    _j.label = 187;
                case 187:
                    _j.trys.push([187, 189, , 190]);
                    return [4 /*yield*/, promises_1.default.unlink(tempResumePath)];
                case 188:
                    _j.sent();
                    return [3 /*break*/, 190];
                case 189:
                    e_18 = _j.sent();
                    return [3 /*break*/, 190];
                case 190: return [7 /*endfinally*/];
                case 191: return [2 /*return*/];
            }
        });
    });
}
