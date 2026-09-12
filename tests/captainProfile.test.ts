import assert from "node:assert/strict";
import { test } from "node:test";
import {
  generateDefaultCallsign,
  isGenericCallsign,
  resolveSuggestedCallsign,
} from "../src/lib/game/captainProfile.ts";

test("treats Captain as generic", () => {
  assert.equal(isGenericCallsign("Captain"), true);
  assert.equal(isGenericCallsign(" captain "), true);
  assert.equal(isGenericCallsign("Nova-Drift"), false);
});

test("generates unique-ish default callsigns", () => {
  const name = generateDefaultCallsign();
  assert.ok(name.length > 0);
  assert.equal(isGenericCallsign(name), false);
});

test("prefers Telegram identity for suggested callsign", () => {
  assert.equal(
    resolveSuggestedCallsign({
      id: 1,
      first_name: "Alex",
      last_name: "Chen",
    }),
    "Alex Chen",
  );
  assert.equal(
    resolveSuggestedCallsign({
      id: 2,
      username: "pilot_42",
    }),
    "pilot_42",
  );
});
