// Signal 4 — Blink Rate, Heavy Blinks, and Rapid Blinking
//
// THREE sub-signals, all 0–1, combined via max() into blinkScore:
//
// 1. HEAVY BLINKS — slow-close profile (eyelid fighting gravity)
//    Criterion: closing phase ≥ 130ms (≥2 frames at 15fps).
//    At 15fps, opening-phase timing is too noisy to use as a ratio — slow
//    closing alone is the reliable indicator of fatigue. Score uses exponential
//    decay (half-life 90s) so it bleeds back to 0 when driver recovers.
//
// 2. RAPID BLINKING — fighting to stay awake
//    Criterion: > 6 blinks in the last 15s (= >24/min). Rapid blinking is a
//    classic microsleep-avoidance behaviour. Score also decays exponentially
//    (half-life 60s — shorter because it's a shorter-term signal).
//
// 3. SLOW BLINK RATE — classic drowsy signal
//    < 10 blinks/min → score rises. Already existed, unchanged.

import { EAR_DROWSY } from "./ear";

// General
const BLINK_MIN_MS          = 80;      // minimum blink duration to record
const BLINK_MAX_MS          = 500;     // maximum blink duration (longer = PERCLOS territory)
const WINDOW_MS             = 60_000;  // 60s rolling window for rate/avg duration stats

// Heavy blink
const MIN_HEAVY_FRAMES      = 3;       // need ≥3 frames below threshold to classify
const MIN_CLOSING_MS        = 130;     // closing phase must take ≥130ms (≥2 frames at 15fps)
const HEAVY_BLINK_MAX       = 10;      // weighted count at score 1.0
const HEAVY_HALF_LIFE_MS    = 90_000;  // each heavy blink loses half weight every 90s
const HEAVY_PRUNE_MS        = 600_000; // prune entries older than 10 min

// Rapid blink
const RAPID_WINDOW_MS       = 15_000;  // 15s window for burst detection
const RAPID_BLINK_THRESHOLD = 6;       // > 6 blinks in 15s = rapid burst (>24/min)
const RAPID_BLINK_MAX       = 5;       // 5 rapid events = score 1.0
const RAPID_HALF_LIFE_MS    = 60_000;  // decays faster — shorter-term signal
const RAPID_PRUNE_MS        = 300_000; // prune entries older than 5 min

export class BlinkTracker {
  constructor() {
    // Rolling window: all blinks
    this.blinkTimestamps = [];
    this.blinkDurations  = [];

    // Per-blink accumulator — reset on each blink
    this._inBlink   = false;
    this._earValues = []; // EAR per frame inside current blink
    this._earTimes  = []; // timestamp (ms) per frame inside current blink

    // Exponential-decay event logs
    this.heavyBlinkTimestamps = [];
    this.rapidBlinkTimestamps = [];
  }

  /** Call once per frame with current EAR and timestamp (ms). */
  update(ear, nowMs) {
    if (!this._inBlink && ear < EAR_DROWSY) {
      this._inBlink   = true;
      this._earValues = [ear];
      this._earTimes  = [nowMs];

    } else if (this._inBlink && ear < EAR_DROWSY) {
      this._earValues.push(ear);
      this._earTimes.push(nowMs);

    } else if (this._inBlink && ear >= EAR_DROWSY) {
      const duration = nowMs - this._earTimes[0];

      if (duration >= BLINK_MIN_MS && duration <= BLINK_MAX_MS) {
        this.blinkTimestamps.push(nowMs);
        this.blinkDurations.push(duration);
        this._classifyHeavy(nowMs);
        this._checkRapid(nowMs);
      }

      this._inBlink   = false;
      this._earValues = [];
      this._earTimes  = [];
    }

    // Prune 60s window
    const cutoff = nowMs - WINDOW_MS;
    while (this.blinkTimestamps.length && this.blinkTimestamps[0] < cutoff) {
      this.blinkTimestamps.shift();
      this.blinkDurations.shift();
    }
  }

  /**
   * Heavy blink: slow closing phase (≥130ms = ≥2 frames at 15fps).
   * Opening phase NOT measured — too few samples at 15fps to reliably compute ratio.
   */
  _classifyHeavy(nowMs) {
    const vals  = this._earValues;
    const times = this._earTimes;

    if (vals.length < MIN_HEAVY_FRAMES) return;

    const earMin   = Math.min(...vals);
    const minIndex = vals.indexOf(earMin);

    // Need a real closing phase (minimum not at the very start)
    if (minIndex === 0) return;

    const closingMs = times[minIndex] - times[0];

    if (closingMs >= MIN_CLOSING_MS) {
      this.heavyBlinkTimestamps.push(nowMs);
    }
  }

  /**
   * Rapid burst: > RAPID_BLINK_THRESHOLD blinks in the last 15s.
   * Records an event timestamp for exponential decay scoring.
   */
  _checkRapid(nowMs) {
    const cutoff     = nowMs - RAPID_WINDOW_MS;
    const recentCount = this.blinkTimestamps.filter((ts) => ts > cutoff).length;
    if (recentCount > RAPID_BLINK_THRESHOLD) {
      this.rapidBlinkTimestamps.push(nowMs);
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
   * Exponential decay score for heavy blinks (0–1).
   * Half-life 90s — score bleeds to 0 when driver recovers.
   */
  getHeavyBlinkScore() {
    const now = Date.now();
    while (
      this.heavyBlinkTimestamps.length &&
      now - this.heavyBlinkTimestamps[0] > HEAVY_PRUNE_MS
    ) {
      this.heavyBlinkTimestamps.shift();
    }
    let weighted = 0;
    for (const ts of this.heavyBlinkTimestamps) {
      weighted += Math.exp(-(now - ts) * Math.LN2 / HEAVY_HALF_LIFE_MS);
    }
    return Math.min(1, weighted / HEAVY_BLINK_MAX);
  }

  /**
   * Exponential decay score for rapid blinking bursts (0–1).
   * Half-life 60s — decays faster than heavy blinks.
   */
  getRapidBlinkScore() {
    const now = Date.now();
    while (
      this.rapidBlinkTimestamps.length &&
      now - this.rapidBlinkTimestamps[0] > RAPID_PRUNE_MS
    ) {
      this.rapidBlinkTimestamps.shift();
    }
    let weighted = 0;
    for (const ts of this.rapidBlinkTimestamps) {
      weighted += Math.exp(-(now - ts) * Math.LN2 / RAPID_HALF_LIFE_MS);
    }
    return Math.min(1, weighted / RAPID_BLINK_MAX);
  }

  /**
   * Overall blink score (0–1): max of all three sub-signals.
   */
  getBlinkScore() {
    const heavyScore  = this.getHeavyBlinkScore();
    const rapidScore  = this.getRapidBlinkScore();
    const rate        = this.getBlinkRate();
    const avgDur      = this.getAvgDurationMs();
    const rateScore   = rate > 0 ? Math.max(0, Math.min(1, (10 - rate) / 10)) : 0;
    const durScore    = avgDur > 0 ? Math.max(0, Math.min(1, (avgDur - 150) / 350)) : 0;
    return Math.max(heavyScore, rapidScore, rateScore, durScore);
  }

  reset() {
    this.blinkTimestamps      = [];
    this.blinkDurations       = [];
    this.heavyBlinkTimestamps = [];
    this.rapidBlinkTimestamps = [];
    this._inBlink             = false;
    this._earValues           = [];
    this._earTimes            = [];
  }
}
