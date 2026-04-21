import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import * as AppleAuthentication from "expo-apple-authentication";
import { signInWithGoogleCredential, signInWithAppleCredential } from "../../firebase/authService";
import OnboardingProgress from "../../components/OnboardingProgress";
import { Colors } from "../../theme/colors";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID     = "9439129388-2sl3fg66k16i7rv09ccfnktejbqrus26.apps.googleusercontent.com";
const GOOGLE_ANDROID_CLIENT_ID = "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com";
const GOOGLE_WEB_CLIENT_ID     = "9439129388-fqtn0kqjm6d8v3iqsvo4ebubrmiuargh.apps.googleusercontent.com";

// Step 3 — AuthEntry: email input + SSO buttons on one screen
export default function AuthMethodScreen({ navigation, route }) {
  const { firstName, lastName, age } = route.params;

  const [email, setEmail]   = useState("");
  const [loading, setLoading] = useState(null); // "google" | "apple" | null

  const proxyRedirectUri = makeRedirectUri({ useProxy: true });

  const [request, , googlePromptAsync] = Google.useAuthRequest({
    iosClientId:     GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId:     GOOGLE_WEB_CLIENT_ID,
    redirectUri:     proxyRedirectUri,
  });

  // DEBUG — remove once Google SSO is working
  console.log("[Google Auth] redirectUri:", request?.redirectUri);

  // ── Email path: just navigate forward with accumulated params ─────────────
  function handleEmailContinue() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    navigation.navigate("PhoneEntry", {
      firstName, lastName, age,
      email: trimmed,
      authPath: "email",
    });
  }

  // ── Google SSO: create account now, pass authPath:"sso" forward ──────────
  async function handleGoogle() {
    setLoading("google");
    try {
      const result = await googlePromptAsync();
      if (result?.type === "success") {
        const idToken = result.authentication?.idToken;
        if (!idToken) throw new Error("No id_token");
        await signInWithGoogleCredential(idToken, age, firstName, lastName);
        // AuthContext picks up new user — navigate forward with sso path
        navigation.navigate("PhoneEntry", {
          firstName, lastName, age,
          email: null,
          authPath: "sso",
        });
      } else if (result?.type !== "cancel") {
        Alert.alert("Google sign-in failed", "Please try again.");
      }
    } catch (err) {
      console.error("Google SSO error:", err);
      Alert.alert("Error", "Google sign-in failed. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  // ── Apple SSO ─────────────────────────────────────────────────────────────
  async function handleApple() {
    setLoading("apple");
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      await signInWithAppleCredential(credential.identityToken, age, firstName, lastName);
      navigation.navigate("PhoneEntry", {
        firstName, lastName, age,
        email: null,
        authPath: "sso",
      });
    } catch (err) {
      if (err.code !== "ERR_REQUEST_CANCELED") {
        console.error("Apple SSO error:", err);
        Alert.alert("Error", "Apple sign-in failed. Please try again.");
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <OnboardingProgress step={3} />

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.stepLabel}>Step 3 of 13</Text>
        <Text style={styles.title}>Create your{"\n"}account</Text>
        <Text style={styles.subtitle}>Hi {firstName}! How would you like to sign up?</Text>

        {/* SSO buttons */}
        <TouchableOpacity
          style={styles.ssoBtn}
          onPress={handleGoogle}
          disabled={!!loading}
          activeOpacity={0.8}
        >
          {loading === "google" ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.ssoIcon}>G</Text>
              <Text style={styles.ssoBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {Platform.OS === "ios" && (
          <TouchableOpacity
            style={[styles.ssoBtn, styles.appleBtn]}
            onPress={handleApple}
            disabled={!!loading}
            activeOpacity={0.8}
          >
            {loading === "apple" ? (
              <ActivityIndicator color={Colors.bgPrimary} />
            ) : (
              <>
                <Text style={styles.appleIcon}></Text>
                <Text style={[styles.ssoBtnText, styles.appleBtnText]}>Continue with Apple</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or use email</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email input */}
        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor={Colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={handleEmailContinue}
          returnKeyType="next"
        />

        <TouchableOpacity
          style={[styles.primaryBtn, (!email.trim() || !!loading) && styles.disabled]}
          onPress={handleEmailContinue}
          disabled={!email.trim() || !!loading}
        >
          <Text style={styles.primaryBtnText}>Continue with Email →</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          By continuing you agree to Notifeye's{" "}
          <Text style={styles.legalLink}>Terms of Service</Text> and{" "}
          <Text style={styles.legalLink}>Privacy Policy</Text>.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 40,
  },
  back:      { marginBottom: 20 },
  backText:  { color: Colors.textMuted, fontSize: 15 },
  stepLabel: { color: Colors.textMuted, fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  title:     { color: Colors.white, fontSize: 28, fontWeight: "800", lineHeight: 36, marginBottom: 8 },
  subtitle:  { color: Colors.textMuted, fontSize: 14, marginBottom: 28 },

  ssoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 10,
    gap: 10,
  },
  appleBtn:     { backgroundColor: Colors.white, borderColor: Colors.white },
  ssoIcon:      { color: Colors.white, fontSize: 18, fontWeight: "700" },
  appleIcon:    { color: Colors.bgPrimary, fontSize: 20 },
  ssoBtnText:   { color: Colors.white, fontSize: 15, fontWeight: "600" },
  appleBtnText: { color: Colors.bgPrimary },

  dividerRow:  { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#1a2a3a" },
  dividerText: { color: Colors.textMuted, marginHorizontal: 12, fontSize: 12 },

  input: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    borderRadius: 14,
    color: Colors.white,
    fontSize: 17,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  disabled:       { opacity: 0.35 },
  primaryBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 16 },
  legal:          { color: Colors.textMuted, fontSize: 11, textAlign: "center", marginTop: 24, lineHeight: 17 },
  legalLink:      { color: Colors.brandBlue },
});
