import {
  BLAST_CLIP,
  blastHud,
  createBlastWeapon,
  type BlastWeaponState,
} from "./blastWeapon";

export type ObjectiveTarget = "enemy" | "gate" | "none";
export type RadarBlipKind = "enemy" | "gate";

export interface RadarBlip {
  x: number;
  z: number;
  kind: RadarBlipKind;
}

export const MAX_RADAR_BLIPS = 16;

function createRadarBlips(): RadarBlip[] {
  return Array.from({ length: MAX_RADAR_BLIPS }, () => ({
    x: 0,
    z: 0,
    kind: "enemy" as RadarBlipKind,
  }));
}

export interface ArcadeUiSnapshot {
  playerX: number;
  playerZ: number;
  playerHeading: number;
  targetX: number;
  targetZ: number;
  targetType: ObjectiveTarget;
  sectorKills: number;
  killsRequired: number;
  jumpGateUnlocked: boolean;
  jumpGateX: number;
  jumpGateZ: number;
  mana: number;
  manaReady: boolean;
  hull: number;
  ammo: number;
  ammoMax: number;
  reloading: boolean;
  reloadProgress: number;
  blips: RadarBlip[];
  blipCount: number;
  worldTimeScale: number;
  worldTimeScaleTarget: number;
}

export const KILLS_FOR_JUMP = 3;
export const MANA_MAX = 1;
export const MANA_PER_KILL = 0.34;
export const MANA_PER_SECOND = 0.038;
export const MANA_BOOST_PER_SECOND = 0.28;
export const VOICE_TIME_SCALE = 0.28;

export const arcadeUiRef: ArcadeUiSnapshot = {
  playerX: 0,
  playerZ: 0,
  playerHeading: 0,
  targetX: 0,
  targetZ: 0,
  targetType: "enemy",
  sectorKills: 0,
  killsRequired: KILLS_FOR_JUMP,
  jumpGateUnlocked: false,
  jumpGateX: 0,
  jumpGateZ: -18,
  mana: 0,
  manaReady: false,
  hull: 100,
  ammo: BLAST_CLIP,
  ammoMax: BLAST_CLIP,
  reloading: false,
  reloadProgress: 1,
  blips: createRadarBlips(),
  blipCount: 0,
  worldTimeScale: 1,
  worldTimeScaleTarget: 1,
};

export function clampMana(value: number): number {
  return Math.max(0, Math.min(MANA_MAX, value));
}

export function writeMana(value: number): number {
  const mana = clampMana(value);
  arcadeUiRef.mana = mana;
  arcadeUiRef.manaReady = mana >= MANA_MAX;
  return mana;
}

export function writeHull(value: number): number {
  const hull = Math.max(0, Math.min(100, value));
  arcadeUiRef.hull = hull;
  return hull;
}

export function writeBlastUi(weapon: BlastWeaponState): void {
  const hud = blastHud(weapon);
  arcadeUiRef.ammo = hud.ammo;
  arcadeUiRef.ammoMax = hud.ammoMax;
  arcadeUiRef.reloading = hud.reloading;
  arcadeUiRef.reloadProgress = hud.reloadProgress;
}

export function setVoiceWorldSlow(active: boolean): void {
  arcadeUiRef.worldTimeScaleTarget = active ? VOICE_TIME_SCALE : 1;
}

export function resetArcadeUiForSector() {
  arcadeUiRef.sectorKills = 0;
  arcadeUiRef.jumpGateUnlocked = false;
  arcadeUiRef.targetType = "none";
  arcadeUiRef.blipCount = 0;
  arcadeUiRef.worldTimeScale = 1;
  arcadeUiRef.worldTimeScaleTarget = 1;
  writeMana(0);
  writeBlastUi(createBlastWeapon());
}
