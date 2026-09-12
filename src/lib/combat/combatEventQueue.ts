export interface CombatFlushSnapshot {
  kills: number;
  damage: number;
  jumpGateReached: boolean;
}

export function createCombatEventQueue() {
  const pending: CombatFlushSnapshot = {
    kills: 0,
    damage: 0,
    jumpGateReached: false,
  };

  return {
    queueKill() {
      pending.kills += 1;
    },
    queueDamage(amount: number) {
      pending.damage += amount;
    },
    queueJumpGate() {
      pending.jumpGateReached = true;
    },
    flush(): CombatFlushSnapshot {
      const snapshot: CombatFlushSnapshot = {
        kills: pending.kills,
        damage: pending.damage,
        jumpGateReached: pending.jumpGateReached,
      };
      pending.kills = 0;
      pending.damage = 0;
      pending.jumpGateReached = false;
      return snapshot;
    },
  };
}
