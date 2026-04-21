import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";

// Safe upsert — creates the document if it doesn't exist, merges if it does.
// Use this instead of updateDoc anywhere the document might not exist yet.
async function upsertUserProfile(uid, updates) {
  await setDoc(doc(db, "users", uid), updates, { merge: true });
}
import { db } from "./config";

// ── User profile ──────────────────────────────────────────────────────────────

export async function createUserProfile(uid, { email, name, lastName, age, ssoProvider }) {
  const inviteCode = generateInviteCode(uid);

  await setDoc(doc(db, "users", uid), {
    uid,
    email:              email ?? "",
    name:               name ?? "",
    lastName:           lastName ?? "",
    age:                age ?? null,
    ssoProvider:        ssoProvider ?? null, // "google" | "apple" | null
    subscriptionTier:   "free",
    linkedUserIds:      [],
    inviteCode,
    pushTokens:         [],
    createdAt:          serverTimestamp(),
    // Onboarding progress
    onboardingStep:     7,                  // 7 = CircleSetup (first post-auth step)
    onboardingComplete: false,
    // Profile fields filled in during onboarding
    phoneNumber:        "",
    phoneVerified:      false,
    emergencyBuddy:     null,               // { name, phone, contactId }
    cameraMountPosition: null,              // "dash-center"|"dash-left"|"visor"|"windshield"
    termsAcceptedAt:    null,
    // Settings
    quietHoursStart:    null,
    quietHoursEnd:      null,
  });

  // Invite code lookup — lets parents/others find a driver by code
  // without querying the full users collection (security)
  await setDoc(doc(db, "inviteCodes", inviteCode), { uid });

  return inviteCode;
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid, updates) {
  await upsertUserProfile(uid, updates);
}

// ── Onboarding step helpers ───────────────────────────────────────────────────

export async function updateOnboardingStep(uid, step) {
  await upsertUserProfile(uid, { onboardingStep: step });
}

export async function savePhoneVerified(uid, phoneNumber) {
  await upsertUserProfile(uid, {
    phoneNumber,
    phoneVerified: true,
    onboardingStep: 7,
  });
}

export async function saveEmergencyBuddy(uid, buddy) {
  await upsertUserProfile(uid, {
    emergencyBuddy: buddy,
    onboardingStep: 9,
  });
}

export async function saveCameraMount(uid, position) {
  await upsertUserProfile(uid, {
    cameraMountPosition: position,
    onboardingStep: 11,
  });
}

export async function completeOnboarding(uid) {
  await upsertUserProfile(uid, {
    onboardingComplete: true,
    onboardingStep:     13,
    termsAcceptedAt:    serverTimestamp(),
  });
}

// ── Family invite code linking ────────────────────────────────────────────────

// Returns "ok" | "not_found" | "already_linked" | "self_link"
export async function linkByInviteCode(parentUid, inviteCode) {
  const codeSnap = await getDoc(doc(db, "inviteCodes", inviteCode.toUpperCase()));
  if (!codeSnap.exists()) return "not_found";

  const driverUid = codeSnap.data().uid;
  if (driverUid === parentUid) return "self_link";

  const parentProfile = await getUserProfile(parentUid);
  if (parentProfile?.linkedUserIds?.includes(driverUid)) return "already_linked";

  await Promise.all([
    updateDoc(doc(db, "users", parentUid), { linkedUserIds: arrayUnion(driverUid) }),
    updateDoc(doc(db, "users", driverUid), { linkedUserIds: arrayUnion(parentUid) }),
  ]);

  return "ok";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateInviteCode(uid) {
  // 6-char alphanumeric, no ambiguous chars (0/O/1/I)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    const seed = uid.charCodeAt(i % uid.length) + i * 17;
    code += chars[seed % chars.length];
  }
  return code;
}
