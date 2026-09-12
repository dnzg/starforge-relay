import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ExplosionSlot } from "./types";

const MAX_BURSTS = 8;
const DEBRIS_PER_BURST = 7;
const MAX_DEBRIS = MAX_BURSTS * DEBRIS_PER_BURST;

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

interface ExplosionBurstsProps {
  explosionsRef: RefObject<ExplosionSlot[]>;
}

export function ExplosionBursts({ explosionsRef }: ExplosionBurstsProps) {
  const flashRef = useRef<THREE.InstancedMesh>(null);
  const debrisRef = useRef<THREE.InstancedMesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const flashGeometry = useMemo(() => new THREE.SphereGeometry(0.35, 8, 6), []);
  const debrisGeometry = useMemo(() => new THREE.BoxGeometry(0.08, 0.08, 0.18), []);
  const flashMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffd0c4",
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const debrisMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#f1697e",
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useFrame((_, delta) => {
    const flashes = flashRef.current;
    const debris = debrisRef.current;
    if (!flashes || !debris) return;

    const slots = explosionsRef.current;
    let hottest = 0;
    let lightX = 0;
    let lightZ = 0;

    for (let i = 0; i < MAX_BURSTS; i++) {
      const slot = slots[i];
      if (!slot?.active) {
        _dummy.position.set(0, -40, 0);
        _dummy.scale.setScalar(0);
        _dummy.updateMatrix();
        flashes.setMatrixAt(i, _dummy.matrix);
        for (let d = 0; d < DEBRIS_PER_BURST; d++) {
          debris.setMatrixAt(i * DEBRIS_PER_BURST + d, _dummy.matrix);
        }
        continue;
      }

      slot.age += delta;
      const t = slot.age / slot.duration;
      if (t >= 1) {
        slot.active = false;
        continue;
      }

      const flashScale = 0.4 + t * 3.4;
      const flashFade = 1 - t;
      _dummy.position.set(slot.x, 0.2, slot.z);
      _dummy.scale.setScalar(flashScale);
      _dummy.updateMatrix();
      flashes.setMatrixAt(i, _dummy.matrix);
      flashes.setColorAt?.(i, _color.setRGB(1, 0.55 + flashFade * 0.4, 0.35));

      for (let d = 0; d < DEBRIS_PER_BURST; d++) {
        const angle = (d / DEBRIS_PER_BURST) * Math.PI * 2 + slot.x;
        const dist = t * (1.4 + (d % 3) * 0.55);
        _dummy.position.set(
          slot.x + Math.cos(angle) * dist,
          0.15 + t * 0.9,
          slot.z + Math.sin(angle) * dist,
        );
        _dummy.rotation.set(t * 4, angle, t * 6);
        _dummy.scale.setScalar((1 - t) * 1.15);
        _dummy.updateMatrix();
        debris.setMatrixAt(i * DEBRIS_PER_BURST + d, _dummy.matrix);
      }

      if (flashFade > hottest) {
        hottest = flashFade;
        lightX = slot.x;
        lightZ = slot.z;
      }
    }

    flashes.instanceMatrix.needsUpdate = true;
    debris.instanceMatrix.needsUpdate = true;
    flashes.count = MAX_BURSTS;
    debris.count = MAX_DEBRIS;
    flashes.frustumCulled = false;
    debris.frustumCulled = false;
    flashMaterial.opacity = 0.15 + hottest * 0.75;
    debrisMaterial.opacity = 0.2 + hottest * 0.7;

    if (lightRef.current) {
      lightRef.current.position.set(lightX, 0.8, lightZ);
      lightRef.current.intensity = hottest * 8;
    }
  });

  return (
    <>
      <instancedMesh
        ref={flashRef}
        args={[flashGeometry, flashMaterial, MAX_BURSTS]}
        dispose={null}
        name="explosion-flashes"
      />
      <instancedMesh
        ref={debrisRef}
        args={[debrisGeometry, debrisMaterial, MAX_DEBRIS]}
        dispose={null}
        name="explosion-debris"
      />
      <pointLight
        ref={lightRef}
        color="#ff7a4d"
        intensity={0}
        distance={9}
        decay={2}
      />
    </>
  );
}

export function createExplosionPool(): ExplosionSlot[] {
  return Array.from({ length: MAX_BURSTS }, () => ({
    active: false,
    x: 0,
    z: 0,
    age: 0,
    duration: 0.55,
  }));
}

export function spawnExplosion(
  pool: ExplosionSlot[],
  x: number,
  z: number,
): void {
  let slot = pool.find((item) => !item.active);
  if (!slot) {
    slot = pool[0];
  }
  if (!slot) return;
  slot.active = true;
  slot.x = x;
  slot.z = z;
  slot.age = 0;
  slot.duration = 0.45 + Math.random() * 0.25;
}
