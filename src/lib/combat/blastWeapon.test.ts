import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BLAST_CLIP,
  BLAST_INTERVAL,
  BLAST_RELOAD,
  createBlastWeapon,
  tickBlastWeapon,
  tryFireBlast,
} from "./blastWeapon.ts";

test("clip empties after a burst and blocks fire until reload finishes", () => {
  const weapon = createBlastWeapon();
  for (let i = 0; i < BLAST_CLIP; i++) {
    assert.equal(tryFireBlast(weapon), true);
    if (i < BLAST_CLIP - 1) tickBlastWeapon(weapon, BLAST_INTERVAL);
  }
  assert.equal(tryFireBlast(weapon), false);

  tickBlastWeapon(weapon, BLAST_RELOAD - 0.05);
  assert.equal(tryFireBlast(weapon), false);

  tickBlastWeapon(weapon, 0.06);
  assert.equal(tryFireBlast(weapon), true);
  assert.equal(weapon.ammo, BLAST_CLIP - 1);
});

test("shot interval stops a full clip from dumping in one frame", () => {
  const weapon = createBlastWeapon();
  assert.equal(tryFireBlast(weapon), true);
  assert.equal(tryFireBlast(weapon), false);
  tickBlastWeapon(weapon, BLAST_INTERVAL / 2);
  assert.equal(tryFireBlast(weapon), false);
  tickBlastWeapon(weapon, BLAST_INTERVAL);
  assert.equal(tryFireBlast(weapon), true);
});
