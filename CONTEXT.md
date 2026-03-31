# Notifeye — Project Context

> Drop this file in the root of your repo. It gives Claude Code full context on what
> Notifeye is, how it works, and what you're building toward.
>
> READ THIS FILE BEFORE WRITING ANY CODE. The detection engine (Phase 1) is the
> highest-priority work. Do not scaffold UI, auth, or backend until Phase 1 is tuned
> and working accurately on a real physical device.

---

## !! CURRENT PRIORITY: Phase 1 — Detection Engine !!

**This is what we are building right now. Everything else waits.**

The entire value of Notifeye lives in how accurately the app detects drowsiness. A
beautiful UI on top of a weak detection engine is worthless. A plain debug screen on
top of a highly accurate engine is a product.

### What Phase 1 means in practice

1. Integrate MediaPipe Face Mesh (`@mediapipe/tasks-vision`) into the Expo app
2. Open the front camera in a background session when driving starts
3. Process frames at 15–20fps through the 5-signal detection stack (see below)
4. Trigger a loud audible alert (expo-av) when composite drowsiness score >= 0.55
5. Show a developer debug screen with all signal values updating in real time —
   this is the only UI needed in Phase 1

Do not build onboarding, settings, subscription, or parent notification screens
until Phase 1 detection is tuned and accurate. The debug screen IS the Phase 1 UI.

---

## Detection engine — 5-signal stack

### Library: MediaPipe Face Mesh, NOT ML Kit

Use `@mediapipe/tasks-vision` — the modern MediaPipe Tasks API. This gives 468 3D
landmarks per frame plus a facial transformation matrix for head pose. ML Kit's face
detection only returns binary eye-open/closed and 6 landmarks — not enough precision
for this signal stack.

```js
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export async function initFaceLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );
  return await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.6,
    minFacePresenceConfidence: 0.6,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: true,
  });
}
```

---

### Signal 1 — EAR (Eye Aspect Ratio)

Per-frame eye closure value. Fast — catches a single closing event in real time.

```
EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
```

MediaPipe landmark indices:
- Left eye:  [33, 160, 158, 133, 153, 144]
- Right eye: [362, 385, 387, 263, 373, 380]
- Order:     [p1,  p2,  p3,  p4,  p5,  p6]

Use 3D (x, y, z) landmark distances — more stable when the driver turns their head.

Thresholds: Alert > 0.25 | Drowsy < 0.20 | Closed < 0.15

---

### Signal 2 — PERCLOS (Percentage of Eye Closure over time)

PRIMARY SIGNAL. NHTSA-validated. Highest weight in the composite score.

Defined as the percentage of frames in a rolling 60-second window where eyes are
80%+ closed (EAR < 0.20). Catches the pattern of increasingly long closures that
precedes a microsleep — something a per-frame EAR threshold cannot catch.

```js
const WINDOW_FRAMES = 60 * 15; // 60s at 15fps = 900 frames
const EAR_CLOSED_THRESHOLD = 0.20;

class PerclosTracker {
  constructor() { this.frameBuffer = []; }
  update(ear) {
    this.frameBuffer.push(ear < EAR_CLOSED_THRESHOLD);
    if (this.frameBuffer.length > WINDOW_FRAMES) this.frameBuffer.shift();
  }
  getPerclos() {
    if (this.frameBuffer.length < 75) return 0; // need 5s of data minimum
    return this.frameBuffer.filter(Boolean).length / this.frameBuffer.length;
  }
}
```

Thresholds: < 0.08 alert | 0.08–0.15 mild | > 0.15 drowsy — alert fires

---

### Signal 3 — Head pose (pitch and yaw)

Extracted from the 4x4 facial transformation matrix MediaPipe returns per frame.

- Pitch > 15°  — head drooping forward (strong drowsiness signal, often precedes
  eye closure)
- |Yaw| > 30°  — looking away from road (distraction signal)

```js
export function extractHeadPose(transformationMatrix) {
  const m = transformationMatrix.data;
  const pitch = Math.asin(-m[6]) * (180 / Math.PI);
  const yaw   = Math.atan2(m[2], m[10]) * (180 / Math.PI);
  return { pitch, yaw };
}
```

---

### Signal 4 — Blink rate and duration

Alert drivers blink 15–20 times/min at ~150ms each. Drowsy drivers blink slower
(< 10/min) and longer (> 250ms average duration). Track both in a 60s rolling window.

Count blinks where EAR dips below 0.20 and returns within 80–500ms. Longer closures
are caught by PERCLOS, not here.

---

### Signal 5 — MAR (Mouth Aspect Ratio / yawning)

Same geometry as EAR applied to mouth landmarks. A yawn is MAR > 0.60 sustained
for > 1 second. Treat as an infrequent but strong one-way booster — presence of a
yawn raises the score; absence does not lower it.

Key mouth landmark indices: corners 61 and 291, top 12/13, bottom 14/15.

---

### Composite score and alert logic

```js
// Research-optimized weights
// Derived from NHTSA validation data and 2024–2025 peer-reviewed drowsiness studies.
// Update WEIGHTS after running the WAS optimizer against labeled test sessions.
const WEIGHTS = {
  perclos:   0.45,   // NHTSA-validated, highest consistency across individuals
  headPose:  0.25,   // critical for non-standard positions and nodding
  ear:       0.18,   // fast frame-level signal; PERCLOS lags by design
  blink:     0.08,   // less consistent across individuals
  yawn:      0.04,   // infrequent, high variance — booster not primary signal
};

// Alert fires when composite score >= 0.55
export function computeDrowsinessScore({ perclos, headPoseScore, ear, blinkScore, yawnScore }) {
  const earScore = Math.max(0, Math.min(1, (0.25 - ear) / 0.15));
  return Math.min(
    perclos       * WEIGHTS.perclos  +
    headPoseScore * WEIGHTS.headPose +
    earScore      * WEIGHTS.ear      +
    blinkScore    * WEIGHTS.blink    +
    yawnScore     * WEIGHTS.yawn,
    1.0
  );
}
```

Score levels: 0.00–0.30 alert | 0.30–0.55 mild | 0.55–0.75 drowsy (alert fires) | 0.75+ critical

---

### Weight optimization formula — use when testing begins

When you have labeled test sessions, use the Weighted Accuracy Score (WAS) to find
the optimal weight vector. The 65/35 split reflects that a missed alert (false
negative) is more dangerous than an unnecessary beep (false positive).

```
WAS(w) = (TP / (TP + FN)) × 0.65   ← sensitivity: catch rate
        + (TN / (TN + FP)) × 0.35   ← specificity: quiet rate

Goal: maximize WAS(w) over all weight vectors w where sum(w) = 1.0
```

Grid search script (run on laptop against labeled sessions, lives in /model):

```python
import numpy as np
from itertools import product

ALERT_THRESHOLD = 0.55
FN_WEIGHT = 0.65  # penalty weight for missed drowsy events
FP_WEIGHT = 0.35  # penalty weight for false alarms

def score_weights(weights, sessions):
  TP = FP = TN = FN = 0
  for s in sessions:
    predicted = sum(w * v for w, v in zip(weights, s["signals"])) >= ALERT_THRESHOLD
    actual = s["ground_truth"] == 1
    if predicted and actual:       TP += 1
    elif predicted and not actual: FP += 1
    elif not predicted and actual: FN += 1
    else:                          TN += 1
  sensitivity = TP / (TP + FN) if (TP + FN) > 0 else 0
  specificity = TN / (TN + FP) if (TN + FP) > 0 else 0
  return sensitivity * FN_WEIGHT + specificity * FP_WEIGHT

def find_optimal_weights(sessions, step=0.05):
  # sessions format: [{"ground_truth": 1, "signals": [perclos, head_pose, ear, blink, yawn]}, ...]
  best_score, best_weights = 0, None
  for combo in product(np.arange(0, 1.0 + step, step), repeat=5):
    if abs(sum(combo) - 1.0) > 0.01: continue
    was = score_weights(list(combo), sessions)
    if was > best_score:
      best_score, best_weights = was, combo
  return best_weights
```

Labeling protocol for test sessions:
- True positives: drive after 5+ hours sleep deprivation, late night (11pm+),
  post-lunch highway
- True negatives: drive after full sleep, short daytime trip, familiar route
- Edge cases: glasses, bright sunlight, frequent mirror checks (head turning)
- Minimum before trusting results: 20 sessions (10 drowsy, 10 alert)
- Target before locking production weights: 50+ sessions

---

### Phase 1 developer debug screen (required output)

The only UI to build in Phase 1. All values update in real time from the camera.

Display live:
- EAR value (left, right, average)
- PERCLOS % (rolling 60s)
- Head pitch and yaw (degrees)
- Blink rate (per minute) and average blink duration (ms)
- Yawn count (session total)
- Composite drowsiness score (0.00–1.00)
- Alert threshold line at 0.55
- Each signal's weighted contribution to the score
- Log of last 10 alerts with timestamps

The debug screen is the tuning instrument. Do not ship anything else until the
numbers here look right across multiple real driving sessions.

---

## What Notifeye is

A mobile app that uses real-time eye tracking via the front-facing camera (mounted
on a dash mount) to detect drowsy driving and sound an audible alert. Everything
runs on-device — no camera frames are ever sent to a server.

**Tagline:** "Drive into a safer future with Notifeye"

**Stage:** Pre-revenue. LLC formed. Solo founder. Working Python proof-of-concept
using OpenCV + MediaPipe already built and tested with real users (truck driver,
teen driver, bus driver).

---

## The problem

Drowsy driving is one of the leading causes of accident-related deaths in America.
Most drivers have nothing watching out for them. Existing solutions (e.g. Tesla's
driver monitoring) require buying a $40,000+ vehicle. Notifeye works on any car,
requires no hardware beyond a phone, and is accessible to any family.

---

## Target customers

**Primary beachhead:** Parents of teen drivers in the Austin, TX area.
- Teens are sleep-deprived, statistically the most at-risk group on the road
- Parents are willing to pay for family safety (cf. Life360)
- Word-of-mouth spreads naturally through parent communities and schools

**Secondary:** Long-haul truck drivers (3.5M in the US)

**Long-term:** Insurance telematics partnerships, fleet monitoring, licensing tech
to automakers

---

## Subscription tiers

| Tier | Price | What's included |
|------|-------|-----------------|
| Free | $0 | Real-time drowsiness alerts for the driver |
| Individual | $5.99/mo | Driving reports, incident history, safety scores |
| Family | $10.99/mo | Push notifications to a parent when an alert fires. Covers 2 drivers. |
| Family Extended | $15.99/mo | Everything in Family, up to 4–5 drivers on one plan |

The Family tier ($10.99) is the primary revenue driver and the recommended plan
in the paywall UI.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Mobile app | Expo (React Native) — cross-platform iOS + Android |
| On-device detection | `@mediapipe/tasks-vision` — 468 3D landmarks, GPU-accelerated |
| Auth | Firebase Auth (email + Google Sign-In) |
| Real-time data | Firestore — parent/teen sync, alert history, family links |
| Push notifications | Expo Notifications + Firebase Cloud Messaging |
| Backend API | FastAPI on Railway — Phase 3 only, do not add before then |
| Subscriptions | RevenueCat — handles App Store + Play Store billing |
| Crash reporting | Sentry |

---

## Repository structure

```
notifeye/
├── app/          # Expo (React Native) — the mobile app
├── backend/      # FastAPI — DO NOT scaffold until Phase 3
├── model/        # Detection signals, trackers, composite scorer, WAS optimizer
├── CONTEXT.md    # This file
└── README.md
```

---

## Firestore data model

```
users/{uid}
  - uid: string
  - email: string
  - name: string
  - role: "driver" | "parent"
  - subscriptionTier: "free" | "individual" | "family" | "family_extended"
  - linkedUserIds: string[]
  - inviteCode: string
  - createdAt: timestamp
  - quietHoursStart: string | null
  - quietHoursEnd: string | null

trips/{tripId}
  - driverId: string
  - startTime: timestamp
  - endTime: timestamp
  - alertCount: number
  - alertTimestamps: timestamp[]
  - safetyScore: number
  - durationMinutes: number

alerts/{alertId}
  - tripId: string
  - driverId: string
  - timestamp: timestamp
  - alertType: "drowsy" | "distracted"
  - notifiedParents: boolean
```

---

## Build phases (in order)

### Phase 0 — Repo + Expo scaffold
Init Expo project in /app, GitHub repo. No backend folder yet.

### Phase 1 — Detection engine + debug screen ← CURRENT
MediaPipe Face Mesh, all 5 signals, composite scorer, audible alert, debug screen,
WAS weight tuning against labeled sessions.
Gate: do not proceed until alert accuracy is high on a real physical device.

### Phase 2 — Auth + user accounts
Firebase Auth, Firestore profiles, family invite code linking, onboarding screens.

### Phase 3 — Parent push notifications
Expo Notifications + FCM, FastAPI backend (scaffold here, not before), alert
fan-out to linked parents, parent notification feed.

### Phase 4 — Trip reports + safety scores
Trip session recording, safety score algorithm, history screen, weekly trends chart.

### Phase 5 — Subscriptions
RevenueCat, paywall UI with Family tier highlighted, feature gating per tier.

### Phase 6 — Beta launch
TestFlight + Google Play internal track, privacy policy, App Store assets, Sentry.

Do not move to the next phase until the current one works on a real physical device.

---

## What success looks like (Summer 2026)

- Beta app live on TestFlight and Google Play internal track
- Structured pilot with parents of teen drivers in Austin
- Presence in local high schools and middle schools
- Technical co-founder recruited (target: ECE student at UT Austin)
- Y Combinator application ready for Fall 2026
- Foundation laid for Forty Acres Founders and Freed Family Pitch Competitions
  (Spring 2027)

---

## Competitive landscape

- Tesla Driver Monitoring — closest direct competitor, locked to one $40K+ vehicle
- Apple / Android safety features — general driver safety, no real-time eye tracking
- Notifeye's moat — car-agnostic, hardware-free, privacy-first (on-device), built
  specifically for the consumer market (parents of teens)

---

## Hard constraints — never violate these

- Never send camera frames, facial landmarks, or eye tracking data to any server
- All detection logic runs on-device only, always
- Keep the free tier fully functional — it is the acquisition funnel
- The Family tier ($10.99) is the primary conversion target
- Always test camera and detection on a real physical device, not a simulator
- Do not scaffold the FastAPI backend until Phase 3
- Do not build any app UI beyond the debug screen until Phase 1 is tuned
- Use `@mediapipe/tasks-vision` — not the legacy `@mediapipe/face_mesh` package
