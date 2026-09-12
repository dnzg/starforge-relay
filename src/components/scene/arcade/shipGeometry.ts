import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function yawFromDirection(dirX: number, dirZ: number): number {
  return Math.atan2(-dirX, -dirZ);
}

export function lerpAngle(current: number, target: number, t: number): number {
  let delta = target - current;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * t;
}

export function noseDirection(rotation: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(-Math.sin(rotation), 0, -Math.cos(rotation));
}

function createHostileParts(): THREE.BufferGeometry[] {
  const body = new THREE.ConeGeometry(0.32, 1.2, 6);
  body.rotateX(Math.PI / 2);

  const wing = new THREE.BoxGeometry(1.7, 0.05, 0.4);
  wing.translate(0, 0.02, 0.16);

  const bladeL = new THREE.BoxGeometry(0.58, 0.04, 0.18);
  bladeL.translate(-0.78, 0.05, -0.04);
  bladeL.rotateY(0.5);
  bladeL.rotateZ(0.28);

  const bladeR = new THREE.BoxGeometry(0.58, 0.04, 0.18);
  bladeR.translate(0.78, 0.05, -0.04);
  bladeR.rotateY(-0.5);
  bladeR.rotateZ(-0.28);

  const prongL = new THREE.BoxGeometry(0.07, 0.06, 0.55);
  prongL.translate(-0.18, 0.02, -0.68);
  const prongR = new THREE.BoxGeometry(0.07, 0.06, 0.55);
  prongR.translate(0.18, 0.02, -0.68);

  const ridge = new THREE.BoxGeometry(0.16, 0.14, 0.46);
  ridge.translate(0, 0.12, 0.02);

  const tail = new THREE.BoxGeometry(0.08, 0.3, 0.22);
  tail.translate(0, 0.18, 0.44);

  const engineL = new THREE.CylinderGeometry(0.055, 0.075, 0.24, 8);
  engineL.rotateX(Math.PI / 2);
  engineL.translate(-0.16, 0.02, 0.5);
  const engineR = new THREE.CylinderGeometry(0.055, 0.075, 0.24, 8);
  engineR.rotateX(Math.PI / 2);
  engineR.translate(0.16, 0.02, 0.5);

  return [body, wing, bladeL, bladeR, prongL, prongR, ridge, tail, engineL, engineR];
}

function compatible(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const keep = new Set(["position", "normal", "uv"]);
  for (const name of Object.keys(geometry.attributes)) {
    if (!keep.has(name)) geometry.deleteAttribute(name);
  }
  geometry.clearGroups();
  if (!geometry.getAttribute("uv")) {
    const count = geometry.getAttribute("position").count;
    geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  return geometry;
}

export function createHostileGeometry(): THREE.BufferGeometry {
  const parts = createHostileParts().map(compatible);
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) {
    return new THREE.ConeGeometry(0.38, 1.1, 6);
  }
  merged.computeVertexNormals();
  return merged;
}

export function createBoltGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.CapsuleGeometry(0.045, 0.42, 3, 6);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}
