// Composite drowsiness scorer
//
// TWO-TRACK design:
//
//   fatigue    — weighted sum of gradual signals (PERCLOS, head pose, EAR, blink, yawn).
//                NHTSA-validated weights. Captures accumulating drowsiness over minutes.
//
//   microsleep — sustainedClosure * 0.60. Captures acute events: eyes closed ≥ 3s → 0.60,
//                which alone crosses the 0.55 alert threshold.
//
// composite = max(fatigue, microsleep), capped at 1.0.
//
// Score levels:
//   0.00–0.30  alert
//   0.30–0.55  mild
//   0.55–0.75  drowsy  ← alert fires
//   0.75+      critical

export const ALERT_THRESHOLD = 0.55;
export const MICROSLEEP_WEIGHT = 0.60; // weight for sustained closure override

export const WEIGHTS = {
  perclos:  0.45,
  headPose: 0.25,
  ear:      0.18,
  blink:    0.08,
  yawn:     0.04,
};

/**
 * @param {Object} signals
 * @param {number} signals.sustainedClosure  0–1 (from SustainedClosureDetector.getScore())
 * @param {number} signals.perclos           0–1 (from PerclosTracker.getPerclos())
 * @param {number} signals.headPoseScore     0–1 (from getHeadPoseScore())
 * @param {number} signals.ear               raw EAR average (not pre-scored)
 * @param {number} signals.blinkScore        0–1 (from BlinkTracker.getBlinkScore())
 * @param {number} signals.yawnScore         0–1 (from YawnTracker.getYawnScore())
 * @returns {number} composite score 0–1
 */
export function computeDrowsinessScore({
  sustainedClosure,
  perclos,
  headPoseScore,
  ear,
  blinkScore,
  yawnScore,
}) {
  const earScore = Math.max(0, Math.min(1, (0.25 - ear) / 0.15));

  const fatigue =
    perclos       * WEIGHTS.perclos  +
    headPoseScore * WEIGHTS.headPose +
    earScore      * WEIGHTS.ear      +
    blinkScore    * WEIGHTS.blink    +
    yawnScore     * WEIGHTS.yawn;

  // Acute override: 3s sustained closure alone crosses the alert threshold
  const microsleep = sustainedClosure * MICROSLEEP_WEIGHT;

  return Math.min(Math.max(fatigue, microsleep), 1.0);
}

/**
 * Returns each signal's weighted contribution for debug display.
 */
export function getWeightedContributions({
  sustainedClosure,
  perclos,
  headPoseScore,
  ear,
  blinkScore,
  yawnScore,
}) {
  const earScore = Math.max(0, Math.min(1, (0.25 - ear) / 0.15));
  return {
    sustained: sustainedClosure * MICROSLEEP_WEIGHT,
    perclos:   perclos          * WEIGHTS.perclos,
    headPose:  headPoseScore    * WEIGHTS.headPose,
    ear:       earScore         * WEIGHTS.ear,
    blink:     blinkScore       * WEIGHTS.blink,
    yawn:      yawnScore        * WEIGHTS.yawn,
  };
}
