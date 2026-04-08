import React, { useState } from "react";
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
} from "react-native";
import { signIn } from "../../firebase/authService";
import { resetPassword } from "../../firebase/authService";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // AuthContext listener picks up the new user — navigator re-renders automatically
    } catch (err) {
      Alert.alert("Login failed", friendlyError(err.code));
    } finally {
      setLoading(false);
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.wordmark}>Notifeye</Text>
        <Text style={styles.tagline}>Drive into a safer future.</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#555"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#555"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.disabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0a0a0a" />
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
          onPress={() => navigation.navigate("SignUp")}
        >
          <Text style={styles.secondaryBtnText}>Create account</Text>
        </TouchableOpacity>
      </View>
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
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  wordmark: {
    color: "#00e5ff",
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 6,
  },
  tagline: {
    color: "#555",
    fontSize: 14,
    marginBottom: 48,
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 10,
    color: "#fff",
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: "#00e5ff",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  disabled: { opacity: 0.5 },
  primaryBtnText: { color: "#0a0a0a", fontWeight: "700", fontSize: 15 },
  link: { alignItems: "center", marginTop: 16 },
  linkText: { color: "#555", fontSize: 13 },
  divider: { height: 1, backgroundColor: "#1e1e1e", marginVertical: 28 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#aaa", fontSize: 15 },
});
