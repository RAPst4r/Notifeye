import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
} from "firebase/auth";
import { auth } from "./config";
import { createUserProfile, getUserProfile } from "./firestoreService";
import { removePushToken } from "./notificationService";

// ── Email / Password ──────────────────────────────────────────────────────────

export async function signUp(email, password, name, age) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await createUserProfile(credential.user.uid, { email, name, lastName: "", age, ssoProvider: null });
  return credential.user;
}

export async function signIn(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logOut() {
  const uid = auth.currentUser?.uid;
  if (uid) await removePushToken(uid);
  await signOut(auth);
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ── Google SSO ────────────────────────────────────────────────────────────────

// Called from AuthMethodScreen after expo-auth-session returns an id_token.
// role is passed from RoleSelectScreen and only used for new users.
// firstName/lastName come from NameEntryScreen (step 2) and take priority over
// whatever Google returns, since the user typed them explicitly.
export async function signInWithGoogleCredential(idToken, age, firstName, lastName) {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);

  const existing = await getUserProfile(result.user.uid);
  if (!existing) {
    const resolvedFirst = firstName || result.user.displayName?.split(" ")[0] || "";
    const resolvedLast  = lastName  || result.user.displayName?.split(" ").slice(1).join(" ") || "";
    await createUserProfile(result.user.uid, {
      email:       result.user.email ?? "",
      name:        resolvedFirst,
      lastName:    resolvedLast,
      age,
      ssoProvider: "google",
    });
  }

  return result.user;
}

// ── Apple SSO ─────────────────────────────────────────────────────────────────

// Called from AuthMethodScreen after AppleAuthentication.signInAsync().
// fullName is the Apple credential fullName object (only provided on first sign-in).
export async function signInWithAppleCredential(identityToken, age, firstName, lastName) {
  const provider = new OAuthProvider("apple.com");
  const credential = provider.credential({ idToken: identityToken });
  const result = await signInWithCredential(auth, credential);

  const existing = await getUserProfile(result.user.uid);
  if (!existing) {
    await createUserProfile(result.user.uid, {
      email:       result.user.email ?? "",
      name:        firstName ?? "",
      lastName:    lastName ?? "",
      age,
      ssoProvider: "apple",
    });
  }

  return result.user;
}
