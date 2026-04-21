import { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { useAuth } from "../../context/AuthContext";
import OnboardingProgress from "../../components/OnboardingProgress";
import { Colors } from "../../theme/colors";

function CameraIcon({ size = 22, color = Colors.brandBlue }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function CircleIcon({ size = 22, color = Colors.brandBlue }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
        stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={1.5} />
      <Path
        d="M23 21v-2a4 4 0 0 0-3-3.87"
        stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M16 3.13a4 4 0 0 1 0 7.75"
        stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function FlameIcon({ size = 22, color = Colors.streakOrange }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2c0 0-5 5-5 10a5 5 0 0 0 10 0c0-3-2-6-2-6s-1 2-2 2c-1 0-1-1-1-1s2-3 0-5z"
        stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M9 17c0 1.1.9 2 2 2s2-.9 2-2c0-1.5-2-3-2-3s-2 1.5-2 3z"
        stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function WelcomeScreen() {
  const { profile, refreshProfile } = useAuth();
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
    // Flipping onboardingComplete triggers AppNavigator to switch to MainTabs automatically.
    refreshProfile({ onboardingComplete: true });
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
          Your profile is ready. Watch the road. We'll watch you..
        </Text>

        {/* What's next cards */}
        <View style={styles.cards}>
          <View style={styles.nextCard}>
            <View style={styles.nextIconWrap}><CameraIcon /></View>
            <View style={styles.nextBody}>
              <Text style={styles.nextTitle}>Start your first drive</Text>
              <Text style={styles.nextDesc}>Tap the Drive tab and let Notifeye monitor in the background.</Text>
            </View>
          </View>
          <View style={styles.nextCard}>
            <View style={styles.nextIconWrap}><CircleIcon /></View>
            <View style={styles.nextBody}>
              <Text style={styles.nextTitle}>Grow your circle</Text>
              <Text style={styles.nextDesc}>Share your invite code so family can link to you anytime.</Text>
            </View>
          </View>
          <View style={styles.nextCard}>
            <View style={styles.nextIconWrap}><FlameIcon /></View>
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
    paddingBottom: 80, // 40
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
  nextIconWrap: { marginTop: 2 },
  nextBody:  { flex: 1 },
  nextTitle: { color: Colors.white, fontSize: 14, fontWeight: "700", marginBottom: 4 },
  nextDesc:  { color: Colors.textMuted, fontSize: 12, lineHeight: 18 },

  primaryBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 32,
  },
  primaryBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 17 },
});
