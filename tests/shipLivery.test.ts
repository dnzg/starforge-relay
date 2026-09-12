import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { buildShipLiveryPrompt } from "../shared/falSectorArtServer.ts";
import { applyShipLiveryMap } from "../src/components/scene/arcade/shipTextures.ts";

test("livery prompt leads with the user's brief and asks for a full-frame tileable paint map", () => {
  const prompt = buildShipLiveryPrompt("Rainbow");
  assert.ok(prompt.startsWith("Rainbow"), "user brief must lead so Flux does not invent a gray fighter");
  assert.match(prompt, /seamless/i);
  assert.match(prompt, /tileable/i);
  assert.match(prompt, /full-bleed|entire frame|every pixel/i);
  assert.doesNotMatch(prompt, /\bfighter\b/i);
});

test("AI livery is applied as enamel paint, not leftover bare metal", () => {
  const hull = new THREE.MeshStandardMaterial({
    color: "#888888",
    metalness: 0.58,
    roughness: 0.42,
    emissive: "#de2944",
    emissiveIntensity: 0.22,
  });
  const wing = new THREE.MeshStandardMaterial({
    color: "#d8d6dc",
    metalness: 0.65,
  });
  hull.roughnessMap = new THREE.Texture();
  hull.metalnessMap = new THREE.Texture();
  hull.emissiveMap = new THREE.Texture();

  const map = new THREE.Texture();
  applyShipLiveryMap({ hull, wing }, map);

  assert.equal(hull.map, map);
  assert.equal(wing.map, map);
  assert.equal(hull.color.getHexString(), "ffffff");
  assert.equal(wing.color.getHexString(), "ffffff");
  assert.ok(hull.metalness <= 0.25);
  assert.ok(wing.metalness <= 0.25);
  assert.equal(hull.roughnessMap, null);
  assert.equal(hull.metalnessMap, null);
  assert.equal(hull.emissiveMap, null);
  assert.equal(hull.emissiveIntensity, 0);
});
