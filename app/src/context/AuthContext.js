import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { getUserProfile } from "../firebase/firestoreService";
import { registerForPushNotifications } from "../firebase/notificationService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Firebase Auth user object
  const [profile, setProfile] = useState(null); // Firestore user document
  const [loading, setLoading] = useState(true); // true while resolving auth state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const p = await getUserProfile(firebaseUser.uid);
        setProfile(p);
        // Register push token once onboarding is complete (role is set)
        if (p?.role) {
          registerForPushNotifications(firebaseUser.uid);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Call this after profile updates so UI reflects new data without re-fetching
  function refreshProfile(updates) {
    setProfile((prev) => ({ ...prev, ...updates }));
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
