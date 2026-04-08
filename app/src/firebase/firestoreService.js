import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { db } from "./config";

// ── User profile ──────────────────────────────────────────────────────────────

export async function createUserProfile(uid, { email, name, role }) {
  const inviteCode = generateInviteCode(uid);

  // Create user profile
  await setDoc(doc(db, "users", uid), {
    uid,
    email,
    name,
    role,               // "driver" | "parent" | null (set during onboarding)
    subscriptionTier: "free",
    linkedUserIds: [],
    inviteCode,
    createdAt: serverTimestamp(),
    quietHoursStart: null,
    quietHoursEnd: null,
  });

  // Create invite code lookup entry — allows parents to find a driver by code
  // without needing to query the full users collection (security)
  await setDoc(doc(db, "inviteCodes", inviteCode), { uid });

  return inviteCode;
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid, updates) {
  await updateDoc(doc(db, "users", uid), updates);
}

// ── Family invite code linking ────────────────────────────────────────────────

// Returns "ok" | "not_found" | "already_linked" | "self_link"
export async function linkByInviteCode(parentUid, inviteCode) {
  // Look up driver UID from the dedicated inviteCodes collection (no PII exposed)
  const codeSnap = await getDoc(doc(db, "inviteCodes", inviteCode.toUpperCase()));
  if (!codeSnap.exists()) return "not_found";

  const driverUid = codeSnap.data().uid;
  if (driverUid === parentUid) return "self_link";

  const parentProfile = await getUserProfile(parentUid);
  if (parentProfile?.linkedUserIds?.includes(driverUid)) return "already_linked";

  // Link both directions using arrayUnion (safe under concurrent writes)
  await Promise.all([
    updateDoc(doc(db, "users", parentUid), { linkedUserIds: arrayUnion(driverUid) }),
    updateDoc(doc(db, "users", driverUid), { linkedUserIds: arrayUnion(parentUid) }),
  ]);

  return "ok";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateInviteCode(uid) {
  // 6-char alphanumeric, no ambiguous chars (0/O/1/I), easy to share verbally
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    const seed = uid.charCodeAt(i % uid.length) + i * 17;
    code += chars[seed % chars.length];
  }
  return code;
}
