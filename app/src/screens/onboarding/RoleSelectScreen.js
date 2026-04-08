import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { updateUserProfile } from "../../firebase/firestoreService";
import { useAuth } from "../../context/AuthContext";

const ROLES = [
  {
    id: "driver",
    label: "Driver",
    description: "I want real-time drowsiness alerts while I drive.",
  },
  {
    id: "parent",
    label: "Parent / Guardian",
    description: "I want to be notified when a driver I'm linked to gets an alert.",
  },
];

export default function RoleSelectScreen({ navigation }) {
  const { user, refreshProfile } = useAuth();
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!selected) {
      Alert.alert("Select a role", "Choose how you'll use Notifeye.");
      return;
    }
    setLoading(true);
    try {
      await updateUserProfile(user.uid, { role: selected });
      refreshProfile({ role: selected });
      navigation.navigate("ProfileSetup");
    } catch {
      Alert.alert("Error", "Could not save your role. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.step}>Step 1 of 3</Text>
      <Text style={styles.title}>How will you use Notifeye?</Text>

      {ROLES.map((role) => (
        <TouchableOpacity
          key={role.id}
          style={[styles.card, selected === role.id && styles.cardSelected]}
          onPress={() => setSelected(role.id)}
          activeOpacity={0.8}
        >
          <View style={styles.cardRow}>
            <View style={[styles.radio, selected === role.id && styles.radioSelected]} />
            <View style={styles.cardText}>
              <Text style={styles.cardLabel}>{role.label}</Text>
              <Text style={styles.cardDesc}>{role.description}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.primaryBtn, (!selected || loading) && styles.disabled]}
        onPress={handleContinue}
        disabled={!selected || loading}
      >
        {loading ? (
          <ActivityIndicator color="#0a0a0a" />
        ) : (
          <Text style={styles.primaryBtnText}>Continue</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    paddingHorizontal: 32,
    paddingTop: 72,
  },
  step: { color: "#444", fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  title: { color: "#fff", fontSize: 24, fontWeight: "700", marginBottom: 36 },
  card: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    padding: 20,
    marginBottom: 14,
  },
  cardSelected: { borderColor: "#00e5ff" },
  cardRow: { flexDirection: "row", alignItems: "flex-start" },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#444",
    marginRight: 14,
    marginTop: 2,
  },
  radioSelected: { borderColor: "#00e5ff", backgroundColor: "#00e5ff" },
  cardText: { flex: 1 },
  cardLabel: { color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 4 },
  cardDesc: { color: "#666", fontSize: 13, lineHeight: 18 },
  primaryBtn: {
    backgroundColor: "#00e5ff",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  disabled: { opacity: 0.4 },
  primaryBtnText: { color: "#0a0a0a", fontWeight: "700", fontSize: 15 },
});
