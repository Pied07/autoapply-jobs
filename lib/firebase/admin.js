"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminDb = getAdminDb;
exports.getAdminAuth = getAdminAuth;
var app_1 = require("firebase-admin/app");
var auth_1 = require("firebase-admin/auth");
var firestore_1 = require("firebase-admin/firestore");
function getAdminApp() {
    var _a;
    if (!(0, app_1.getApps)().length) {
        var projectId = process.env.FIREBASE_PROJECT_ID;
        var clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        var privateKey = (_a = process.env.FIREBASE_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, "\n");
        if (projectId && clientEmail && privateKey) {
            if (!clientEmail.includes(".iam.gserviceaccount.com")) {
                throw new Error("FIREBASE_CLIENT_EMAIL must be the service account client_email, not a personal Gmail address.");
            }
            (0, app_1.initializeApp)({
                credential: (0, app_1.cert)({ projectId: projectId, clientEmail: clientEmail, privateKey: privateKey }),
            });
        }
        else {
            (0, app_1.initializeApp)();
        }
    }
    return (0, app_1.getApps)()[0];
}
function getAdminDb() {
    return (0, firestore_1.getFirestore)(getAdminApp());
}
function getAdminAuth() {
    return (0, auth_1.getAuth)(getAdminApp());
}
