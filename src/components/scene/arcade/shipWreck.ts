export type PlayerWreckStage = 0 | 1 | 2 | 3;
export type EnemyWreckStage = 0 | 1 | 2;

export function playerWreckStage(hull: number): PlayerWreckStage {
  if (hull > 75) return 0;
  if (hull > 50) return 1;
  if (hull > 25) return 2;
  return 3;
}

export function enemyWreckStage(hp: number, maxHp: number): EnemyWreckStage {
  if (maxHp <= 0) return 0;
  const ratio = hp / maxHp;
  if (ratio > 2 / 3) return 0;
  if (ratio > 1 / 3) return 1;
  return 2;
}
