// Signal 3 — Head Pose (pitch and yaw)
// Extracted from the 4×4 facial transformation matrix MediaPipe returns per frame.
//
// Pitch > 15°  — head drooping forward (drowsiness signal)
// |Yaw| > 30°  — looking away from road (distraction signal)

export const PITCH_DROWSY_THRESHOLD    = 15;
export const YAW_DISTRACTED_THRESHOLD  = 30;

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
 * 1.0 = head drooping at or beyond 30° pitch.
 */
export function getHeadPoseScore({ pitch, yaw }) {
  const pitchScore = Math.max(0, Math.min(1, (pitch - PITCH_DROWSY_THRESHOLD) / 15));
  const yawScore   = Math.max(0, Math.min(1, (Math.abs(yaw) - YAW_DISTRACTED_THRESHOLD) / 20));
  return Math.max(pitchScore, yawScore);
}
