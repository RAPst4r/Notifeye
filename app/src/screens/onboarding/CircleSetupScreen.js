import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import * as Contacts from "expo-contacts";
import { linkByInviteCode, updateOnboardingStep } from "../../firebase/firestoreService";
import { useAuth } from "../../context/AuthContext";
import OnboardingProgress from "../../components/OnboardingProgress";
import { Colors } from "../../theme/colors";

export default function CircleSetupScreen({ navigation }) {
  const { user, profile, refreshProfile } = useAuth();

  const [tab, setTab]               = useState("code");  // "code" | "contacts"
  const [code, setCode]             = useState("");
  const [linking, setLinking]       = useState(false);
  const [contacts, setContacts]     = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [invitedIds, setInvitedIds] = useState(new Set());

  async function loadContacts() {
    setContactsLoading(true);
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });
      // Only contacts with phone numbers, sorted by name
      const withPhone = data
        .filter((c) => c.name && c.phoneNumbers?.length)
        .sort((a, b) => a.name.localeCompare(b.name));
      setContacts(withPhone);
    } catch {
      Alert.alert("Couldn't load contacts", "Check contacts permission in Settings.");
    } finally {
      setContactsLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "contacts" && contacts.length === 0) loadContacts();
  }, [tab]);

  async function handleLinkByCode() {
    if (code.trim().length !== 6) {
      Alert.alert("Invalid code", "Invite codes are 6 characters.");
      return;
    }
    setLinking(true);
    try {
      const result = await linkByInviteCode(user.uid, code.trim());
      if (result === "ok") {
        Alert.alert("Linked!", "You're now connected.");
        setCode("");
      } else if (result === "not_found") {
        Alert.alert("Code not found", "Double-check the code and try again.");
      } else if (result === "already_linked") {
        Alert.alert("Already linked", "You're already connected to this person.");
      } else if (result === "self_link") {
        Alert.alert("Invalid", "You can't link to yourself.");
      }
    } catch {
      Alert.alert("Error", "Could not link. Please try again.");
    } finally {
      setLinking(false);
    }
  }

  function handleInviteContact(contact) {
    setInvitedIds((prev) => new Set(prev).add(contact.id));
    Alert.alert(
      "Invite sent",
      `We'll send ${contact.name} an SMS invite when messaging is set up.`
    );
  }

  async function handleContinue() {
    try {
      await updateOnboardingStep(user.uid, 7);
      refreshProfile({ onboardingStep: 7 });
    } catch { /* non-blocking */ }
    navigation.navigate("EmergencyBuddy");
  }

  const myCode = profile?.inviteCode ?? "——";

  return (
    <View style={styles.container}>
      <OnboardingProgress step={7} />
      <Text style={styles.step}>Step 7 of 13</Text>
      <Text style={styles.title}>Build your{"\n"}circle</Text>
      <Text style={styles.subtitle}>
        Connect with family and friends who'll watch over you.
      </Text>

      {/* My invite code */}
      <View style={styles.myCodeBox}>
        <Text style={styles.myCodeLabel}>YOUR INVITE CODE</Text>
        <Text style={styles.myCode}>{myCode}</Text>
        <Text style={styles.myCodeHint}>Share this so others can link to you</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "code" && styles.tabActive]}
          onPress={() => setTab("code")}
        >
          <Text style={[styles.tabText, tab === "code" && styles.tabTextActive]}>
            Enter code
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "contacts" && styles.tabActive]}
          onPress={() => setTab("contacts")}
        >
          <Text style={[styles.tabText, tab === "contacts" && styles.tabTextActive]}>
            From contacts
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "code" ? (
        <View>
          <TextInput
            style={styles.codeInput}
            placeholder="XXXXXX"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
            maxLength={6}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
          />
          <TouchableOpacity
            style={[styles.linkBtn, (code.length !== 6 || linking) && styles.disabled]}
            onPress={handleLinkByCode}
            disabled={code.length !== 6 || linking}
          >
            {linking ? (
              <ActivityIndicator color={Colors.bgPrimary} />
            ) : (
              <Text style={styles.linkBtnText}>Link</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : contactsLoading ? (
        <ActivityIndicator color={Colors.brandBlue} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={contacts.slice(0, 20)}
          keyExtractor={(c) => c.id}
          style={styles.contactList}
          renderItem={({ item }) => (
            <View style={styles.contactRow}>
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>{item.name[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
              <TouchableOpacity
                style={[
                  styles.inviteBtn,
                  invitedIds.has(item.id) && styles.invitedBtn,
                ]}
                onPress={() => handleInviteContact(item)}
                disabled={invitedIds.has(item.id)}
              >
                <Text style={[
                  styles.inviteBtnText,
                  invitedIds.has(item.id) && styles.invitedBtnText,
                ]}>
                  {invitedIds.has(item.id) ? "Invited ✓" : "Invite"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
        <Text style={styles.continueBtnText}>Continue →</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleContinue} style={styles.skipBtn}>
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
  subtitle: { color: Colors.textMuted, fontSize: 14, marginBottom: 24 },

  myCodeBox: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.brandBlue + "44",
    padding: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  myCodeLabel: { color: Colors.brandBlue, fontSize: 10, letterSpacing: 2, marginBottom: 6 },
  myCode:      { color: Colors.white, fontSize: 26, fontWeight: "800", letterSpacing: 8, marginBottom: 4 },
  myCodeHint:  { color: Colors.textMuted, fontSize: 11 },

  tabs: { flexDirection: "row", marginBottom: 20, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: "#1a2a3a",
  },
  tabActive:     { borderColor: Colors.brandBlue, backgroundColor: Colors.brandBlue + "22" },
  tabText:       { color: Colors.textMuted, fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: Colors.brandBlue },

  codeInput: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    borderRadius: 14,
    color: Colors.brandBlue,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 12,
    textAlign: "center",
    paddingVertical: 16,
    marginBottom: 12,
  },
  linkBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  linkBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 15 },
  disabled:    { opacity: 0.35 },

  contactList: { maxHeight: 200 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#0f1f2a",
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contactAvatarText: { color: Colors.brandBlue, fontWeight: "700" },
  contactName: { flex: 1, color: Colors.white, fontSize: 14 },
  inviteBtn: {
    borderWidth: 1,
    borderColor: Colors.brandBlue,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  invitedBtn:     { borderColor: Colors.textMuted },
  inviteBtnText:  { color: Colors.brandBlue, fontSize: 12, fontWeight: "600" },
  invitedBtnText: { color: Colors.textMuted },

  continueBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  continueBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 16 },
  skipBtn: { alignItems: "center", marginTop: 14 },
  skipText: { color: Colors.textMuted, fontSize: 14 },
});
