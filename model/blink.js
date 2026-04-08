// Signal 4 — Blink Rate and Duration
// Alert drivers: 15–20 blinks/min at ~150ms each.
// Drowsy drivers: < 10 blinks/min and/or accumulating heavy blinks.
//
// A blink = EAR dips below 0.20 and returns within 80–500ms.
// Longer closures are caught by PERCLOS / SustainedClosureDetector, not here.
//
// HEAVY BLINK — asymmetric closure profile:
//   Slow close (eyelid drooping under fatigue) then fast open (snap-back reflex).
//   Detected using time thresholds — rate ratios are too noisy at 15fps.
//   Criteria: closing phase ≥ 200ms AND closing took ≥ 1.5× longer than opening.
//
// HEAVY BLINK SCORE — exponential time-decay:
//   Each confirmed heavy blink contributes a weight that halves every 90s.
//   Score bleeds smoothly back to 0 when no new heavy blinks occur.
//   Normal fast blinks never affect this score.

import { EAR_DROWSY } from "./ear";

const BLINK_MIN_MS        = 80;      // minimum blink duration to record
const BLINK_MAX_MS        = 500;     // maximum blink duration (longer = PERCLOS territory)
const WINDOW_MS           = 60_000;  // 60s rolling window for rate/duration stats
const MIN_HEAVY_FRAMES    = 4;       // need ≥4 frames below threshold (~265ms) before classifying
const MIN_CLOSING_MS      = 200;     // closing phase must take ≥200ms (≥3 frames at 15fps)
const TIME_ASYMMETRY      = 1.5;     // closing must take ≥1.5× longer than opening (time-based)
const HEAVY_BLINK_MAX     = 10;      // weighted count at which score reaches 1.0
const HALF_LIFE_MS        = 90_000;  // exponential decay half-life (90s)
const PRUNE_MS            = 600_000; // prune heavy blink entries older than 10 min

export class BlinkTracker {
  constructor() {
    // Rolling window stats (all blinks)
    this.blinkTimestamps = [];
    this.blinkDurations  = [];

    // Per-blink accumulator (reset each blink)
    this._inBlink   = false;
    this._earValues = []; // EAR sample each frame inside current blink
    this._earTimes  = []; // timestamp (ms) for each frame inside current blink

    // Heavy blink history with timestamps for exponential decay
    this.heavyBlinkTimestamps = [];
  }

  /** Call once per frame with current EAR and timestamp (ms). */
  update(ear, nowMs) {
    if (!this._inBlink && ear < EAR_DROWSY) {
      // Blink starts
      this._inBlink   = true;
      this._earValues = [ear];
      this._earTimes  = [nowMs];

    } else if (this._inBlink && ear < EAR_DROWSY) {
      // Still inside blink — accumulate frame
      this._earValues.push(ear);
      this._earTimes.push(nowMs);

    } else if (this._inBlink && ear >= EAR_DROWSY) {
      // Blink ends
      const duration = nowMs - this._earTimes[0];

      if (duration >= BLINK_MIN_MS && duration <= BLINK_MAX_MS) {
        // Record for rate / duration stats
        this.blinkTimestamps.push(nowMs);
        this.blinkDurations.push(duration);

        // Classify as heavy or normal using asymmetric closure profile
        this._classifyBlink(nowMs);
      }

      this._inBlink   = false;
      this._earValues = [];
      this._earTimes  = [];
    }

    // Prune blink-rate window
    const cutoff = nowMs - WINDOW_MS;
    while (this.blinkTimestamps.length && this.blinkTimestamps[0] < cutoff) {
      this.blinkTimestamps.shift();
      this.blinkDurations.shift();
    }
  }

  /**
   * Classify blink as heavy using time-based asymmetry.
   * Rate ratios are unreliable at 15fps (2-4 samples/blink = too noisy).
   * Instead: require the closing phase to be slow in absolute terms AND
   * meaningfully longer than the opening phase.
   */
  _classifyBlink(nowMs) {
    const vals  = this._earValues;
    const times = this._earTimes;
    const last  = vals.length - 1;

    // Gate 1: need enough frames to have a meaningful two-phase split
    if (last + 1 < MIN_HEAVY_FRAMES) return;

    const earMin   = Math.min(...vals);
    const minIndex = vals.indexOf(earMin);

    // Gate 2: need a real closing phase AND a real opening phase
    if (minIndex === 0 || minIndex === last) return;

    const closingMs = times[minIndex] - times[0];
    const openingMs = times[last]     - times[minIndex];

    // Gate 3: closing phase must be genuinely slow (≥200ms = ≥3 frames at 15fps)
    // This alone eliminates fast blinks regardless of how the frames happen to align.
    if (closingMs < MIN_CLOSING_MS) return;

    // Gate 4: closing took meaningfully longer than opening (time asymmetry)
    // Using time directly, not rate, because EAR magnitude is noisy at threshold.
    if (closingMs < openingMs * TIME_ASYMMETRY) return;

    this.heavyBlinkTimestamps.push(nowMs);
  }

  getBlinkRate() {
    return this.blinkTimestamps.length; // blinks in last 60s = blinks/min
  }

  getAvgDurationMs() {
    if (!this.blinkDurations.length) return 0;
    return this.blinkDurations.reduce((a, b) => a + b, 0) / this.blinkDurations.length;
  }

  /**
   * Exponential time-decay weighted heavy blink score (0–1).
   * Each heavy blink contributes weight that halves every 90s.
   * Score bleeds smoothly to 0 when no new heavy blinks occur.
   */
  getHeavyBlinkScore() {
    const now = Date.now();

    // Prune entries too old to matter
    while (
      this.heavyBlinkTimestamps.length &&
      now - this.heavyBlinkTimestamps[0] > PRUNE_MS
    ) {
      this.heavyBlinkTimestamps.shift();
    }

    let weighted = 0;
    for (const ts of this.heavyBlinkTimestamps) {
      weighted += Math.exp(-(now - ts) * Math.LN2 / HALF_LIFE_MS);
    }

    return Math.min(1, weighted / HEAVY_BLINK_MAX);
  }

  /**
   * Overall blink score (0–1): max of heavy blink score, slow rate, and long avg duration.
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
    this.blinkTimestamps      = [];
    this.blinkDurations       = [];
    this.heavyBlinkTimestamps = [];
    this._inBlink             = false;
    this._earValues           = [];
    this._earTimes            = [];
  }
}
