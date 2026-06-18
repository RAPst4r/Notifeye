import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Colors } from "../../theme/colors";
import { logOut } from "../../firebase/authService";

export default function ProfileScreen() {
  async function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: logOut },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profile — coming soon</Text>
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary, alignItems: "center", justifyContent: "center" },
  text: { color: Colors.textMuted, fontSize: 14, marginBottom: 32 },
  signOutBtn: {
    borderWidth: 1.5,
    borderColor: Colors.alert,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 40,
  },
  signOutText: { color: Colors.alert, fontSize: 15, fontWeight: "600" },
});
