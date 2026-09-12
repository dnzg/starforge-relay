import * as THREE from "three";
import type { ArcadeInputState } from "../../../hooks/useArcadeInput";
import type { PlayerState } from "./types";

/**
 * Aircraft-style arcade mapping (ship-local, chase camera):
 * - W / ArrowUp: pitch nose DOWN (dive) and thrust along the nose
 * - S / ArrowDown: pitch nose UP (climb) and reverse along the nose
 * - A / ArrowLeft: yaw left and strafe left
 * - D / ArrowRight: yaw right and strafe right
 *
 * A/D are always ship-local left/right so heading never inverts their screen direction.
 * Pitch is rate-limited and clamped so the ship cannot flip inverted.
 * Roll is a cosmetic bank toward the turn/strafe, not a full invert.
 */
export const YAW_RATE = 1.85;
export const PITCH_RATE = 1.15;
export const PITCH_MAX = 0.48;
export const PITCH_RETURN = 5.5;
export const BANK_MAX = 0.38;
export const BANK_DAMP = 8;
export const STRAFE_BLEND = 0.55;
export const CAM_BACK = 5.5;
export const CAM_HEIGHT = 3.2;
export const CAM_LOOK_AHEAD = 1.6;
export const MOBILE_CAM_BACK = 9.4;
export const MOBILE_CAM_HEIGHT = 5.8;
export const MOBILE_CAM_LOOK_AHEAD = 3.6;

export function headingForwardX(yaw: number): number {
  return -Math.sin(yaw);
}

export function headingForwardZ(yaw: number): number {
  return -Math.cos(yaw);
}

export function applyArcadeFlight(
  player: PlayerState,
  input: ArcadeInputState,
  speed: number,
  dt: number,
): void {
  player.rotation -= input.moveX * YAW_RATE * dt;

  if (input.moveY !== 0) {
    player.pitch += input.moveY * PITCH_RATE * dt;
    player.pitch = THREE.MathUtils.clamp(player.pitch, -PITCH_MAX, PITCH_MAX);
  } else {
    player.pitch = THREE.MathUtils.damp(player.pitch, 0, PITCH_RETURN, dt);
  }

  const targetRoll = -input.moveX * BANK_MAX;
  player.roll = THREE.MathUtils.damp(player.roll, targetRoll, BANK_DAMP, dt);

  const yaw = player.rotation;
  const sinY = Math.sin(yaw);
  const cosY = Math.cos(yaw);
  const forwardX = -sinY;
  const forwardZ = -cosY;
  const rightX = cosY;
  const rightZ = -sinY;
  const thrust = -input.moveY;

  player.position.x +=
    (forwardX * thrust + rightX * input.moveX * STRAFE_BLEND) * speed;
  player.position.z +=
    (forwardZ * thrust + rightZ * input.moveX * STRAFE_BLEND) * speed;
}
