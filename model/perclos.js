// Signal 2 — PERCLOS (Percentage of Eye Closure over time)
// PRIMARY SIGNAL. NHTSA-validated.
// Defined as % of frames in a rolling 30s window where EAR < 0.20.
//
// Thresholds: < 0.08 alert | 0.08–0.12 mild | > 0.12 drowsy

import { EAR_DROWSY, EAR_CLOSED } from "./ear";

const WINDOW_FRAMES = 30 * 15; // 30s at 15fps = 450 frames
const MIN_FRAMES    = 30;       // need 2s of data before reporting

export class PerclosTracker {
  constructor() {
    this.frameBuffer = [];
  }

  update(ear) {
    this.frameBuffer.push(ear < EAR_DROWSY);
    if (this.frameBuffer.length > WINDOW_FRAMES) {
      this.frameBuffer.shift();
    }
  }

  /** Returns 0 until 2s of data is accumulated. */
  getPerclos() {
    if (this.frameBuffer.length < MIN_FRAMES) return 0;
    return this.frameBuffer.filter(Boolean).length / this.frameBuffer.length;
  }

  reset() {
    this.frameBuffer = [];
  }
}

// ── SustainedClosureDetector ──────────────────────────────────────────────────
//
// Tracks consecutive frames where EAR < 0.15 (eyes nearly/fully closed).
// At 15fps, 45 consecutive closed frames = 3 seconds → score reaches 1.0.
// This score feeds directly into the composite as an override (not additive),
// so 3s of sustained closure alone crosses the 0.55 alert threshold.

const CLOSURE_ALERT_FRAMES = 45; // 3 seconds at 15fps

export class SustainedClosureDetector {
  constructor() {
    this._count = 0;
  }

  update(ear) {
    if (ear < EAR_CLOSED) {
      this._count++;
    } else {
      this._count = 0; // reset on any open-eye frame
    }
  }

  /** Ramps 0→1 as eyes stay closed for 0→3 consecutive seconds. */
  getScore() {
    return Math.min(1, this._count / CLOSURE_ALERT_FRAMES);
  }

  reset() {
    this._count = 0;
  }
}
