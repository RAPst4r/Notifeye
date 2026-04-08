// ─── REPLACE THESE VALUES ───────────────────────────────────────────────────
// Go to: Firebase Console → Project Settings → Your apps → Web app config
// If you haven't created a web app yet, click "Add app" → Web icon
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID",
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
