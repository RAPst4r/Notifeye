// Signal 5 — MAR (Mouth Aspect Ratio / yawning)
// A yawn = MAR > 0.60 sustained for > 1 second.
// Treat as an infrequent but strong one-way booster:
//   presence of a yawn raises the composite score; absence does not lower it.

// Mouth landmark indices
export const MOUTH_INDICES = {
  leftCorner:  61,
  rightCorner: 291,
  topOuter:    12,
  topInner:    13,
  bottomInner: 14,
  bottomOuter: 15,
};

export const MAR_YAWN_THRESHOLD = 0.60;
const YAWN_SUSTAIN_MS = 1000;

function dist2d(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Compute MAR from full 468-point landmark array.
 */
export function getMARFromLandmarks(allLandmarks) {
  const { leftCorner, rightCorner, topOuter, bottomOuter } = MOUTH_INDICES;
  const horizontal = dist2d(allLandmarks[leftCorner], allLandmarks[rightCorner]);
  const vertical   = dist2d(allLandmarks[topOuter], allLandmarks[bottomOuter]);
  if (horizontal === 0) return 0;
  return vertical / horizontal;
}

export class YawnTracker {
  constructor() {
    this.yawnCount    = 0;
    this._yawnStart   = null;
    this._inYawn      = false;
    this._yawnScore   = 0; // decays after yawn event
    this._yawnTs      = null;
  }

  update(mar, nowMs) {
    if (!this._inYawn && mar > MAR_YAWN_THRESHOLD) {
      this._inYawn  = true;
      this._yawnStart = nowMs;
    } else if (this._inYawn && mar <= MAR_YAWN_THRESHOLD) {
      const duration = nowMs - this._yawnStart;
      if (duration >= YAWN_SUSTAIN_MS) {
        this.yawnCount++;
        this._yawnScore = 1.0;
        this._yawnTs    = nowMs;
      }
      this._inYawn    = false;
      this._yawnStart = null;
    }

    // Decay yawn score over 60s after the event
    if (this._yawnTs !== null) {
      const elapsed = nowMs - this._yawnTs;
      this._yawnScore = Math.max(0, 1.0 - elapsed / 60_000);
    }
  }

  getYawnScore() {
    return this._yawnScore;
  }

  reset() {
    this.yawnCount  = 0;
    this._inYawn    = false;
    this._yawnStart = null;
    this._yawnScore = 0;
    this._yawnTs    = null;
  }
}
