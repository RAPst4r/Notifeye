import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  TouchableOpacity,
  Animated,
  Alert,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import Svg, {
  Path,
  Circle,
  Ellipse,
  G,
  Rect,
  Line,
  Text as SvgText,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../theme/colors";

// ── Module-level constants (safe-area-independent) ────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const DESIGN_W         = 280;
const DESIGN_H         = 350;
const CANVAS_W         = SCREEN_W;
const BANNER_H         = 44;
const HEADER_CONTENT_H = 60; // px of header below the status bar (back btn row)
const SX               = CANVAS_W / DESIGN_W;
const PILL_W           = 72;  // pill label width
const PILL_PAD         = 8;   // minimum margin from canvas edge

// ── Road control points ───────────────────────────────────────────────────────

const RAW_POINTS = [
  { x: 30,  y: 85  }, { x: 100, y: 100 }, { x: 210, y: 95  },
  { x: 248, y: 128 }, { x: 225, y: 172 }, { x: 105, y: 188 },
  { x: 48,  y: 220 }, { x: 55,  y: 262 }, { x: 190, y: 272 },
  { x: 255, y: 298 }, { x: 265, y: 338 },
];

const STOP_T      = [0.08, 0.50, 0.92];
const STOP_LABELS = ["Free", "Family", "Extended+"];

// ── Plan data ─────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    btnLabel: "Get started free",
    features: [
      "Real-time drowsiness alerts",
      "On-device AI — fully private",
      "Personalized head calibration",
      "Full-screen attention prompts",
      "No subscription needed",
      "Works on any phone mount",
    ],
  },
  {
    name: "Family",
    price: "$10.99",
    period: "/ month",
    btnLabel: "Start 7-day free trial",
    features: [
      "Everything in Free",
      "Instant parent push alerts",
      "Live circle monitoring",
      "Post-trip family reports",
      "Safety scores per driver",
      "2 drivers fully covered",
    ],
  },
  {
    name: "Extended+",
    price: "$15.99",
    period: "/ month",
    btnLabel: "Start 7-day free trial",
    features: [
      "Everything in Family",
      "4–5 drivers covered",
      "Advanced circle analytics",
      "Weekly trend reports",
      "Priority support queue",
      "Fleet-ready data export",
    ],
  },
];

// ── Stars — canvas-width based, y independent of canvas height ───────────────

const STARS = Array.from({ length: 35 }, (_, i) => ({
  x: (i * 137) % CANVAS_W,
  y: 8 + (i * 79) % 85,
  opacity: 0.10 + (i % 4) * 0.02,
}));

// ── Banner dot x-positions ────────────────────────────────────────────────────

const DOT_X = [20, SCREEN_W / 2, SCREEN_W - 20];

// ── Catmull-Rom math ──────────────────────────────────────────────────────────

function crPoint(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return {
    x: 0.5 * (2*p1.x + (-p0.x+p2.x)*t + (2*p0.x-5*p1.x+4*p2.x-p3.x)*t2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
    y: 0.5 * (2*p1.y + (-p0.y+p2.y)*t + (2*p0.y-5*p1.y+4*p2.y-p3.y)*t2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*t3),
  };
}

function samplePath(pts, t) {
  const n   = pts.length - 1;
  const seg = Math.min(Math.floor(t * n), n - 1);
  const lt  = t * n - seg;
  return crPoint(pts[Math.max(0,seg-1)], pts[seg], pts[Math.min(n,seg+1)], pts[Math.min(n,seg+2)], lt);
}

function pathAngleDeg(pts, t) {
  const a = samplePath(pts, Math.max(0, t - 0.015));
  const b = samplePath(pts, Math.min(1, t + 0.015));
  return Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
}

function buildRoadPath(pts, sx, sy) {
  const s = pts.map(p => ({ x: p.x * sx, y: p.y * sy }));
  let d = `M ${s[0].x.toFixed(1)} ${s[0].y.toFixed(1)}`;
  for (let i = 0; i < s.length - 1; i++) {
    const p0 = s[Math.max(0,i-1)], p1 = s[i];
    const p2 = s[i+1], p3 = s[Math.min(s.length-1,i+2)];
    d += ` C ${(p1.x+(p2.x-p0.x)/6).toFixed(1)} ${(p1.y+(p2.y-p0.y)/6).toFixed(1)}` +
         ` ${(p2.x-(p3.x-p1.x)/6).toFixed(1)} ${(p2.y-(p3.y-p1.y)/6).toFixed(1)}` +
         ` ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// ── Static road layer — drawn once, never re-renders ─────────────────────────
// Receives roadPath and canvasH as props; both are stable after first render.

const StaticRoadLayer = React.memo(function StaticRoadLayer({ roadPath, canvasH }) {
  return (
    <Svg
      width={CANVAS_W}
      height={canvasH}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Rect x={0} y={0} width={CANVAS_W} height={canvasH} fill="#030B11" />

      {STARS.map((s, i) => (
        <Circle key={i} cx={s.x} cy={s.y} r={0.75} fill={`rgba(91,174,224,${s.opacity})`} />
      ))}

      {/* Road layers — outside in */}
      <Path d={roadPath} stroke="rgba(91,174,224,0.05)" strokeWidth={30} fill="none" strokeLinecap="round" />
      <Path d={roadPath} stroke="#0d1e2b"               strokeWidth={23} fill="none" strokeLinecap="round" />
      <Path d={roadPath} stroke="#111d2b"               strokeWidth={17} fill="none" strokeLinecap="round" />
      <Path d={roadPath} stroke="#0f1a27"               strokeWidth={11} fill="none" strokeLinecap="round" />
      <Path d={roadPath} stroke="rgba(91,174,224,0.09)" strokeWidth={1.2} fill="none" strokeLinecap="round" strokeDasharray="9 11" />
    </Svg>
  );
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function SubscriptionScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // ── Dimensions that depend on safe-area insets ────────────────────────────
  const headerH = insets.top + HEADER_CONTENT_H;
  const canvasH = Math.floor((SCREEN_H - headerH) / 2);
  const sY      = canvasH / DESIGN_H;

  const roadPath = useMemo(() => buildRoadPath(RAW_POINTS, SX, sY), [sY]);
  const stopPos  = useMemo(
    () => STOP_T.map(t => { const p = samplePath(RAW_POINTS, t); return { x: p.x * SX, y: p.y * sY }; }),
    [sY],
  );

  // ── Active stop state ─────────────────────────────────────────────────────
  const [activeStop, setActiveStop] = useState(0);
  const activeStopRef = useRef(0);

  // ── Animation state ───────────────────────────────────────────────────────
  const animRef    = useRef({ vanT: STOP_T[0], vanTargetT: STOP_T[0] });
  const rafRef     = useRef(null);
  const startMsRef = useRef(Date.now());
  const [animState, setAnimState] = useState({ animT: 0, vanT: STOP_T[0] });

  // ── Dot scale animations ──────────────────────────────────────────────────
  const dotScales = useRef([
    new Animated.Value(1.3),
    new Animated.Value(1.0),
    new Animated.Value(1.0),
  ]).current;

  // ── Swipe label fade ──────────────────────────────────────────────────────
  const swipeLabelOpacity = useRef(new Animated.Value(1)).current;
  const hasNavigated      = useRef(false);

  // ── Touch start for canvas tap detection ─────────────────────────────────
  const touchStartRef = useRef({ x: 0, y: 0 });

  // ── goTo — stable callback, all deps are refs ─────────────────────────────
  const goTo = useCallback((index) => {
    activeStopRef.current = index;
    setActiveStop(index);
    animRef.current.vanTargetT = STOP_T[index];

    dotScales.forEach((scale, i) => {
      Animated.timing(scale, {
        toValue: i === index ? 1.3 : 1.0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });

    if (!hasNavigated.current && index !== 0) {
      hasNavigated.current = true;
      Animated.timing(swipeLabelOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, []); // stable — only uses refs and stable setters

  // ── Canvas stop tap detection (banner dots are self-handled) ─────────────
  // locationY from PanResponder is relative to the root view, so canvas stops
  // live at root-y = headerH … headerH+canvasH. Subtract headerH to get canvas-local y.
  const checkTap = useCallback((tx, ty) => {
    const localY = ty - headerH;
    if (localY < 0 || localY > canvasH) return;
    for (let i = 0; i < 3; i++) {
      const sp = stopPos[i];
      if (Math.hypot(tx - sp.x, localY - sp.y) <= 18) { goTo(i); return; }
      if (tx >= sp.x - 44 && tx <= sp.x + 44 && localY >= sp.y - 36 && localY <= sp.y - 2) {
        goTo(i); return;
      }
    }
  }, [goTo, headerH, canvasH, stopPos]);

  // ── Animation loop ────────────────────────────────────────────────────────
  useEffect(() => {
    startMsRef.current = Date.now();
    const loop = () => {
      const animT = (Date.now() - startMsRef.current) / 1000;
      animRef.current.vanT += (animRef.current.vanTargetT - animRef.current.vanT) * 0.07;
      setAnimState({ animT, vanT: animRef.current.vanT });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // ── Pan responder — full-screen swipe + canvas tap ────────────────────────
  // onStartShouldSetPanResponder: true — claims every touch so we can record
  //   the start position for canvas stop tap detection.
  // onMoveShouldSetPanResponder: only claim after 10px horizontal movement,
  //   so TouchableOpacity children (banner dots) can win on clean taps.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, g) => Math.abs(g.dx) > 10,
      onPanResponderGrant: (e) => {
        touchStartRef.current = {
          x: e.nativeEvent.locationX,
          y: e.nativeEvent.locationY,
        };
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -25) {
          const next = Math.min(2, activeStopRef.current + 1);
          activeStopRef.current = next;
          goToRef.current(next);
        } else if (g.dx > 25) {
          const prev = Math.max(0, activeStopRef.current - 1);
          activeStopRef.current = prev;
          goToRef.current(prev);
        } else if (Math.abs(g.dx) < 10 && Math.abs(g.dy) < 10) {
          checkTapRef.current(touchStartRef.current.x, touchStartRef.current.y);
        }
      },
    }),
  ).current;

  // Keep refs current so PanResponder closure always calls latest versions
  const goToRef     = useRef(goTo);
  const checkTapRef = useRef(checkTap);
  useEffect(() => { goToRef.current = goTo; });
  useEffect(() => { checkTapRef.current = checkTap; });

  // ── Derived animated values ───────────────────────────────────────────────
  const { animT, vanT } = animState;
  const vanRaw    = samplePath(RAW_POINTS, vanT);
  const vanX      = vanRaw.x * SX;
  const vanY      = vanRaw.y * sY;
  const vanAngle  = pathAngleDeg(RAW_POINTS, vanT);
  const glowR     = 18 + 4 * Math.sin(animT * 3);
  const hlOpacity = (0.5 + 0.3 * Math.sin(animT * 3.5)).toFixed(3);

  const plan = PLANS[activeStop];

  return (
    <View style={styles.root} {...panResponder.panHandlers}>

      {/* ── Header — back button + wordmark + tagline ── */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.wordmark}>NOTIFEYE</Text>
          <Text style={styles.tagline}>Your coverage journey</Text>
        </View>

        {/* Spacer matches back button width to keep wordmark centred */}
        <View style={styles.headerEnd} />
      </View>

      {/* ── Road canvas — starts below the header ── */}
      <View style={{ width: CANVAS_W, height: canvasH }}>
        <StaticRoadLayer roadPath={roadPath} canvasH={canvasH} />

        <Svg
          width={CANVAS_W}
          height={canvasH}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {/* ── Stops ── */}
          {STOP_LABELS.map((label, i) => {
            const sp       = stopPos[i];
            const isActive = i === activeStop;
            const ringBase = [14, 24, 36];
            const pillLeft = Math.max(PILL_PAD, Math.min(sp.x - PILL_W / 2, CANVAS_W - PILL_W - PILL_PAD));
            const pillCx   = pillLeft + PILL_W / 2;
            return (
              <G key={label}>
                {isActive && ringBase.map((r, ri) => {
                  const s = Math.sin(animT * 2.2 + ri * 1.1);
                  return (
                    <Circle
                      key={ri}
                      cx={sp.x}
                      cy={sp.y}
                      r={r + 2 * s}
                      fill="none"
                      stroke={`rgba(91,174,224,${(0.08 + 0.05 * ((s + 1) / 2)).toFixed(3)})`}
                      strokeWidth={1.2}
                    />
                  );
                })}
                <Rect
                  x={pillLeft} y={sp.y - 30} width={PILL_W} height={18} rx={9}
                  fill={isActive ? "#5BAEE0" : "#0d1e2b"}
                  stroke={isActive ? "#5BAEE0" : "#1e3a50"}
                  strokeWidth={1}
                />
                <SvgText
                  x={pillCx} y={sp.y - 18}
                  textAnchor="middle"
                  fontSize={isActive ? 11 : 10}
                  fontWeight={isActive ? "500" : "400"}
                  fill={isActive ? "#030B11" : "#8899aa"}
                >
                  {label}
                </SvgText>
                <Circle
                  cx={sp.x} cy={sp.y}
                  r={isActive ? 6 : 3.5}
                  fill={isActive ? "#5BAEE0" : "#1e3a50"}
                />
              </G>
            );
          })}

          {/* ── Van glow ── */}
          <Circle
            cx={vanX} cy={vanY} r={glowR}
            fill="none"
            stroke={`rgba(91,174,224,${(0.09 + 0.06 * ((Math.sin(animT * 3) + 1) / 2)).toFixed(3)})`}
            strokeWidth={6}
          />

          {/* ── Van — landscape orientation, front faces right (+x) ── */}
          <G transform={`translate(${vanX.toFixed(1)} ${vanY.toFixed(1)}) rotate(${vanAngle.toFixed(1)})`}>
            <Rect x={-19} y={-11} width={38} height={22} rx={5} fill="#1a3d60" stroke="#5BAEE0" strokeWidth={1.2} />
            <Rect x={-16} y={-8}  width={32} height={16} rx={3} fill="#1e4a75" />
            <Rect x={-11} y={-7}  width={22} height={14} rx={3} fill="#0a1a28" />
            <Line x1={-10} y1={-6} x2={10} y2={-6} stroke="rgba(91,174,224,0.3)" strokeWidth={1} />
            <Line x1={-10} y1={6}  x2={10} y2={6}  stroke="rgba(91,174,224,0.3)" strokeWidth={1} />
            <Path d="M 11,-8 C 15,-9 17,-8 19,-6 L 19,6 C 17,8 15,9 11,8 Z" fill="rgba(91,174,224,0.22)" stroke="rgba(91,174,224,0.5)" strokeWidth={0.7} />
            <Path d="M -11,-6 C -15,-7 -17,-6 -19,-4 L -19,4 C -17,6 -15,7 -11,6 Z" fill="rgba(91,174,224,0.12)" stroke="rgba(91,174,224,0.3)" strokeWidth={0.7} />
            {[[-12,-12],[11,-12],[-12,12],[11,12]].map(([wx,wy], wi) => (
              <G key={wi}>
                <Ellipse cx={wx} cy={wy} rx={4.5} ry={3} fill="#060f18" stroke="#1e3a50" strokeWidth={0.5} />
                <Ellipse cx={wx} cy={wy} rx={2.5} ry={1.7} fill="#1a3a5c" />
                <Circle  cx={wx} cy={wy} r={0.9} fill="#5BAEE0" />
              </G>
            ))}
            <Ellipse cx={17} cy={-5} rx={2.5} ry={1.5} fill={`rgba(91,174,224,${hlOpacity})`} />
            <Ellipse cx={17} cy={5}  rx={2.5} ry={1.5} fill={`rgba(91,174,224,${hlOpacity})`} />
            <Ellipse cx={-20} cy={-5} rx={2} ry={1.4} fill="rgba(220,55,55,0.75)" />
            <Ellipse cx={-20} cy={5}  rx={2} ry={1.4} fill="rgba(220,55,55,0.75)" />
          </G>
        </Svg>

        {/* Transparent tap targets for road stop pills + dots.
            TouchableOpacity children win the responder over the parent
            PanResponder on clean taps — the same mechanism as the banner dots. */}
        {stopPos.map((sp, i) => {
          const pl = Math.max(PILL_PAD, Math.min(sp.x - PILL_W / 2, CANVAS_W - PILL_W - PILL_PAD));
          return (
            <TouchableOpacity
              key={i}
              style={{
                position: "absolute",
                left: pl - 8,
                top: sp.y - 38,
                width: PILL_W + 16,
                height: 50,
              }}
              onPress={() => goToRef.current(i)}
              activeOpacity={1}
            />
          );
        })}
      </View>

      {/* ── Banner ── */}
      <View style={styles.banner}>
        <Animated.Text style={[styles.swipeLabel, { opacity: swipeLabelOpacity }]}>
          {"← SWIPE TO EXPLORE PLANS →"}
        </Animated.Text>

        {/* Dots — each is a TouchableOpacity so it wins the responder over the
            parent PanResponder on clean taps. The PanResponder only steals back
            when onMoveShouldSetPanResponder fires (dx > 10), which lets swipes
            starting on a dot still work. */}
        <View style={styles.dotsRow}>
          {[0, 1, 2].map(i => (
            <TouchableOpacity
              key={i}
              style={[
                styles.dotTouchable,
                i === 0 ? styles.dotLeft : i === 1 ? styles.dotCenter : styles.dotRight,
              ]}
              onPress={() => goToRef.current(i)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            >
              <Animated.View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === activeStop ? "#5BAEE0" : "#1e3a50",
                  transform: [{ scale: dotScales[i] }],
                }}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Plan panel ── */}
      <View style={styles.panel}>
        {/* Scrollable content — plan name, price, features */}
        <ScrollView
          style={styles.panelScroll}
          contentContainerStyle={styles.panelScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.planName}>{plan.name}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{plan.price}</Text>
            <Text style={styles.period}> {plan.period}</Text>
          </View>

          <View style={styles.featureList}>
            {plan.features.map(f => (
              <View key={f} style={styles.featureRow}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Subscribe button — pinned below scroll, always visible */}
        <View style={[styles.subscribeBtnWrap, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}>
          <TouchableOpacity
            style={styles.subscribeBtn}
            activeOpacity={0.85}
            onPress={() => Alert.alert("Coming soon", "In-app purchase checkout coming soon.")}
          >
            <Text style={styles.subscribeBtnText}>{plan.btnLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },

  // ── Header ───────────────────────────────────────────────────────────────────
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.bgPrimary,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerEnd: {
    width: 40, // mirrors topBarEnd width from Settings to keep wordmark centred
  },

  // ── Back button — identical to Settings screen ────────────────────────────────
  backArrow: { color: Colors.white, fontSize: 22 },

  // ── Wordmark / tagline (same styling as before, just repositioned) ────────────
  wordmark: {
    color: "#5BAEE0",
    fontSize: 9,
    letterSpacing: 1.6,
    fontWeight: "700",
    marginBottom: 5,
  },
  tagline: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "500",
  },

  // ── Banner ───────────────────────────────────────────────────────────────────
  banner: {
    height: BANNER_H,
    backgroundColor: "#030B11",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "rgba(30,58,80,0.27)",
    borderBottomColor: "rgba(30,58,80,0.27)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  swipeLabel: {
    color: "#445566",
    fontSize: 9,
    letterSpacing: 0.63,
  },
  dotsRow: {
    width: "100%",
    height: 10,
    position: "relative",
  },
  // Each dot is a TouchableOpacity absolutely positioned — the Animated.View
  // inside it carries the visual + scale transform.
  dotTouchable: {
    position: "absolute",
    top: 1,
  },
  dotLeft:   { left: 16 },
  dotCenter: { left: SCREEN_W / 2 - 4 },
  dotRight:  { right: 16 },

  // ── Plan panel ────────────────────────────────────────────────────────────────
  panel: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  panelScroll: {
    flex: 1,
  },
  panelScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 8,
  },
  subscribeBtnWrap: {
    paddingHorizontal: 18,
    paddingTop: 8,
    backgroundColor: Colors.bgPrimary,
  },
  planName: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: "500",
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 12,
  },
  price: {
    color: "#5BAEE0",
    fontSize: 30,
    fontWeight: "700",
  },
  period: {
    color: "#8899aa",
    fontSize: 12,
  },

  // ── Features ─────────────────────────────────────────────────────────────────
  featureList: {
    gap: 6,
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkmark: {
    color: "#5BAEE0",
    fontSize: 12,
    fontWeight: "700",
    width: 14,
  },
  featureText: {
    color: "#8899aa",
    fontSize: 11,
    flex: 1,
  },

  // ── Subscribe button ──────────────────────────────────────────────────────────
  subscribeBtn: {
    backgroundColor: "#5BAEE0",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  subscribeBtnText: {
    color: "#030B11",
    fontSize: 14,
    fontWeight: "500",
  },
});
