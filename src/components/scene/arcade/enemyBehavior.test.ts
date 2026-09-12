import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitialPlayer, type Enemy } from "./types.ts";
import { enemyContactRadius, updateEnemies } from "./enemyBehavior.ts";

function interceptorNearPlayer(): Enemy {
  return {
    id: 1,
    kind: "interceptor",
    position: { x: 0.7, z: 0 },
    rotation: 0,
    hp: 3,
    maxHp: 3,
    speed: 4.2,
    radius: 0.55,
    heading: 0,
    strafePhase: 0,
    orbitDir: 1,
    preferredRange: 5.8,
    fireCooldown: 10,
  };
}

test("an interceptor already on top of the player steers away instead of ramming", () => {
  const player = createInitialPlayer();
  const enemy = interceptorNearPlayer();
  const start = Math.hypot(enemy.position.x, enemy.position.z);

  updateEnemies([enemy], player, 0.05, 0, [], { current: 1 });

  const next = Math.hypot(enemy.position.x, enemy.position.z);
  assert.ok(next > start + 0.04, `expected standoff, dist ${start} -> ${next}`);
});

test("hostile ships settle outside contact range instead of suiciding into the player", () => {
  const player = createInitialPlayer();
  const kinds = ["interceptor", "gunship", "drone"] as const;
  for (const kind of kinds) {
    const enemy: Enemy = {
      ...interceptorNearPlayer(),
      id: kind === "interceptor" ? 1 : kind === "gunship" ? 2 : 3,
      kind,
      position: { x: 14, z: 0 },
      radius: kind === "gunship" ? 1.05 : kind === "drone" ? 0.42 : 0.55,
      speed: kind === "gunship" ? 2.2 : 3.2,
      preferredRange: kind === "gunship" ? 6.5 : kind === "drone" ? 10.8 : 5.8,
    };

    for (let i = 0; i < 240; i++) {
      updateEnemies([enemy], player, 0.05, i * 0.05, [], { current: 1 });
    }

    const dist = Math.hypot(enemy.position.x, enemy.position.z);
    const contact = enemyContactRadius(enemy);
    assert.ok(
      dist > contact + 1.6,
      `${kind} collapsed to ${dist.toFixed(2)} (contact ${contact})`,
    );
  }
});
