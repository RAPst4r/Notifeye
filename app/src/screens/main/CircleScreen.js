import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import * as Contacts from "expo-contacts";
import { saveCircles } from "../../firebase/firestoreService";
import { useAuth } from "../../context/AuthContext";
import { Colors } from "../../theme/colors";

const EMOJIS = ["🏠", "⚡", "🎓", "🏓", "✨", "🏆", "🎵", "💪", "🌍", "🚀", "🔥", "🤝"];

function PeopleIcon({ size = 44, color = Colors.brandBlue }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={1.5} />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function CircleScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const savedCircles = profile?.circles ?? [];

  // "list" | "creating" | "contacts-perm" | "invite"
  const [subState, setSubState]               = useState("list");
  const [circles, setCircles]                 = useState(savedCircles);
  const [highlightId, setHighlightId]         = useState(null);
  const [circleName, setCircleName]           = useState("");
  const [circleEmoji, setCircleEmoji]         = useState("🏠");
  const [activeCircle, setActiveCircle]       = useState(null);
  const [contactsGranted, setContactsGranted] = useState(false);
  const [contacts, setContacts]               = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [searchQuery, setSearchQuery]         = useState("");
  const [invitedIds, setInvitedIds]           = useState(new Set());
  const [manualName, setManualName]           = useState("");
  const [manualPhone, setManualPhone]         = useState("");

  const pulseAnim = useRef(new Animated.Value(0)).current;

  function triggerPulse() {
    pulseAnim.setValue(0);
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 700, useNativeDriver: false }),
    ]).start(() => setHighlightId(null));
  }

  function handleConfirmCircle() {
    const name = circleName.trim();
    if (!name) return;
    const newCircle = { id: Date.now().toString(), name, emoji: circleEmoji, members: [] };
    const updated = [...circles, newCircle];
    setCircles(updated);
    setHighlightId(newCircle.id);
    setCircleName("");
    setCircleEmoji("🏠");
    saveCircles(user.uid, updated)
      .then(() => refreshProfile({ circles: updated }))
      .catch(() => {});
    requestAnimationFrame(() => { setSubState("list"); triggerPulse(); });
  }

  function handleCircleTap(circle) {
    setActiveCircle(circle);
    setInvitedIds(new Set());
    setSearchQuery("");
    setSubState("contacts-perm");
  }

  async function handleAllowContacts() {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      const granted = status === "granted";
      setContactsGranted(granted);
      if (granted) await loadContacts();
    } catch { setContactsGranted(false); }
    setSubState("invite");
  }

  async function loadContacts() {
    setContactsLoading(true);
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
    } finally { setContactsLoading(false); }
  }

  function handleInviteContact(contact) {
    setInvitedIds((prev) => new Set(prev).add(contact.id));
    setActiveCircle((prev) => ({
      ...prev,
      members: [...prev.members, {
        id: contact.id, name: contact.name, phone: contact.phoneNumbers[0].number,
      }],
    }));
  }

  function handleAddManual() {
    if (!manualName.trim()) return;
    const member = { id: Date.now().toString(), name: manualName.trim(), phone: manualPhone.trim() };
    setActiveCircle((prev) => ({ ...prev, members: [...prev.members, member] }));
    setManualName("");
    setManualPhone("");
  }

  function handleInviteDone() {
    const updated = circles.map((c) => (c.id === activeCircle.id ? activeCircle : c));
    setCircles(updated);
    saveCircles(user.uid, updated)
      .then(() => refreshProfile({ circles: updated }))
      .catch(() => {});
    setSubState("list");
  }

  const filteredContacts = searchQuery.trim()
    ? contacts.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : contacts;

  const pulseBorder = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#1a2a3a", Colors.brandBlue],
  });

  // ── RENDER: List ──────────────────────────────────────────────────────────────
  if (subState === "list") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.container}>
          <Text style={styles.screenTitle}>Your Circles</Text>

          {circles.length === 0 ? (
            <>
              <View style={styles.emptyWrap}>
                <View style={styles.emptyRing}>
                  <Text style={styles.emptyRingPlus}>+</Text>
                </View>
                <Text style={styles.emptyLabel}>No circles yet. Create one to get started.</Text>
              </View>
              <View style={styles.bottomArea}>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setSubState("creating")} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>+ Create a Circle</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {circles.map((circle) => {
                const isNew = circle.id === highlightId;
                const memberLabel = circle.members.length === 0
                  ? "Tap to add members"
                  : `${circle.members.length} member${circle.members.length !== 1 ? "s" : ""}`;

                if (isNew) {
                  return (
                    <Animated.View key={circle.id} style={[styles.circleCard, { borderColor: pulseBorder }]}>
                      <TouchableOpacity style={styles.circleCardInner} onPress={() => handleCircleTap(circle)} activeOpacity={0.8}>
                        <Text style={styles.circleEmoji}>{circle.emoji}</Text>
                        <View style={styles.circleCardBody}>
                          <Text style={styles.circleCardName}>{circle.name}</Text>
                          <Text style={styles.circleCardSub}>{memberLabel}</Text>
                        </View>
                        <Text style={styles.chevron}>›</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                }
                return (
                  <TouchableOpacity key={circle.id} style={styles.circleCard} onPress={() => handleCircleTap(circle)} activeOpacity={0.8}>
                    <Text style={styles.circleEmoji}>{circle.emoji}</Text>
                    <View style={styles.circleCardBody}>
                      <Text style={styles.circleCardName}>{circle.name}</Text>
                      <Text style={styles.circleCardSub}>{memberLabel}</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity style={styles.ghostBtn} onPress={() => setSubState("creating")} activeOpacity={0.8}>
                <Text style={styles.ghostBtnText}>+ Create another Circle</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── RENDER: Creating ──────────────────────────────────────────────────────────
  if (subState === "creating") {
    const canCreate = circleName.trim().length > 0;
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.container}>
            <TouchableOpacity onPress={() => setSubState("list")} style={styles.back}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>New Circle</Text>
            <Text style={styles.subtitle}>Give your circle a name and icon.</Text>

            <TextInput
              style={styles.nameInput}
              placeholder="Circle name (e.g. Family)"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              value={circleName}
              onChangeText={setCircleName}
              returnKeyType="done"
              onSubmitEditing={handleConfirmCircle}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow} contentContainerStyle={styles.emojiRowContent}>
              {EMOJIS.map((e) => (
                <TouchableOpacity key={e} style={[styles.emojiChip, circleEmoji === e && styles.emojiChipSelected]} onPress={() => setCircleEmoji(e)} activeOpacity={0.7}>
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.bottomArea}>
              <TouchableOpacity style={[styles.primaryBtn, !canCreate && styles.disabled]} onPress={handleConfirmCircle} disabled={!canCreate} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Create Circle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── RENDER: Contacts permission ───────────────────────────────────────────────
  if (subState === "contacts-perm") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => setSubState("list")} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Find your{"\n"}people</Text>
          <Text style={styles.subtitle}>
            Give Notifeye access to your contacts to quickly add members to your{" "}
            <Text style={{ color: Colors.brandBlue, fontWeight: "700" }}>{activeCircle?.name}</Text> circle.
          </Text>
          <View style={styles.iconCircle}>
            <PeopleIcon size={44} color={Colors.brandBlue} />
          </View>
          <View style={styles.bottomArea}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleAllowContacts} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Allow access</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setContactsGranted(false); setSubState("invite"); }} style={styles.skipBtn}>
              <Text style={styles.skipText}>Enter manually instead</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── RENDER: Invite ────────────────────────────────────────────────────────────
  if (subState === "invite") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.container}>
            <TouchableOpacity onPress={() => setSubState("contacts-perm")} style={styles.back}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Add to {activeCircle?.name}</Text>
            <Text style={styles.subtitle}>Invite people to join your circle.</Text>

            {contactsGranted ? (
              <>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search contacts..."
                  placeholderTextColor={Colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                />
                {contactsLoading ? (
                  <ActivityIndicator color={Colors.brandBlue} style={{ marginTop: 24 }} />
                ) : (
                  <FlatList
                    data={filteredContacts}
                    keyExtractor={(c) => c.id}
                    style={{ flex: 1 }}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => {
                      const invited = invitedIds.has(item.id);
                      return (
                        <View style={styles.contactRow}>
                          <View style={styles.contactAvatar}>
                            <Text style={styles.contactAvatarText}>{item.name[0].toUpperCase()}</Text>
                          </View>
                          <View style={styles.contactRowBody}>
                            <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.contactPhone} numberOfLines={1}>{item.phoneNumbers[0].number}</Text>
                          </View>
                          <TouchableOpacity style={[styles.inviteChip, invited && styles.inviteChipDone]} onPress={() => handleInviteContact(item)} disabled={invited}>
                            <Text style={[styles.inviteChipText, invited && styles.inviteChipTextDone]}>{invited ? "Added ✓" : "Invite"}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    }}
                  />
                )}
              </>
            ) : (
              <View style={{ flex: 1 }}>
                <TextInput style={styles.nameInput} placeholder="Name" placeholderTextColor={Colors.textMuted} autoFocus value={manualName} onChangeText={setManualName} returnKeyType="next" />
                <TextInput style={[styles.nameInput, { marginTop: 10 }]} placeholder="Phone number" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" value={manualPhone} onChangeText={setManualPhone} returnKeyType="done" onSubmitEditing={handleAddManual} />
                <TouchableOpacity style={[styles.ghostBtn, { marginTop: 12 }]} onPress={handleAddManual} disabled={!manualName.trim()} activeOpacity={0.8}>
                  <Text style={styles.ghostBtnText}>+ Add member</Text>
                </TouchableOpacity>

                {activeCircle?.members.length > 0 && (
                  <View style={{ marginTop: 20 }}>
                    {activeCircle.members.map((m) => (
                      <View key={m.id} style={styles.addedRow}>
                        <View style={styles.contactAvatar}>
                          <Text style={styles.contactAvatarText}>{m.name[0].toUpperCase()}</Text>
                        </View>
                        <View style={styles.contactRowBody}>
                          <Text style={styles.contactName}>{m.name}</Text>
                          {!!m.phone && <Text style={styles.contactPhone}>{m.phone}</Text>}
                        </View>
                        <Text style={styles.addedCheck}>✓</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.bottomArea}>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleInviteDone} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 16,
  },

  back:     { marginBottom: 16 },
  backText: { color: Colors.textMuted, fontSize: 15 },

  screenTitle: { color: Colors.white, fontSize: 28, fontWeight: "800", lineHeight: 36, marginBottom: 10 },
  subtitle:    { color: Colors.textMuted, fontSize: 14, marginBottom: 24 },

  // ── Empty state ───────────────────────────────────────────────────────────────
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: Colors.brandBlue + "44",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyRingPlus: { color: Colors.brandBlue, fontSize: 36, fontWeight: "300" },
  emptyLabel:    { color: Colors.textMuted, fontSize: 13, textAlign: "center" },

  // ── Inputs ────────────────────────────────────────────────────────────────────
  nameInput: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    borderRadius: 14,
    color: Colors.white,
    fontSize: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    borderRadius: 12,
    color: Colors.white,
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 12,
  },

  // ── Emoji row ─────────────────────────────────────────────────────────────────
  emojiRow:        { flexGrow: 0, marginBottom: 24 },
  emojiRowContent: { gap: 8, paddingRight: 8 },
  emojiChip: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiChipSelected: {
    borderColor: Colors.brandBlue,
    backgroundColor: Colors.brandBlue + "18",
  },
  emojiText: { fontSize: 24 },

  // ── Circle cards ──────────────────────────────────────────────────────────────
  circleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgSecondary,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    padding: 16,
    marginBottom: 10,
  },
  circleCardInner: { flexDirection: "row", alignItems: "center", flex: 1 },
  circleEmoji:     { fontSize: 28, marginRight: 14 },
  circleCardBody:  { flex: 1 },
  circleCardName:  { color: Colors.white, fontSize: 16, fontWeight: "700", marginBottom: 2 },
  circleCardSub:   { color: Colors.textMuted, fontSize: 12 },
  chevron:         { color: Colors.textMuted, fontSize: 22 },

  // ── Ghost button ──────────────────────────────────────────────────────────────
  ghostBtn: {
    borderWidth: 1.5,
    borderColor: Colors.brandBlue + "66",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  ghostBtnText: { color: Colors.brandBlue, fontWeight: "700", fontSize: 15 },

  // ── Contacts ──────────────────────────────────────────────────────────────────
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1a2a3a",
  },
  contactAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contactAvatarText: { color: Colors.brandBlue, fontWeight: "700", fontSize: 15 },
  contactRowBody:    { flex: 1 },
  contactName:  { color: Colors.white, fontSize: 14, fontWeight: "600" },
  contactPhone: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
  inviteChip: {
    borderWidth: 1,
    borderColor: Colors.brandBlue,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  inviteChipDone:     { borderColor: Colors.textMuted },
  inviteChipText:     { color: Colors.brandBlue, fontSize: 12, fontWeight: "600" },
  inviteChipTextDone: { color: Colors.textMuted },

  addedRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  addedCheck: { color: Colors.safe, fontSize: 16, fontWeight: "700" },

  // ── Contacts permission icon ──────────────────────────────────────────────────
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 32,
    borderWidth: 1.5,
    borderColor: Colors.brandBlue + "44",
  },

  // ── Shared bottom area ────────────────────────────────────────────────────────
  bottomArea: { paddingBottom: 40, paddingTop: 12 },

  primaryBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  disabled:       { opacity: 0.35 },
  primaryBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 16 },

  skipBtn:  { alignItems: "center", marginTop: 16 },
  skipText: { color: Colors.textMuted, fontSize: 14 },
});
