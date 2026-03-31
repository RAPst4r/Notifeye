// Composite drowsiness scorer
// Weights derived from NHTSA validation data and 2024–2025 peer-reviewed studies.
// Update WEIGHTS after running the WAS optimizer against labeled test sessions.
//
// Score levels:
//   0.00–0.30  alert
//   0.30–0.55  mild
//   0.55–0.75  drowsy  ← alert fires
//   0.75+      critical

export const ALERT_THRESHOLD = 0.55;

export const WEIGHTS = {
  perclos:  0.45,
  headPose: 0.25,
  ear:      0.18,
  blink:    0.08,
  yawn:     0.04,
};

/**
 * @param {Object} signals
 * @param {number} signals.perclos      0–1 (from PerclosTracker.getPerclos())
 * @param {number} signals.headPoseScore 0–1 (from getHeadPoseScore())
 * @param {number} signals.ear          raw EAR average (not pre-scored)
 * @param {number} signals.blinkScore   0–1 (from BlinkTracker.getBlinkScore())
 * @param {number} signals.yawnScore    0–1 (from YawnTracker.getYawnScore())
 * @returns {number} composite score 0–1
 */
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

/**
 * Returns each signal's weighted contribution for debug display.
 */
export function getWeightedContributions({ perclos, headPoseScore, ear, blinkScore, yawnScore }) {
  const earScore = Math.max(0, Math.min(1, (0.25 - ear) / 0.15));
  return {
    perclos:  perclos       * WEIGHTS.perclos,
    headPose: headPoseScore * WEIGHTS.headPose,
    ear:      earScore      * WEIGHTS.ear,
    blink:    blinkScore    * WEIGHTS.blink,
    yawn:     yawnScore     * WEIGHTS.yawn,
  };
}
