export const VFX_MAX_MUZZLE = 6;
export const VFX_MAX_IMPACT = 8;
export const VFX_MAX_BURST = 6;
export const VFX_SPARKS_PER_IMPACT = 6;
export const VFX_SPARKS_PER_BURST = 10;
export const VFX_DEBRIS_PER_BURST = 5;

export const MUZZLE_DURATION = 0.09;
export const IMPACT_DURATION = 0.28;
export const BURST_DURATION = 0.55;

export type BurstKind = "enemy" | "player";

export interface MuzzleSlot {
  active: boolean;
  age: number;
  duration: number;
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
}

export interface ImpactSlot {
  active: boolean;
  age: number;
  duration: number;
  x: number;
  z: number;
  dirs: Float32Array;
  speeds: Float32Array;
}

export interface BurstSlot {
  active: boolean;
  age: number;
  duration: number;
  x: number;
  z: number;
  kind: BurstKind;
  sparkDirs: Float32Array;
  sparkSpeeds: Float32Array;
  debrisDirs: Float32Array;
  debrisSpeeds: Float32Array;
  debrisSpin: Float32Array;
}

export interface CombatVfxApi {
  spawnMuzzle: (x: number, z: number, dirX: number, dirZ: number) => void;
  spawnImpact: (x: number, z: number) => void;
  spawnBurst: (x: number, z: number, kind: BurstKind) => void;
  reset: () => void;
}

export interface CombatVfxState {
  api: CombatVfxApi;
  muzzles: MuzzleSlot[];
  impacts: ImpactSlot[];
  bursts: BurstSlot[];
}

function claimSlot(slots: { active: boolean; age: number }[]): number {
  let oldest = 0;
  let oldestAge = -1;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]!;
    if (!slot.active) return i;
    if (slot.age > oldestAge) {
      oldestAge = slot.age;
      oldest = i;
    }
  }
  return oldest;
}

function fillRandomDirs(
  dirs: Float32Array,
  speeds: Float32Array,
  count: number,
  minSpeed: number,
  maxSpeed: number,
  lift = 0.2,
): void {
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const sinPhi = Math.sin(phi);
    dirs[i * 3] = sinPhi * Math.cos(theta);
    dirs[i * 3 + 1] = Math.cos(phi) * 0.7 + lift;
    dirs[i * 3 + 2] = sinPhi * Math.sin(theta);
    speeds[i] = minSpeed + Math.random() * (maxSpeed - minSpeed);
  }
}

export function createCombatVfxState(): CombatVfxState {
  const muzzles: MuzzleSlot[] = Array.from({ length: VFX_MAX_MUZZLE }, () => ({
    active: false,
    age: 0,
    duration: MUZZLE_DURATION,
    x: 0,
    z: 0,
    dirX: 0,
    dirZ: 1,
  }));

  const impacts: ImpactSlot[] = Array.from({ length: VFX_MAX_IMPACT }, () => ({
    active: false,
    age: 0,
    duration: IMPACT_DURATION,
    x: 0,
    z: 0,
    dirs: new Float32Array(VFX_SPARKS_PER_IMPACT * 3),
    speeds: new Float32Array(VFX_SPARKS_PER_IMPACT),
  }));

  const bursts: BurstSlot[] = Array.from({ length: VFX_MAX_BURST }, () => ({
    active: false,
    age: 0,
    duration: BURST_DURATION,
    x: 0,
    z: 0,
    kind: "enemy",
    sparkDirs: new Float32Array(VFX_SPARKS_PER_BURST * 3),
    sparkSpeeds: new Float32Array(VFX_SPARKS_PER_BURST),
    debrisDirs: new Float32Array(VFX_DEBRIS_PER_BURST * 3),
    debrisSpeeds: new Float32Array(VFX_DEBRIS_PER_BURST),
    debrisSpin: new Float32Array(VFX_DEBRIS_PER_BURST),
  }));

  const api: CombatVfxApi = {
    spawnMuzzle(x, z, dirX, dirZ) {
      const slot = muzzles[claimSlot(muzzles)]!;
      slot.active = true;
      slot.age = 0;
      slot.duration = MUZZLE_DURATION;
      slot.x = x;
      slot.z = z;
      slot.dirX = dirX;
      slot.dirZ = dirZ;
    },
    spawnImpact(x, z) {
      const slot = impacts[claimSlot(impacts)]!;
      slot.active = true;
      slot.age = 0;
      slot.duration = IMPACT_DURATION;
      slot.x = x;
      slot.z = z;
      fillRandomDirs(slot.dirs, slot.speeds, VFX_SPARKS_PER_IMPACT, 6, 14, 0.15);
    },
    spawnBurst(x, z, kind) {
      const slot = bursts[claimSlot(bursts)]!;
      slot.active = true;
      slot.age = 0;
      slot.duration = BURST_DURATION;
      slot.x = x;
      slot.z = z;
      slot.kind = kind;
      fillRandomDirs(slot.sparkDirs, slot.sparkSpeeds, VFX_SPARKS_PER_BURST, 5, 12, 0.25);
      fillRandomDirs(slot.debrisDirs, slot.debrisSpeeds, VFX_DEBRIS_PER_BURST, 2.2, 5.5, 0.35);
      for (let i = 0; i < VFX_DEBRIS_PER_BURST; i++) {
        slot.debrisSpin[i] = (Math.random() - 0.5) * 14;
      }
    },
    reset() {
      for (let i = 0; i < muzzles.length; i++) muzzles[i]!.active = false;
      for (let i = 0; i < impacts.length; i++) impacts[i]!.active = false;
      for (let i = 0; i < bursts.length; i++) bursts[i]!.active = false;
    },
  };

  return { api, muzzles, impacts, bursts };
}
