import { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";

// ── Constants ─────────────────────────────────────────────────────────────────

const EYE_BLUE   = "#6AAED6";
const OUTER_D    = 200;   // outer blue circle diameter
const WHITE_D    = 132;   // white ring inner diameter
const PUPIL_D    = 94;    // iris + pupil diameter
const HIGHLIGHT_D = 24;   // specular highlight diameter
const MAX_TRAVEL = 14;    // max px the pupil can drift from center

// Natural-feeling gaze positions (within MAX_TRAVEL range)
const GAZE_PATH = [
  { x:  0,  y:  0  },
  { x: 12,  y: -6  },
  { x:  8,  y:  8  },
  { x: -10, y:  5  },
  { x: -6,  y: -10 },
  { x:  4,  y: 12  },
  { x: -12, y: -4  },
  { x:  0,  y:  0  },
  { x:  6,  y: -8  },
  { x: -4,  y:  6  },
  { x:  0,  y:  0  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SplashScreen() {
  const pupil    = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const blinkY   = useRef(new Animated.Value(1)).current;  // scaleY for blink
  const opacity  = useRef(new Animated.Value(0)).current;  // fade-in on mount

  useEffect(() => {
    // Fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    // Start gaze loop
    const gazeLoop = buildGazeLoop();
    gazeLoop.start();

    // Start blink loop
    const blinkLoop = buildBlinkLoop();
    blinkLoop.start();

    return () => {
      gazeLoop.stop();
      blinkLoop.stop();
    };
  }, []);

  // ── Gaze: smoothly drifts through natural-looking positions ─────────────────
  function buildGazeLoop() {
    const steps = GAZE_PATH.map((pos, i) =>
      Animated.timing(pupil, {
        toValue: pos,
        // Vary duration slightly so it doesn't feel robotic
        duration: 500 + (i % 3) * 180,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      })
    );
    return Animated.loop(Animated.sequence(steps));
  }

  // ── Blink: fast close, slightly slower open, realistic cadence ───────────────
  function buildBlinkLoop() {
    const singleBlink = Animated.sequence([
      Animated.timing(blinkY, {
        toValue: 0.06,
        duration: 110,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(blinkY, {
        toValue: 1,
        duration: 190,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    // Pattern: blink, pause, blink-blink, long pause — feels human
    return Animated.loop(
      Animated.sequence([
        Animated.delay(2200),
        singleBlink,
        Animated.delay(3800),
        singleBlink,
        Animated.delay(800),
        singleBlink,
        Animated.delay(4500),
      ])
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity }}>

        {/* ── Eye ── */}
        <Animated.View style={[styles.eyeWrapper, { transform: [{ scaleY: blinkY }] }]}>
          {/* Outer blue ring */}
          <View style={styles.outerCircle}>
            {/* White area */}
            <View style={styles.whiteRing}>
              {/* Pupil drifts around inside the white area */}
              <Animated.View style={[
                styles.pupilAnchor,
                { transform: pupil.getTranslateTransform() },
              ]}>
                <View style={styles.pupil}>
                  <View style={styles.highlight} />
                </View>
              </Animated.View>
            </View>
          </View>
        </Animated.View>

        {/* ── Wordmark ── */}
        <Text style={styles.wordmark}>Notifeye</Text>
        <Text style={styles.tagline}>Drive into a safer future.</Text>

      </Animated.View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
  },

  // Blink wrapper — scaleY collapses this to simulate eyelid closing
  eyeWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },

  outerCircle: {
    width: OUTER_D,
    height: OUTER_D,
    borderRadius: OUTER_D / 2,
    backgroundColor: EYE_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },

  whiteRing: {
    width: WHITE_D,
    height: WHITE_D,
    borderRadius: WHITE_D / 2,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  // Zero-size anchor that the pupil is centered on; translate moves it
  pupilAnchor: {
    alignItems: "center",
    justifyContent: "center",
  },

  pupil: {
    width: PUPIL_D,
    height: PUPIL_D,
    borderRadius: PUPIL_D / 2,
    backgroundColor: EYE_BLUE,
    alignItems: "flex-start",
    justifyContent: "flex-start",
    paddingTop: 12,
    paddingLeft: 14,
  },

  highlight: {
    width: HIGHLIGHT_D,
    height: HIGHLIGHT_D,
    borderRadius: HIGHLIGHT_D / 2,
    backgroundColor: "rgba(255,255,255,0.75)",
  },

  wordmark: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 32,
  },

  tagline: {
    color: "#444",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },
});
