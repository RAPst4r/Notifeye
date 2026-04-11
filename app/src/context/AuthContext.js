import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { getUserProfile, updateUserProfile } from "../firebase/firestoreService";
import { registerForPushNotifications } from "../firebase/notificationService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        let p = await getUserProfile(firebaseUser.uid);

        // ── Migrate pre-onboarding-rebuild accounts ───────────────────────────
        // Old accounts have a role but no onboardingComplete flag.
        // Silently mark them as complete so they go straight to the app.
        if (p?.role && !p?.onboardingComplete) {
          await updateUserProfile(firebaseUser.uid, { onboardingComplete: true });
          p = { ...p, onboardingComplete: true };
        }

        setProfile(p);

        // Register push token only once onboarding is done
        if (p?.onboardingComplete) {
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
