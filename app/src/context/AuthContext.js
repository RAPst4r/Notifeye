import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
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
        const p = await getUserProfile(firebaseUser.uid);

        // Auth account exists but no Firestore profile — orphaned account from
        // a failed signup or old test run. Sign out so the user can start fresh.
        if (!p) {
          await signOut(auth);
          return;
        }

        setUser(firebaseUser);
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
