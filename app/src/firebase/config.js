// ─── REPLACE THESE VALUES ───────────────────────────────────────────────────
// Go to: Firebase Console → Project Settings → Your apps → Web app config
// If you haven't created a web app yet, click "Add app" → Web icon
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDLrAGSbD2Yt5rb_NRrJIZbaygNSBkAqcA",
  authDomain: "notifeye-f23b5.firebaseapp.com",
  projectId: "notifeye-f23b5",
  storageBucket: "notifeye-f23b5.firebasestorage.app",
  messagingSenderId: "314714632669",
  appId: "1:314714632669:web:40c832d7eaac84e2d7c634",
  measurementId: "G-1ZFWYVBRY8"
};

import { initializeApp, getApps } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Prevent re-initialization on hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
