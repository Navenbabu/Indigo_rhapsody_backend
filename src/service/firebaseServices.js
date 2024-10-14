// src/services/firebaseService.js
const admin = require("firebase-admin");
const base64ServiceAccount = require("../utils/consts").base64ServiceAccount;

const serviceAccountJSON = Buffer.from(base64ServiceAccount, "base64").toString(
  "utf8"
);

const serviceAccount = JSON.parse(serviceAccountJSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "sveccha-11c31.appspot.com",
});

const bucket = admin.storage().bucket();

module.exports = { admin, bucket };
