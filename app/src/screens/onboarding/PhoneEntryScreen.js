import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Keyboard,
} from "react-native";
import { signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../../firebase/config";
import OnboardingProgress from "../../components/OnboardingProgress";
import { Colors } from "../../theme/colors";

const COUNTRIES = [
  { flag: "🇦🇫", name: "Afghanistan",            dial: "+93" },
  { flag: "🇦🇱", name: "Albania",                 dial: "+355" },
  { flag: "🇩🇿", name: "Algeria",                 dial: "+213" },
  { flag: "🇦🇷", name: "Argentina",               dial: "+54" },
  { flag: "🇦🇲", name: "Armenia",                 dial: "+374" },
  { flag: "🇦🇺", name: "Australia",               dial: "+61" },
  { flag: "🇦🇹", name: "Austria",                 dial: "+43" },
  { flag: "🇦🇿", name: "Azerbaijan",              dial: "+994" },
  { flag: "🇧🇭", name: "Bahrain",                 dial: "+973" },
  { flag: "🇧🇩", name: "Bangladesh",              dial: "+880" },
  { flag: "🇧🇪", name: "Belgium",                 dial: "+32" },
  { flag: "🇧🇴", name: "Bolivia",                 dial: "+591" },
  { flag: "🇧🇦", name: "Bosnia & Herzegovina",    dial: "+387" },
  { flag: "🇧🇷", name: "Brazil",                  dial: "+55" },
  { flag: "🇧🇬", name: "Bulgaria",                dial: "+359" },
  { flag: "🇰🇭", name: "Cambodia",                dial: "+855" },
  { flag: "🇨🇲", name: "Cameroon",                dial: "+237" },
  { flag: "🇨🇦", name: "Canada",                  dial: "+1" },
  { flag: "🇨🇱", name: "Chile",                   dial: "+56" },
  { flag: "🇨🇳", name: "China",                   dial: "+86" },
  { flag: "🇨🇴", name: "Colombia",                dial: "+57" },
  { flag: "🇨🇷", name: "Costa Rica",              dial: "+506" },
  { flag: "🇭🇷", name: "Croatia",                 dial: "+385" },
  { flag: "🇨🇺", name: "Cuba",                    dial: "+53" },
  { flag: "🇨🇾", name: "Cyprus",                  dial: "+357" },
  { flag: "🇨🇿", name: "Czech Republic",          dial: "+420" },
  { flag: "🇩🇰", name: "Denmark",                 dial: "+45" },
  { flag: "🇩🇴", name: "Dominican Republic",      dial: "+1" },
  { flag: "🇪🇨", name: "Ecuador",                 dial: "+593" },
  { flag: "🇪🇬", name: "Egypt",                   dial: "+20" },
  { flag: "🇸🇻", name: "El Salvador",             dial: "+503" },
  { flag: "🇪🇪", name: "Estonia",                 dial: "+372" },
  { flag: "🇪🇹", name: "Ethiopia",                dial: "+251" },
  { flag: "🇫🇮", name: "Finland",                 dial: "+358" },
  { flag: "🇫🇷", name: "France",                  dial: "+33" },
  { flag: "🇬🇪", name: "Georgia",                 dial: "+995" },
  { flag: "🇩🇪", name: "Germany",                 dial: "+49" },
  { flag: "🇬🇭", name: "Ghana",                   dial: "+233" },
  { flag: "🇬🇷", name: "Greece",                  dial: "+30" },
  { flag: "🇬🇹", name: "Guatemala",               dial: "+502" },
  { flag: "🇭🇳", name: "Honduras",                dial: "+504" },
  { flag: "🇭🇰", name: "Hong Kong",               dial: "+852" },
  { flag: "🇭🇺", name: "Hungary",                 dial: "+36" },
  { flag: "🇮🇸", name: "Iceland",                 dial: "+354" },
  { flag: "🇮🇳", name: "India",                   dial: "+91" },
  { flag: "🇮🇩", name: "Indonesia",               dial: "+62" },
  { flag: "🇮🇷", name: "Iran",                    dial: "+98" },
  { flag: "🇮🇶", name: "Iraq",                    dial: "+964" },
  { flag: "🇮🇪", name: "Ireland",                 dial: "+353" },
  { flag: "🇮🇱", name: "Israel",                  dial: "+972" },
  { flag: "🇮🇹", name: "Italy",                   dial: "+39" },
  { flag: "🇯🇲", name: "Jamaica",                 dial: "+1" },
  { flag: "🇯🇵", name: "Japan",                   dial: "+81" },
  { flag: "🇯🇴", name: "Jordan",                  dial: "+962" },
  { flag: "🇰🇿", name: "Kazakhstan",              dial: "+7" },
  { flag: "🇰🇪", name: "Kenya",                   dial: "+254" },
  { flag: "🇰🇼", name: "Kuwait",                  dial: "+965" },
  { flag: "🇰🇬", name: "Kyrgyzstan",              dial: "+996" },
  { flag: "🇱🇦", name: "Laos",                    dial: "+856" },
  { flag: "🇱🇻", name: "Latvia",                  dial: "+371" },
  { flag: "🇱🇧", name: "Lebanon",                 dial: "+961" },
  { flag: "🇱🇾", name: "Libya",                   dial: "+218" },
  { flag: "🇱🇹", name: "Lithuania",               dial: "+370" },
  { flag: "🇱🇺", name: "Luxembourg",              dial: "+352" },
  { flag: "🇲🇾", name: "Malaysia",                dial: "+60" },
  { flag: "🇲🇻", name: "Maldives",                dial: "+960" },
  { flag: "🇲🇱", name: "Mali",                    dial: "+223" },
  { flag: "🇲🇹", name: "Malta",                   dial: "+356" },
  { flag: "🇲🇽", name: "Mexico",                  dial: "+52" },
  { flag: "🇲🇩", name: "Moldova",                 dial: "+373" },
  { flag: "🇲🇳", name: "Mongolia",                dial: "+976" },
  { flag: "🇲🇦", name: "Morocco",                 dial: "+212" },
  { flag: "🇲🇿", name: "Mozambique",              dial: "+258" },
  { flag: "🇲🇲", name: "Myanmar",                 dial: "+95" },
  { flag: "🇳🇵", name: "Nepal",                   dial: "+977" },
  { flag: "🇳🇱", name: "Netherlands",             dial: "+31" },
  { flag: "🇳🇿", name: "New Zealand",             dial: "+64" },
  { flag: "🇳🇬", name: "Nigeria",                 dial: "+234" },
  { flag: "🇳🇴", name: "Norway",                  dial: "+47" },
  { flag: "🇴🇲", name: "Oman",                    dial: "+968" },
  { flag: "🇵🇰", name: "Pakistan",                dial: "+92" },
  { flag: "🇵🇦", name: "Panama",                  dial: "+507" },
  { flag: "🇵🇾", name: "Paraguay",                dial: "+595" },
  { flag: "🇵🇪", name: "Peru",                    dial: "+51" },
  { flag: "🇵🇭", name: "Philippines",             dial: "+63" },
  { flag: "🇵🇱", name: "Poland",                  dial: "+48" },
  { flag: "🇵🇹", name: "Portugal",                dial: "+351" },
  { flag: "🇶🇦", name: "Qatar",                   dial: "+974" },
  { flag: "🇷🇴", name: "Romania",                 dial: "+40" },
  { flag: "🇷🇺", name: "Russia",                  dial: "+7" },
  { flag: "🇸🇦", name: "Saudi Arabia",            dial: "+966" },
  { flag: "🇸🇳", name: "Senegal",                 dial: "+221" },
  { flag: "🇷🇸", name: "Serbia",                  dial: "+381" },
  { flag: "🇸🇬", name: "Singapore",               dial: "+65" },
  { flag: "🇸🇰", name: "Slovakia",                dial: "+421" },
  { flag: "🇸🇮", name: "Slovenia",                dial: "+386" },
  { flag: "🇿🇦", name: "South Africa",            dial: "+27" },
  { flag: "🇰🇷", name: "South Korea",             dial: "+82" },
  { flag: "🇪🇸", name: "Spain",                   dial: "+34" },
  { flag: "🇱🇰", name: "Sri Lanka",               dial: "+94" },
  { flag: "🇸🇩", name: "Sudan",                   dial: "+249" },
  { flag: "🇸🇪", name: "Sweden",                  dial: "+46" },
  { flag: "🇨🇭", name: "Switzerland",             dial: "+41" },
  { flag: "🇸🇾", name: "Syria",                   dial: "+963" },
  { flag: "🇹🇼", name: "Taiwan",                  dial: "+886" },
  { flag: "🇹🇯", name: "Tajikistan",              dial: "+992" },
  { flag: "🇹🇿", name: "Tanzania",                dial: "+255" },
  { flag: "🇹🇭", name: "Thailand",                dial: "+66" },
  { flag: "🇹🇳", name: "Tunisia",                 dial: "+216" },
  { flag: "🇹🇷", name: "Turkey",                  dial: "+90" },
  { flag: "🇹🇲", name: "Turkmenistan",            dial: "+993" },
  { flag: "🇺🇬", name: "Uganda",                  dial: "+256" },
  { flag: "🇺🇦", name: "Ukraine",                 dial: "+380" },
  { flag: "🇦🇪", name: "United Arab Emirates",    dial: "+971" },
  { flag: "🇬🇧", name: "United Kingdom",          dial: "+44" },
  { flag: "🇺🇸", name: "United States",           dial: "+1" },
  { flag: "🇺🇾", name: "Uruguay",                 dial: "+598" },
  { flag: "🇺🇿", name: "Uzbekistan",              dial: "+998" },
  { flag: "🇻🇪", name: "Venezuela",               dial: "+58" },
  { flag: "🇻🇳", name: "Vietnam",                 dial: "+84" },
  { flag: "🇾🇪", name: "Yemen",                   dial: "+967" },
  { flag: "🇿🇲", name: "Zambia",                  dial: "+260" },
  { flag: "🇿🇼", name: "Zimbabwe",                dial: "+263" },
];

const mockVerifier = {
  type: "recaptcha",
  verify: () => Promise.resolve(""),
  _reset: () => {},
};

// Step 4
export default function PhoneEntryScreen({ navigation, route }) {
  const { firstName, lastName, age, email, authPath } = route.params;

  const [phone, setPhone]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dialFilter, setDialFilter] = useState("");
  const [country, setCountry]     = useState(COUNTRIES.find((c) => c.name === "United States"));

  const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) => {
    const numA = parseInt(a.dial.replace("+", ""), 10);
    const numB = parseInt(b.dial.replace("+", ""), 10);
    return numA - numB;
  });

  const filteredCountries = dialFilter.trim()
    ? SORTED_COUNTRIES.filter((c) => {
        const typed   = dialFilter.replace(/[^0-9]/g, "");
        const dialNum = c.dial.replace("+", "");
        return dialNum.startsWith(typed);
      })
    : SORTED_COUNTRIES;
  function handleChange(text) {
    setPhone(text.replace(/\D/g, "").slice(0, 15));
  }

  const canSubmit = phone.length >= 5;

  async function handleSend() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const e164 = `${country.dial}${phone}`;
      const confirmation = await signInWithPhoneNumber(auth, e164, mockVerifier);
      navigation.navigate("PhoneVerify", {
        firstName, lastName, age, email, authPath,
        phone: e164,
        confirmation,
      });
    } catch (err) {
      console.error("Phone send error:", err);
      Alert.alert("Error", "Could not send verification code. Check the number and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── Country picker modal ── */}
      <Modal visible={pickerOpen} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => { setPickerOpen(false); setDialFilter(""); }}
        >
          <View style={styles.modalSheet}>
            <TextInput
              style={styles.dialInput}
              placeholder="+1"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={dialFilter}
              onChangeText={setDialFilter}
              autoFocus
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(item, i) => `${item.name}-${i}`}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryRow,
                    item.name === country.name && styles.countryRowSelected,
                  ]}
                  onPress={() => {
                    setCountry(item);
                    setPhone("");
                    setPickerOpen(false);
                    setDialFilter("");
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryDial}>{item.dial}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.inner}>
        <OnboardingProgress step={4} />

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.stepLabel}>Step 4 of 13</Text>
        <Text style={styles.title}>Your phone{"\n"}number</Text>
        <Text style={styles.subtitle}>We'll send a one-time code to verify your number.</Text>

        <View style={styles.inputRow}>
          <TouchableOpacity
            style={styles.countryCode}
            onPress={() => { Keyboard.dismiss(); setPickerOpen(true); }}
            activeOpacity={0.7}
          >
            <Text style={styles.countryText}>{country.flag}  {country.dial}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.phoneInput}
            placeholder="Phone number"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
            autoFocus
            value={phone}
            onChangeText={handleChange}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, (!canSubmit || loading) && styles.disabled]}
          onPress={handleSend}
          disabled={!canSubmit || loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.bgPrimary} />
          ) : (
            <Text style={styles.primaryBtnText}>Send code →</Text>
          )}
        </TouchableOpacity>
      </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 40,
  },
  back:      { marginBottom: 20 },
  backText:  { color: Colors.textMuted, fontSize: 15 },
  stepLabel: { color: Colors.textMuted, fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  title:     { color: Colors.white, fontSize: 28, fontWeight: "800", lineHeight: 36, marginBottom: 10 },
  subtitle:  { color: Colors.textMuted, fontSize: 14, marginBottom: 32 },

  inputRow: {
    flexDirection: "row",
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    borderRadius: 14,
    marginBottom: 24,
    overflow: "hidden",
  },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: "#1a2a3a",
    gap: 6,
  },
  countryText: { color: Colors.white, fontSize: 15 },
  chevron:     { color: Colors.textMuted, fontSize: 18, marginTop: 1 },
  phoneInput: {
    flex: 1,
    color: Colors.white,
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 16,
    letterSpacing: 1,
  },

  primaryBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  disabled:       { opacity: 0.35 },
  primaryBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 16 },

  // ── Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    paddingTop: 200,
    paddingLeft: 28,
  },
  modalSheet: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    width: 130,
    maxHeight: 260,
  },

  dialInput: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1a2a3a",
  },

  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1a2a3a",
    gap: 8,
  },
  countryRowSelected: { backgroundColor: Colors.brandBlue + "22" },
  countryFlag: { fontSize: 20 },
  countryDial: { color: Colors.white, fontSize: 13, fontWeight: "600" },
});
