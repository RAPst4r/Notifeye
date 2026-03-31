// Signal 1 — EAR (Eye Aspect Ratio)
// Thresholds: alert > 0.25 | drowsy < 0.20 | closed < 0.15

// MediaPipe landmark index sets — order: [p1, p2, p3, p4, p5, p6]
export const LEFT_EYE_INDICES  = [33, 160, 158, 133, 153, 144];
export const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];

export const EAR_ALERT  = 0.25;
export const EAR_DROWSY = 0.20;
export const EAR_CLOSED = 0.15;

function dist3d(a, b) {
  return Math.sqrt(
    (a.x - b.x) ** 2 +
    (a.y - b.y) ** 2 +
    (a.z - b.z) ** 2
  );
}

/**
 * Compute EAR for one eye from 6 landmarks in [p1..p6] order.
 * Uses 3D distances for stability when the driver turns their head.
 */
export function computeEAR(landmarks) {
  const [p1, p2, p3, p4, p5, p6] = landmarks;
  return (dist3d(p2, p6) + dist3d(p3, p5)) / (2 * dist3d(p1, p4));
}

/**
 * Extract left and right eye landmark arrays from a full 468-point result.
 * Returns { left, right, avg } EAR values.
 */
export function getEARFromLandmarks(allLandmarks) {
  const leftPts  = LEFT_EYE_INDICES.map((i) => allLandmarks[i]);
  const rightPts = RIGHT_EYE_INDICES.map((i) => allLandmarks[i]);
  const left  = computeEAR(leftPts);
  const right = computeEAR(rightPts);
  return { left, right, avg: (left + right) / 2 };
}
