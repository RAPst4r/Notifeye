// Signal 2 — PERCLOS (Percentage of Eye Closure over time)
// PRIMARY SIGNAL. NHTSA-validated. Highest weight in the composite score.
// Defined as % of frames in a rolling 60s window where EAR < 0.20.
//
// Thresholds: < 0.08 alert | 0.08–0.15 mild | > 0.15 drowsy (alert fires)

import { EAR_DROWSY } from "./ear";

const WINDOW_FRAMES = 60 * 15; // 60s at 15fps = 900 frames
const MIN_FRAMES    = 75;       // need 5s of data before reporting

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

  /** Returns 0 until 5s of data is accumulated. */
  getPerclos() {
    if (this.frameBuffer.length < MIN_FRAMES) return 0;
    return this.frameBuffer.filter(Boolean).length / this.frameBuffer.length;
  }

  reset() {
    this.frameBuffer = [];
  }
}
