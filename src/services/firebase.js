// firebase.js - Updated Storage Configuration

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAzJm-glpOXkAnzN-Hc6eOdkBD5aabSMsE",
  authDomain: "soundcrate-8f93c.firebaseapp.com",
  projectId: "soundcrate-8f93c",
  storageBucket: "soundcrate-8f93c.firebasestorage.app",
  messagingSenderId: "883580836967",
  appId: "1:883580836967:web:1cda58fcfbab74ba4608c2",
  measurementId: "G-QS2CF0E16G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Initialize storage with CORS settings
export const storage = getStorage(app);

// Initialize analytics conditionally (prevents errors in SSR or test environments)
let analytics = null;
isSupported().then(yes => {
  if (yes) analytics = getAnalytics(app);
});

export { analytics };
export const googleProvider = new GoogleAuthProvider();

export default app;