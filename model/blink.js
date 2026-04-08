// Signal 4 — Blink Rate and Duration
// Alert drivers: 15–20 blinks/min at ~150ms each.
// Drowsy drivers: < 10 blinks/min and/or accumulating heavy blinks (> 200ms).
//
// A blink = EAR dips below 0.20 and returns within 80–500ms.
// Longer closures are caught by PERCLOS / SustainedClosureDetector, not here.
//
// Heavy blink score: counts blinks > 200ms in the rolling window.
// At 10 heavy blinks the score reaches 1.0, indicating significant eye fatigue.

import { EAR_DROWSY } from "./ear";

const BLINK_MIN_MS    = 80;
const BLINK_MAX_MS    = 500;
const WINDOW_MS       = 60_000; // 60-second rolling window
const HEAVY_BLINK_MS  = 200;    // threshold for "heavy" (fatigued) blink
const HEAVY_BLINK_MAX = 10;     // 10 heavy blinks in window = score 1.0

export class BlinkTracker {
  constructor() {
    this.blinkTimestamps = []; // ms timestamps of completed blinks
    this.blinkDurations  = []; // ms durations of completed blinks
    this._blinkStart     = null;
    this._inBlink        = false;
  }

  /** Call once per frame with current EAR and timestamp (ms). */
  update(ear, nowMs) {
    if (!this._inBlink && ear < EAR_DROWSY) {
      this._inBlink    = true;
      this._blinkStart = nowMs;
    } else if (this._inBlink && ear >= EAR_DROWSY) {
      const duration = nowMs - this._blinkStart;
      if (duration >= BLINK_MIN_MS && duration <= BLINK_MAX_MS) {
        this.blinkTimestamps.push(nowMs);
        this.blinkDurations.push(duration);
      }
      this._inBlink    = false;
      this._blinkStart = null;
    }

    // Prune entries outside the 60s window
    const cutoff = nowMs - WINDOW_MS;
    while (this.blinkTimestamps.length && this.blinkTimestamps[0] < cutoff) {
      this.blinkTimestamps.shift();
      this.blinkDurations.shift();
    }
  }

  getBlinkRate() {
    return this.blinkTimestamps.length; // blinks in last 60s = blinks/min
  }

  getAvgDurationMs() {
    if (!this.blinkDurations.length) return 0;
    return this.blinkDurations.reduce((a, b) => a + b, 0) / this.blinkDurations.length;
  }

  /**
   * Heavy blink score: 0→1 as slow blinks accumulate 0→10 in the 60s window.
   * Heavy blink = duration > 200ms (eye struggling to stay open).
   */
  getHeavyBlinkScore() {
    const heavyCount = this.blinkDurations.filter((d) => d > HEAVY_BLINK_MS).length;
    return Math.min(1, heavyCount / HEAVY_BLINK_MAX);
  }

  /**
   * Returns a 0–1 score contribution.
   * Takes the max of: heavy blink accumulation, slow rate, and long average duration.
   */
  getBlinkScore() {
    const heavyScore    = this.getHeavyBlinkScore();
    const rate          = this.getBlinkRate();
    const avgDur        = this.getAvgDurationMs();
    const rateScore     = rate > 0 ? Math.max(0, Math.min(1, (10 - rate) / 10)) : 0;
    const durationScore = avgDur > 0 ? Math.max(0, Math.min(1, (avgDur - 150) / 350)) : 0;
    return Math.max(heavyScore, rateScore, durationScore);
  }

  reset() {
    this.blinkTimestamps = [];
    this.blinkDurations  = [];
    this._inBlink        = false;
    this._blinkStart     = null;
  }
}
