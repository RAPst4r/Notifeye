import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import { makeRedirectUri } from "expo-auth-session";
import { signIn, resetPassword, signInWithGoogleCredential, signInWithAppleCredential } from "../../firebase/authService";
import { Colors } from "../../theme/colors";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID     = "9439129388-2sl3fg66k16i7rv09ccfnktejbqrus26.apps.googleusercontent.com";
const GOOGLE_ANDROID_CLIENT_ID = "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com";
const GOOGLE_WEB_CLIENT_ID     = "9439129388-fqtn0kqjm6d8v3iqsvo4ebubrmiuargh.apps.googleusercontent.com";

export default function LoginScreen({ navigation }) {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(null); // "email" | "google" | "apple" | null

  const redirectUri = makeRedirectUri({ useProxy: true });

  const [, , googlePromptAsync] = Google.useAuthRequest({
    iosClientId:     GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId:     GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  });

  console.log("[Google Auth - Login] redirectUri:", redirectUri);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    setLoading("email");
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      Alert.alert("Login failed", friendlyError(err.code));
    } finally {
      setLoading(null);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      Alert.alert("Enter your email", "Type your email above, then tap Forgot password.");
      return;
    }
    try {
      await resetPassword(email.trim());
      Alert.alert("Email sent", "Check your inbox for a password reset link.");
    } catch (err) {
      Alert.alert("Error", friendlyError(err.code));
    }
  }

  async function handleGoogle() {
    setLoading("google");
    try {
      const result = await googlePromptAsync();
      if (result?.type === "success") {
        const idToken = result.authentication?.idToken;
        if (!idToken) throw new Error("No id_token");
        // Existing users: role not needed (profile already exists)
        await signInWithGoogleCredential(idToken, null);
      } else if (result?.type !== "cancel") {
        Alert.alert("Google sign-in failed", "Please try again.");
      }
    } catch (err) {
      console.error("Google login error:", err);
      Alert.alert("Error", "Google sign-in failed. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function handleApple() {
    setLoading("apple");
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      await signInWithAppleCredential(credential.identityToken, credential.fullName, null);
    } catch (err) {
      if (err.code !== "ERR_REQUEST_CANCELED") {
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
        <Text style={styles.wordmark}>Notifeye</Text>
        <Text style={styles.tagline}>Drive into a safer future.</Text>

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
          <Text style={styles.dividerText}>or sign in with email</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email / password */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity
          style={[styles.primaryBtn, (loading === "email") && styles.disabled]}
          onPress={handleLogin}
          disabled={!!loading}
        >
          {loading === "email" ? (
            <ActivityIndicator color={Colors.bgPrimary} />
          ) : (
            <Text style={styles.primaryBtnText}>Log in</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleForgotPassword} style={styles.link}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate("NameEntry")}
        >
          <Text style={styles.secondaryBtnText}>Create account →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function friendlyError(code) {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    default:
      return "Something went wrong. Please try again.";
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  inner: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 48,
    paddingTop: 60,
  },
  wordmark: { color: Colors.brandBlue, fontSize: 36, fontWeight: "800", letterSpacing: 1, marginBottom: 6 },
  tagline:  { color: Colors.textMuted, fontSize: 14, marginBottom: 40 },

  ssoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 10,
    gap: 10,
  },
  appleBtn:     { backgroundColor: Colors.white, borderColor: Colors.white },
  ssoIcon:      { color: Colors.white, fontSize: 17, fontWeight: "700" },
  appleIcon:    { color: Colors.bgPrimary, fontSize: 19 },
  ssoBtnText:   { color: Colors.white, fontSize: 15, fontWeight: "600" },
  appleBtnText: { color: Colors.bgPrimary },

  dividerRow:  { flexDirection: "row", alignItems: "center", marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#1a2a3a" },
  dividerText: { color: Colors.textMuted, marginHorizontal: 10, fontSize: 12 },

  input: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    borderRadius: 12,
    color: Colors.white,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  primaryBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  disabled:       { opacity: 0.5 },
  primaryBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 15 },
  link:     { alignItems: "center", marginTop: 16 },
  linkText: { color: Colors.textMuted, fontSize: 13 },
  divider:  { height: 1, backgroundColor: "#1a2a3a", marginVertical: 24 },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  secondaryBtnText: { color: Colors.textMuted, fontSize: 15, fontWeight: "600" },
});
