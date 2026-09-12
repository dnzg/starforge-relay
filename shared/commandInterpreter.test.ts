import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extractCommandVerb,
  resolveVoiceTranscript,
} from "./commandInterpreter.ts";

test("maps exact and synonym commands", () => {
  assert.equal(extractCommandVerb("jump"), "jump");
  assert.equal(extractCommandVerb("warp now"), "jump");
  assert.equal(extractCommandVerb("scan the sector"), "scan");
});

test("salvages common jump mishears from STT", () => {
  assert.equal(extractCommandVerb("John"), "jump");
  assert.equal(extractCommandVerb("john."), "jump");
  assert.equal(extractCommandVerb("Jam"), "jump");
  assert.equal(extractCommandVerb("там"), "jump");
  assert.equal(extractCommandVerb("джамп"), "jump");
});

test("does not steal a real command from a longer phrase", () => {
  assert.equal(extractCommandVerb("John, scan the sector"), "scan");
});

test("prefers a command-shaped speech alternative", () => {
  assert.equal(resolveVoiceTranscript(["John", "Jump"]), "jump");
  assert.equal(resolveVoiceTranscript(["там"]), "jump");
  assert.equal(
    resolveVoiceTranscript(["scan the sector"]),
    "scan the sector",
  );
});
