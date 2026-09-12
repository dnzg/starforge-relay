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
}

export const KILLS_FOR_JUMP = 3;

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
};

export function resetArcadeUiForSector() {
  arcadeUiRef.sectorKills = 0;
  arcadeUiRef.jumpGateUnlocked = false;
  arcadeUiRef.targetType = "enemy";
}
