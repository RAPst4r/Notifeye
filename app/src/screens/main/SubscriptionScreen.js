import { useRef, useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  TouchableOpacity,
  Alert,
} from "react-native";
import Svg, {
  Path,
  Circle,
  G,
  Rect,
  Line,
  Text as SvgText,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../theme/colors";

// ── Screen dimensions ─────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ── Design reference (control points were authored at 280×350) ────────────────

const DESIGN_W = 280;
const DESIGN_H = 350;

// ── Road control points (Catmull-Rom, design-space) ──────────────────────────

const RAW_POINTS = [
  { x: 30,  y: 85  },
  { x: 100, y: 100 },
  { x: 210, y: 95  },
  { x: 248, y: 128 },
  { x: 225, y: 172 },
  { x: 105, y: 188 },
  { x: 48,  y: 220 },
  { x: 55,  y: 262 },
  { x: 190, y: 272 },
  { x: 255, y: 298 },
  { x: 265, y: 338 },
];

// ── Stop t-parameters and labels ──────────────────────────────────────────────

const STOP_T      = [0.08, 0.50, 0.92];
const STOP_LABELS = ["Free", "Family", "Extended+"];

// ── Plan data ─────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
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
    period: "month",
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
    period: "month",
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

// ── Static star positions (deterministic, design-space) ───────────────────────

const STATIC_STARS = Array.from({ length: 55 }, (_, i) => ({
  x: (i * 137.508 + 17) % DESIGN_W,
  y: (i * 63.112 + 11)  % (DESIGN_H * 0.6),
  r: 0.5 + (i % 5) * 0.22,
}));

// ── Catmull-Rom math ──────────────────────────────────────────────────────────

function crPoint(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * (2*p1.x + (-p0.x+p2.x)*t + (2*p0.x-5*p1.x+4*p2.x-p3.x)*t2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
    y: 0.5 * (2*p1.y + (-p0.y+p2.y)*t + (2*p0.y-5*p1.y+4*p2.y-p3.y)*t2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*t3),
  };
}

function samplePath(pts, t) {
  const n   = pts.length - 1;
  const seg = Math.min(Math.floor(t * n), n - 1);
  const lt  = t * n - seg;
  return crPoint(
    pts[Math.max(0, seg - 1)],
    pts[seg],
    pts[Math.min(n, seg + 1)],
    pts[Math.min(n, seg + 2)],
    lt,
  );
}

function angleDeg(pts, t) {
  const dt = 0.005;
  const a  = samplePath(pts, Math.max(0, t - dt));
  const b  = samplePath(pts, Math.min(1, t + dt));
  return Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI) + 90;
}

function buildRoadPath(pts, sx, sy) {
  const s = pts.map(p => ({ x: p.x * sx, y: p.y * sy }));
  let d = `M ${s[0].x.toFixed(1)} ${s[0].y.toFixed(1)}`;
  for (let i = 0; i < s.length - 1; i++) {
    const p0 = s[Math.max(0, i - 1)];
    const p1 = s[i];
    const p2 = s[i + 1];
    const p3 = s[Math.min(s.length - 1, i + 2)];
    const c1x = (p1.x + (p2.x - p0.x) / 6).toFixed(1);
    const c1y = (p1.y + (p2.y - p0.y) / 6).toFixed(1);
    const c2x = (p2.x - (p3.x - p1.x) / 6).toFixed(1);
    const c2y = (p2.y - (p3.y - p1.y) / 6).toFixed(1);
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SubscriptionScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const CANVAS_W = SCREEN_W;
  const CANVAS_H = SCREEN_H * 0.5;
  const SX = CANVAS_W / DESIGN_W;
  const SY = CANVAS_H / DESIGN_H;

  // ── Static geometry (memoised) ─────────────────────────────────────────────
  const roadPath     = useMemo(() => buildRoadPath(RAW_POINTS, SX, SY), [SX, SY]);
  const stopPositions = useMemo(
    () => STOP_T.map(t => { const p = samplePath(RAW_POINTS, t); return { x: p.x * SX, y: p.y * SY }; }),
    [SX, SY],
  );

  // ── Animation state ────────────────────────────────────────────────────────
  const [activeStop, setActiveStop] = useState(0);
  const activeStopRef = useRef(0);
  const vanTRef       = useRef(STOP_T[0]);
  const [anim, setAnim] = useState({ vanT: STOP_T[0], pulse: 0, headlight: 0.7, glowR: 18 });

  useEffect(() => { activeStopRef.current = activeStop; }, [activeStop]);

  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => {
      const elapsed   = (Date.now() - t0) / 1000;
      const pulse     = (Math.sin(elapsed * 2.2) + 1) / 2;
      const headlight = 0.35 + 0.45 * ((Math.sin(elapsed * 1.8) + 1) / 2);
      const glowR     = 17   + 5    * ((Math.sin(elapsed * 1.4) + 1) / 2);
      vanTRef.current += (STOP_T[activeStopRef.current] - vanTRef.current) * 0.07;
      setAnim({ vanT: vanTRef.current, pulse, headlight, glowR });
    }, 16);
    return () => clearInterval(id);
  }, []);

  // ── Swipe responder ────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, g) => Math.abs(g.dx) > 8,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -25) {
          const next = Math.min(2, activeStopRef.current + 1);
          activeStopRef.current = next;
          setActiveStop(next);
        } else if (g.dx > 25) {
          const prev = Math.max(0, activeStopRef.current - 1);
          activeStopRef.current = prev;
          setActiveStop(prev);
        }
      },
    }),
  ).current;

  // ── Derived van position ───────────────────────────────────────────────────
  const vanRaw   = samplePath(RAW_POINTS, anim.vanT);
  const vanX     = vanRaw.x * SX;
  const vanY     = vanRaw.y * SY;
  const vanAngle = angleDeg(RAW_POINTS, anim.vanT);

  const plan = PLANS[activeStop];
  const hl   = anim.headlight.toFixed(3);

  return (
    <View style={styles.root}>

      {/* ── Road canvas ── */}
      <View style={{ width: CANVAS_W, height: CANVAS_H }} {...panResponder.panHandlers}>
        <Svg width={CANVAS_W} height={CANVAS_H}>

          {/* Background */}
          <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="#030B11" />

          {/* Stars */}
          {STATIC_STARS.map((s, i) => (
            <Circle key={i} cx={s.x * SX} cy={s.y * SY} r={s.r} fill="rgba(91,174,224,0.10)" />
          ))}

          {/* Road — outer glow */}
          <Path d={roadPath} stroke="rgba(91,174,224,0.05)" strokeWidth={30} fill="none" strokeLinecap="round" />
          {/* Road — border */}
          <Path d={roadPath} stroke="#0d1e2b"              strokeWidth={23} fill="none" strokeLinecap="round" />
          {/* Road — surface */}
          <Path d={roadPath} stroke="#111d2b"              strokeWidth={17} fill="none" strokeLinecap="round" />
          {/* Road — inner surface */}
          <Path d={roadPath} stroke="#0f1a27"              strokeWidth={11} fill="none" strokeLinecap="round" />
          {/* Road — centre dashes */}
          <Path d={roadPath} stroke="rgba(91,174,224,0.09)" strokeWidth={1.2} fill="none" strokeLinecap="round" strokeDasharray="9 11" />

          {/* ── Stops ── */}
          {STOP_LABELS.map((label, i) => {
            const sp       = stopPositions[i];
            const isActive = i === activeStop;
            return (
              <G key={label}>
                {/* Pulse rings (active only) */}
                {isActive && [0, 1, 2].map(ri => (
                  <Circle
                    key={ri}
                    cx={sp.x}
                    cy={sp.y}
                    r={8 + anim.pulse * 10 + ri * 6}
                    fill="none"
                    stroke="rgba(91,174,224,0.08)"
                    strokeWidth={1.5}
                    opacity={Math.max(0, 1 - anim.pulse - ri * 0.25)}
                  />
                ))}
                {/* Pill background */}
                <Rect
                  x={sp.x - 23}
                  y={sp.y - 28}
                  width={46}
                  height={16}
                  rx={8}
                  fill={isActive ? "#5BAEE0" : "#0d1e2b"}
                  stroke={isActive ? "#5BAEE0" : "#1e3a50"}
                  strokeWidth={1}
                />
                {/* Pill label */}
                <SvgText
                  x={sp.x}
                  y={sp.y - 17}
                  textAnchor="middle"
                  fill={isActive ? "#030B11" : "#8899aa"}
                  fontSize={8}
                  fontWeight="600"
                >
                  {label}
                </SvgText>
                {/* Stop dot */}
                <Circle
                  cx={sp.x}
                  cy={sp.y}
                  r={isActive ? 6 : 3.5}
                  fill={isActive ? "#5BAEE0" : "#1e3a50"}
                />
              </G>
            );
          })}

          {/* ── Van glow ── */}
          <Circle cx={vanX} cy={vanY} r={anim.glowR} fill="none" stroke="rgba(91,174,224,0.10)" strokeWidth={7} />

          {/* ── Van body ── */}
          <G transform={`translate(${vanX.toFixed(1)} ${vanY.toFixed(1)}) rotate(${vanAngle.toFixed(1)})`}>
            {/* Outer body */}
            <Rect x={-11} y={-18} width={22} height={36} rx={4} fill="#1a3d60" stroke="#5BAEE0" strokeWidth={0.8} />
            {/* Centre panel */}
            <Rect x={-8}  y={-15} width={16} height={28} rx={2} fill="#1e4a75" />
            {/* Roof */}
            <Rect x={-7}  y={-12} width={14} height={22} rx={2} fill="#0a1a28" />
            {/* Panoramic roof rails */}
            <Line x1={-5} y1={-11} x2={-5} y2={9} stroke="rgba(91,174,224,0.3)" strokeWidth={1} />
            <Line x1={5}  y1={-11} x2={5}  y2={9} stroke="rgba(91,174,224,0.3)" strokeWidth={1} />
            {/* Front windshield */}
            <Rect x={-8} y={-18} width={16} height={7} rx={1.5} fill="rgba(91,174,224,0.25)" />
            <Line x1={0} y1={-18} x2={0} y2={-11} stroke="rgba(91,174,224,0.40)" strokeWidth={0.8} />
            {/* Rear window */}
            <Rect x={-7} y={11} width={14} height={5} rx={1} fill="rgba(91,174,224,0.15)" />
            {/* Door handle detail */}
            <Rect x={-14} y={-3} width={3} height={5} rx={1} fill="#0d1e2b" />
            <Rect x={11}  y={-3} width={3} height={5} rx={1} fill="#0d1e2b" />
            {/* Wheel — front-left */}
            <Rect x={-15} y={-17} width={5} height={8} rx={1.5} fill="#060f18" />
            <Rect x={-14} y={-16} width={3} height={6} rx={1}   fill="#1a3a5c" />
            <Circle cx={-12.5} cy={-13} r={1.5} fill="#5BAEE0" />
            {/* Wheel — front-right */}
            <Rect x={10} y={-17} width={5} height={8} rx={1.5} fill="#060f18" />
            <Rect x={11} y={-16} width={3} height={6} rx={1}   fill="#1a3a5c" />
            <Circle cx={12.5} cy={-13} r={1.5} fill="#5BAEE0" />
            {/* Wheel — rear-left */}
            <Rect x={-15} y={10} width={5} height={8} rx={1.5} fill="#060f18" />
            <Rect x={-14} y={11} width={3} height={6} rx={1}   fill="#1a3a5c" />
            <Circle cx={-12.5} cy={14} r={1.5} fill="#5BAEE0" />
            {/* Wheel — rear-right */}
            <Rect x={10} y={10} width={5} height={8} rx={1.5} fill="#060f18" />
            <Rect x={11} y={11} width={3} height={6} rx={1}   fill="#1a3a5c" />
            <Circle cx={12.5} cy={14} r={1.5} fill="#5BAEE0" />
            {/* Headlights (pulsing) */}
            <Circle cx={-6} cy={-20} r={2.5} fill={`rgba(91,174,224,${hl})`} />
            <Circle cx={6}  cy={-20} r={2.5} fill={`rgba(91,174,224,${hl})`} />
            {/* Tail lights */}
            <Rect x={-9} y={17} width={5} height={3} rx={1} fill="rgba(220,55,55,0.75)" />
            <Rect x={4}  y={17} width={5} height={3} rx={1} fill="rgba(220,55,55,0.75)" />
          </G>

        </Svg>

        {/* Header overlaid above canvas */}
        <View
          style={[StyleSheet.absoluteFill, styles.headerOverlay, { paddingTop: insets.top + 14 }]}
          pointerEvents="none"
        >
          <Text style={styles.wordmark}>NOTIFEYE</Text>
          <Text style={styles.tagline}>Your coverage journey</Text>
        </View>
      </View>

      {/* ── Plan panel ── */}
      <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Text style={styles.planName}>{plan.name}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{plan.price}</Text>
          <Text style={styles.period}> / {plan.period}</Text>
        </View>

        <View style={styles.featureList}>
          {plan.features.map(f => (
            <View key={f} style={styles.featureRow}>
              <Text style={styles.checkmark}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.subscribeBtn}
          activeOpacity={0.85}
          onPress={() => {
            if (activeStop === 0) {
              Alert.alert("You're on Free", "You already have access to all Free features.");
            } else {
              Alert.alert("Coming Soon", "In-app purchase checkout coming soon.");
            }
          }}
        >
          <Text style={styles.subscribeBtnText}>
            {activeStop === 0 ? "Get Started Free" : `Subscribe — ${plan.price}/mo`}
          </Text>
        </TouchableOpacity>
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

  // ── Header overlay ────────────────────────────────────────────────────────────
  headerOverlay: {
    alignItems: "center",
    justifyContent: "flex-start",
  },
  wordmark: {
    color: "#5BAEE0",
    fontSize: 9,
    letterSpacing: 1.6,
    fontWeight: "700",
    marginBottom: 6,
  },
  tagline: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "500",
  },

  // ── Plan panel ────────────────────────────────────────────────────────────────
  panel: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: "rgba(30,58,80,0.4)",
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  planName: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: "500",
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 14,
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

  // ── Feature list ──────────────────────────────────────────────────────────────
  featureList: {
    flex: 1,
    justifyContent: "center",
    gap: 7,
    marginBottom: 14,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
