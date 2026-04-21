import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Contacts from "expo-contacts";
import { saveEmergencyBuddy } from "../../firebase/firestoreService";
import { useAuth } from "../../context/AuthContext";
import OnboardingProgress from "../../components/OnboardingProgress";
import { Colors } from "../../theme/colors";

export default function EmergencyBuddyScreen({ navigation }) {
  const { user, profile, refreshProfile } = useAuth();

  const [contacts, setContacts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [selected, setSelected]   = useState(null); // contact object

  useEffect(() => {
    (async () => {
      try {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        });
        const withPhone = data
          .filter((c) => c.name && c.phoneNumbers?.length)
          .sort((a, b) => a.name.localeCompare(b.name));
        setContacts(withPhone);
      } catch {
        Alert.alert("Couldn't load contacts", "Check contacts permission in Settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      const buddy = {
        name:      selected.name,
        phone:     selected.phoneNumbers[0].number,
        contactId: selected.id,
      };
      await saveEmergencyBuddy(user.uid, buddy);
      refreshProfile({ emergencyBuddy: buddy, onboardingStep: 9 });
      navigation.navigate("Permissions");
    } catch {
      Alert.alert("Error", "Could not save emergency buddy. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    navigation.navigate("Permissions");
  }

  return (
    <View style={styles.container}>
      <OnboardingProgress step={8} />
      <Text style={styles.step}>Step 8 of 13</Text>
      <Text style={styles.title}>Emergency{"\n"}buddy</Text>
      <Text style={styles.subtitle}>
        If something goes wrong on a drive, this person gets an immediate call.
        Choose someone who can reach you quickly.
      </Text>

      {loading ? (
        <ActivityIndicator color={Colors.brandBlue} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={contacts.slice(0, 50)}
          keyExtractor={(c) => c.id}
          style={styles.list}
          renderItem={({ item }) => {
            const isSelected = selected?.id === item.id;
            return (
              <TouchableOpacity
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => setSelected(item)}
                activeOpacity={0.8}
              >
                <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
                  <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactPhone} numberOfLines={1}>
                    {item.phoneNumbers[0].number}
                  </Text>
                </View>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity
        style={[styles.primaryBtn, (!selected || saving) && styles.disabled]}
        onPress={handleSave}
        disabled={!selected || saving}
      >
        {saving ? (
          <ActivityIndicator color={Colors.bgPrimary} />
        ) : (
          <Text style={styles.primaryBtnText}>Set as emergency buddy →</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    paddingHorizontal: 28,
    paddingTop: 72,
  },
  step:     { color: Colors.textMuted, fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  title:    { color: Colors.white, fontSize: 28, fontWeight: "800", lineHeight: 36, marginBottom: 10 },
  subtitle: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 24 },

  list: { flex: 1, marginBottom: 16 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  rowSelected: { backgroundColor: Colors.brandBlue + "18" },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
  },
  avatarSelected: { borderColor: Colors.brandBlue },
  avatarText:     { color: Colors.brandBlue, fontWeight: "700", fontSize: 17 },

  rowBody:      { flex: 1 },
  contactName:  { color: Colors.white, fontSize: 15, fontWeight: "600" },
  contactPhone: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  checkmark:    { color: Colors.brandBlue, fontSize: 18, fontWeight: "800" },

  primaryBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  disabled:       { opacity: 0.35 },
  primaryBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 15 },

  skipBtn: { alignItems: "center", marginTop: 14 },
  skipText: { color: Colors.textMuted, fontSize: 14 },
});
