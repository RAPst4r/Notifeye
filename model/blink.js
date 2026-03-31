// Signal 4 — Blink Rate and Duration
// Alert drivers: 15–20 blinks/min at ~150ms each.
// Drowsy drivers: < 10 blinks/min and/or > 250ms average duration.
//
// A blink = EAR dips below 0.20 and returns within 80–500ms.
// Longer closures are caught by PERCLOS, not here.

import { EAR_DROWSY } from "./ear";

const BLINK_MIN_MS = 80;
const BLINK_MAX_MS = 500;
const WINDOW_MS    = 60_000; // 60-second rolling window

export class BlinkTracker {
  constructor() {
    this.blinkTimestamps = []; // ms timestamps of completed blinks
    this.blinkDurations  = []; // ms durations of completed blinks
    this._blinkStart     = null;
    this._inBlink        = false;
  }

  /**
   * Call once per frame with current EAR and timestamp (ms).
   */
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
   * Returns a 0–1 score contribution.
   * Slow rate (< 10/min) or long duration (> 250ms) both push toward 1.
   */
  getBlinkScore() {
    const rate     = this.getBlinkRate();
    const avgDur   = this.getAvgDurationMs();
    const rateScore    = rate > 0 ? Math.max(0, Math.min(1, (10 - rate) / 10)) : 0;
    const durationScore = avgDur > 0 ? Math.max(0, Math.min(1, (avgDur - 150) / 350)) : 0;
    return Math.max(rateScore, durationScore);
  }

  reset() {
    this.blinkTimestamps = [];
    this.blinkDurations  = [];
    this._inBlink        = false;
    this._blinkStart     = null;
  }
}
