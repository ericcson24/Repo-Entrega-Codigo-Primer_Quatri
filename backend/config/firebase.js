const admin = require('firebase-admin');
require('dotenv').config();

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
        admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        });
        console.log('Firebase initialized successfully');
    } else {
        console.warn('Firebase credentials missing. Skipping DB initialization.');
    }
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
  }
}

let db;
try {
    if (admin.apps.length) {
        db = admin.firestore();
    } else {
        // Fallback or Null if no DB. 
        // User requested "No Mocks", so we simply won't have a DB instance.
        // Controllers must check if (db) before using.
        console.warn("Running without Firestore connection.");
        db = null;
    }
} catch(e) {
    db = null;
}

module.exports = { admin, db };
