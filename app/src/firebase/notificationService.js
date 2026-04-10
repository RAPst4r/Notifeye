import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { doc, updateDoc, setDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "./config";

// ── How notifications appear when the app is in the foreground ────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── Register device and get push token ───────────────────────────────────────
// Returns the Expo push token string, or null if permission denied / not a device.
// projectId comes from your EAS project — set in app.json once you run eas build.
export async function registerForPushNotifications(uid) {
  try {
    if (!Device.isDevice) {
      console.warn("[Notifications] Push tokens only work on physical devices.");
      return null;
    }

    // Request permission
    const { status: existing } = await Notifications.getPermissionsAsync();
    console.log("[Notifications] Existing permission status:", existing);
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.warn("[Notifications] Permission denied:", finalStatus);
      return null;
    }

    // Android requires a notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("notifeye", {
        name: "Notifeye Alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#00e5ff",
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    console.log("[Notifications] Using projectId:", projectId ?? "none (Expo Go default)");

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : {}
    );

    const token = tokenData.data;
    console.log("[Notifications] Got token:", token);
    await savePushToken(uid, token);
    console.log("[Notifications] Token saved to Firestore for uid:", uid);
    return token;
  } catch (err) {
    console.error("[Notifications] Failed to register:", err.message);
    return null;
  }
}

// ── Persist token to Firestore ────────────────────────────────────────────────
// Uses setDoc+merge so it works on existing accounts that predate this field.
export async function savePushToken(uid, token) {
  await setDoc(doc(db, "users", uid), {
    pushTokens: arrayUnion(token),
  }, { merge: true });
}

// ── Remove token on logout (so stale devices don't get notified) ──────────────
export async function removePushToken(uid) {
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : {}
    );
    await setDoc(doc(db, "users", uid), {
      pushTokens: arrayRemove(tokenData.data),
    }, { merge: true });
  } catch {
    // Token may already be gone — not a fatal error
  }
}
