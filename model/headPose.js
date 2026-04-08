// Signal 3 — Head Pose (pitch and yaw)
// Extracted from the 4×4 facial transformation matrix MediaPipe returns per frame.
//
// MOUNT ASSUMPTIONS (vent-mount, right side of dash):
//   Natural yaw  ≈ +20° — camera sees driver's face turned ~20° (looking at road)
//   Natural pitch ≈ +5° — slight upward view from mount height
//
// DROWSY signals (deviation from natural position):
//   Pitch drops > 15° below baseline → head drooping (chin toward chest)
//   |Yaw| deviates > 20° from baseline → distraction (looking away from road)
//
// A 5° dead zone on both axes suppresses noise and micro-movements.

export const MOUNT_YAW_BASELINE   = 20; // ° — natural yaw in driving position
export const MOUNT_PITCH_BASELINE =  5; // ° — natural pitch from mount geometry

const DROOP_DEAD_ZONE        =  5; // ° before droop score starts rising
const DROOP_FULL_RANGE       = 15; // ° of additional droop = score 1.0
const DISTRACT_DEAD_ZONE     =  5; // ° before distraction score starts rising
const DISTRACT_FULL_RANGE    = 20; // ° of additional deviation = score 1.0

/**
 * @param {Object} transformationMatrix  MediaPipe FacialTransformationMatrix
 * @returns {{ pitch: number, yaw: number }}  degrees
 */
export function extractHeadPose(transformationMatrix) {
  const m = transformationMatrix.data;
  const pitch = Math.asin(-m[6]) * (180 / Math.PI);
  const yaw   = Math.atan2(m[2], m[10]) * (180 / Math.PI);
  return { pitch, yaw };
}

/**
 * Returns a 0–1 score contribution for head pose.
 *
 * Droop:      pitch falls below MOUNT_PITCH_BASELINE (head tilting forward = drowsy).
 * Distract:   |yaw| deviates significantly from MOUNT_YAW_BASELINE in either direction.
 */
export function getHeadPoseScore({ pitch, yaw }) {
  // DROOP: positive pitchDev = head is dropping below natural position
  const pitchDev   = MOUNT_PITCH_BASELINE - pitch;
  const droopScore = Math.max(0, Math.min(1, (pitchDev - DROOP_DEAD_ZONE) / DROOP_FULL_RANGE));

  // DISTRACTION: deviation from natural road-looking yaw in either direction
  // catches both "staring at phone" (yaw→0) and "looking too far away" (yaw→40+)
  const yawDev        = Math.abs(Math.abs(yaw) - MOUNT_YAW_BASELINE);
  const distractScore = Math.max(0, Math.min(1, (yawDev - DISTRACT_DEAD_ZONE) / DISTRACT_FULL_RANGE));

  return Math.max(droopScore, distractScore);
}
