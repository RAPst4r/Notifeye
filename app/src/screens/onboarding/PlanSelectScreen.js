import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { updateUserProfile, updateOnboardingStep } from "../../firebase/firestoreService";
import { useAuth } from "../../context/AuthContext";
import OnboardingProgress from "../../components/OnboardingProgress";
import { Colors } from "../../theme/colors";

const PLANS = [
  {
    id: "free",
    name: "Basic",
    price: "Free",
    priceDetail: "forever",
    badge: null,
    features: [
      "✓  Real-time drowsiness alerts",
      "✓  Circle with up to 3 people",
      "✓  7-day drive history",
      "✓  Streak tracking",
    ],
    unavailable: [],
  },
  {
    id: "tier2",
    name: "Family",
    price: "$4.99",
    priceDetail: "/ month",
    badge: "POPULAR",
    features: [
      "✓  Everything in Basic",
      "✓  Circle with up to 10 people",
      "✓  30-day drive history",
      "✓  Leaderboard & badges",
      "✓  Emergency buddy calls",
    ],
    unavailable: [],
  },
  {
    id: "tier3",
    name: "Pro",
    price: "$9.99",
    priceDetail: "/ month",
    badge: "BEST VALUE",
    features: [
      "✓  Everything in Family",
      "✓  Unlimited circle members",
      "✓  Unlimited history",
      "✓  Priority support",
      "✓  Early access to new features",
    ],
    unavailable: [],
  },
];

export default function PlanSelectScreen({ navigation }) {
  const { user, refreshProfile } = useAuth();
  const [selected, setSelected] = useState("free");
  const [saving, setSaving]     = useState(false);

  async function handleContinue() {
    setSaving(true);
    try {
      const updates = { subscriptionTier: selected, onboardingStep: 12 };
      await updateUserProfile(user.uid, updates);
      refreshProfile(updates);

      if (selected !== "free") {
        // TODO: integrate RevenueCat purchase flow here
        Alert.alert(
          "Coming soon",
          "Paid plans will be available at launch. You've been placed on the waitlist — we'll notify you!",
          [{ text: "OK", onPress: () => navigation.navigate("TermsAccept") }]
        );
      } else {
        navigation.navigate("TermsAccept");
      }
    } catch (err) {
      console.error("[PlanSelect] save failed:", err);
      Alert.alert("Error", "Could not save plan selection. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.inner}
      showsVerticalScrollIndicator={false}
    >
      <OnboardingProgress step={11} />
      {navigation.canGoBack() && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.step}>Step 11 of 13</Text>
      <Text style={styles.title}>Choose your{"\n"}plan</Text>
      <Text style={styles.subtitle}>You can upgrade or downgrade at any time.</Text>

      {PLANS.map((plan) => {
        const isSelected = selected === plan.id;
        return (
          <TouchableOpacity
            key={plan.id}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => setSelected(plan.id)}
            activeOpacity={0.8}
          >
            {plan.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{plan.badge}</Text>
              </View>
            )}

            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.price, isSelected && styles.priceSelected]}>
                    {plan.price}
                  </Text>
                  <Text style={styles.priceDetail}> {plan.priceDetail}</Text>
                </View>
              </View>
              <View style={[styles.radio, isSelected && styles.radioSelected]} />
            </View>

            <View style={styles.featureList}>
              {plan.features.map((f, i) => (
                <Text key={i} style={styles.feature}>{f}</Text>
              ))}
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[styles.primaryBtn, saving && styles.disabled]}
        onPress={handleContinue}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={Colors.bgPrimary} />
        ) : (
          <Text style={styles.primaryBtnText}>
            {selected === "free" ? "Continue with Basic →" : `Select ${PLANS.find(p => p.id === selected)?.name} →`}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.legal}>
        Paid plans billed monthly. Cancel anytime. Prices in USD.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  inner: {
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 48,
  },
  back:     { marginBottom: 20 },
  backText: { color: Colors.textMuted, fontSize: 15 },
  step:     { color: Colors.textMuted, fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  title:    { color: Colors.white, fontSize: 28, fontWeight: "800", lineHeight: 36, marginBottom: 10 },
  subtitle: { color: Colors.textMuted, fontSize: 14, marginBottom: 28 },

  card: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    padding: 20,
    marginBottom: 14,
    position: "relative",
    overflow: "hidden",
  },
  cardSelected: { borderColor: Colors.brandBlue },

  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: Colors.brandBlue,
    borderBottomLeftRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: Colors.bgPrimary, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },

  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  planName:   { color: Colors.white, fontSize: 18, fontWeight: "800", marginBottom: 4 },
  priceRow:   { flexDirection: "row", alignItems: "baseline" },
  price:      { color: Colors.textMuted, fontSize: 22, fontWeight: "800" },
  priceSelected: { color: Colors.brandBlue },
  priceDetail:   { color: Colors.textMuted, fontSize: 13 },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#2a3a4a",
  },
  radioSelected: { borderColor: Colors.brandBlue, backgroundColor: Colors.brandBlue },

  featureList: { gap: 6 },
  feature: { color: Colors.textMuted, fontSize: 13, lineHeight: 20 },

  primaryBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  disabled:       { opacity: 0.35 },
  primaryBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 16 },

  legal: { color: Colors.textMuted, fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 17 },
});
