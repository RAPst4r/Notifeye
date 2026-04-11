import { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import OnboardingProgress from "../../components/OnboardingProgress";
import { Colors } from "../../theme/colors";

export default function WelcomeScreen({ navigation }) {
  const { profile } = useAuth();
  const firstName = profile?.name?.trim() || "there";

  const fadeIn   = useRef(new Animated.Value(0)).current;
  const slideUp  = useRef(new Animated.Value(30)).current;
  const scaleBadge = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 700, useNativeDriver: true }),
      Animated.spring(scaleBadge, {
        toValue: 1,
        tension: 60,
        friction: 5,
        useNativeDriver: true,
        delay: 300,
      }),
    ]).start();
  }, []);

  function handleDone() {
    // AppNavigator sees onboardingComplete = true → routes to MainTabs automatically.
    // Force a reset in case navigator hasn't re-evaluated yet.
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.inner,
          { opacity: fadeIn, transform: [{ translateY: slideUp }] },
        ]}
      >
        <OnboardingProgress step={13} />

        {/* Celebration badge */}
        <Animated.View
          style={[styles.badgeCircle, { transform: [{ scale: scaleBadge }] }]}
        >
          <Text style={styles.badgeEmoji}>🎉</Text>
        </Animated.View>

        <Text style={styles.step}>Step 13 of 13</Text>
        <Text style={styles.headline}>You're all set,{"\n"}{firstName}!</Text>
        <Text style={styles.subtitle}>
          Your profile is ready. Drive safe — your circle is watching.
        </Text>

        {/* What's next cards */}
        <View style={styles.cards}>
          <View style={styles.nextCard}>
            <Text style={styles.nextIcon}>📷</Text>
            <View style={styles.nextBody}>
              <Text style={styles.nextTitle}>Start your first drive</Text>
              <Text style={styles.nextDesc}>Tap the Drive tab and let Notifeye monitor in the background.</Text>
            </View>
          </View>
          <View style={styles.nextCard}>
            <Text style={styles.nextIcon}>👥</Text>
            <View style={styles.nextBody}>
              <Text style={styles.nextTitle}>Grow your circle</Text>
              <Text style={styles.nextDesc}>Share your invite code so family can link to you anytime.</Text>
            </View>
          </View>
          <View style={styles.nextCard}>
            <Text style={styles.nextIcon}>🔥</Text>
            <View style={styles.nextBody}>
              <Text style={styles.nextTitle}>Build your streak</Text>
              <Text style={styles.nextDesc}>Drive every day to maintain your streak and earn badges.</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleDone} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Go to Notifeye →</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 40,
  },

  badgeCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 2,
    borderColor: Colors.brandBlue + "55",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  badgeEmoji: { fontSize: 44 },

  step:     { color: Colors.textMuted, fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  headline: { color: Colors.white, fontSize: 30, fontWeight: "800", lineHeight: 38, marginBottom: 12 },
  subtitle: { color: Colors.textMuted, fontSize: 14, lineHeight: 22, marginBottom: 32 },

  cards: { gap: 12, marginBottom: 32 },
  nextCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.bgSecondary,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "#1a2a3a",
  },
  nextIcon:  { fontSize: 24, marginTop: 2 },
  nextBody:  { flex: 1 },
  nextTitle: { color: Colors.white, fontSize: 14, fontWeight: "700", marginBottom: 4 },
  nextDesc:  { color: Colors.textMuted, fontSize: 12, lineHeight: 18 },

  primaryBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 17 },
});
