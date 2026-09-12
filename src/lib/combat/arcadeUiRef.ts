export type ObjectiveTarget = "enemy" | "gate" | "none";

export interface ArcadeUiSnapshot {
  playerX: number;
  playerZ: number;
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
}

export const KILLS_FOR_JUMP = 3;
export const MANA_MAX = 1;
export const MANA_PER_KILL = 0.34;
export const MANA_PER_SECOND = 0.038;

export const arcadeUiRef: ArcadeUiSnapshot = {
  playerX: 0,
  playerZ: 0,
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

export function resetArcadeUiForSector() {
  arcadeUiRef.sectorKills = 0;
  arcadeUiRef.jumpGateUnlocked = false;
  arcadeUiRef.targetType = "enemy";
  writeMana(0);
}
