import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import OnboardingProgress from "../../components/OnboardingProgress";
import { Colors } from "../../theme/colors";

const ROLES = [
  {
    id: "parent",
    icon: "👨‍👧",
    label: "Parent",
    description: "Stay notified when a teen driver in your circle needs attention.",
  },
  {
    id: "teen",
    icon: "🚗",
    label: "Teen",
    description: "Get real-time drowsiness alerts while you drive.",
  },
  {
    id: "relation",
    icon: "🤝",
    label: "Relation",
    description: "Watch over someone in your circle — a sibling, partner, or friend.",
  },
];

export default function RoleSelectScreen({ navigation }) {
  const [selected, setSelected] = useState(null);

  function handleContinue() {
    if (!selected) return;
    // Pass role as a param — Firestore write happens in AuthMethodScreen after
    // account creation so we don't create a partial profile if the user backs out.
    navigation.navigate("NameEntry", { role: selected });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.inner}
      keyboardShouldPersistTaps="handled"
    >
      <OnboardingProgress step={1} />
      <Text style={styles.step}>Step 1 of 13</Text>
      <Text style={styles.title}>How will you{"\n"}use Notifeye?</Text>
      <Text style={styles.subtitle}>Choose the option that best describes you.</Text>

      {ROLES.map((role) => (
        <TouchableOpacity
          key={role.id}
          style={[styles.card, selected === role.id && styles.cardSelected]}
          onPress={() => setSelected(role.id)}
          activeOpacity={0.8}
        >
          <View style={styles.cardRow}>
            <Text style={styles.cardIcon}>{role.icon}</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardLabel}>{role.label}</Text>
              <Text style={styles.cardDesc}>{role.description}</Text>
            </View>
            <View style={[styles.radio, selected === role.id && styles.radioSelected]} />
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.primaryBtn, !selected && styles.disabled]}
        onPress={handleContinue}
        disabled={!selected}
      >
        <Text style={styles.primaryBtnText}>Continue →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  inner: { paddingHorizontal: 28, paddingTop: 72, paddingBottom: 40 },
  step:     { color: Colors.textMuted, fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  title:    { color: Colors.white, fontSize: 28, fontWeight: "800", lineHeight: 36, marginBottom: 10 },
  subtitle: { color: Colors.textMuted, fontSize: 14, marginBottom: 36 },

  card: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  cardSelected: { borderColor: Colors.brandBlue },
  cardRow:  { flexDirection: "row", alignItems: "center" },
  cardIcon: { fontSize: 26, marginRight: 14 },
  cardText: { flex: 1 },
  cardLabel: { color: Colors.white, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  cardDesc:  { color: Colors.textMuted, fontSize: 13, lineHeight: 18 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#2a3a4a",
    marginLeft: 12,
  },
  radioSelected: { borderColor: Colors.brandBlue, backgroundColor: Colors.brandBlue },

  primaryBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  disabled: { opacity: 0.35 },
  primaryBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 16 },
});
