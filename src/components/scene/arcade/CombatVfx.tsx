import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  VFX_DEBRIS_PER_BURST,
  VFX_MAX_BURST,
  VFX_MAX_IMPACT,
  VFX_MAX_MUZZLE,
  VFX_SPARKS_PER_BURST,
  VFX_SPARKS_PER_IMPACT,
  type CombatVfxState,
} from "../../../lib/combat/combatVfx";

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _forward = new THREE.Vector3();
const _axisZ = new THREE.Vector3(0, 0, 1);

const ENEMY_SPARK = new THREE.Color("#fb923c");
const ENEMY_CORE = new THREE.Color("#fff7ed");
const PLAYER_SPARK = new THREE.Color("#7dd3fc");
const PLAYER_CORE = new THREE.Color("#e0f2fe");
const IMPACT_SPARK = new THREE.Color("#fde68a");
const IMPACT_HOT = new THREE.Color("#fff7ad");

const IMPACT_COUNT = VFX_MAX_IMPACT * VFX_SPARKS_PER_IMPACT;
const BURST_SPARK_COUNT = VFX_MAX_BURST * VFX_SPARKS_PER_BURST;
const DEBRIS_COUNT = VFX_MAX_BURST * VFX_DEBRIS_PER_BURST;

function hideInstance(mesh: THREE.InstancedMesh, index: number): void {
  _dummy.position.set(0, -40, 0);
  _dummy.scale.setScalar(0);
  _dummy.rotation.set(0, 0, 0);
  _dummy.updateMatrix();
  mesh.setMatrixAt(index, _dummy.matrix);
}

function createMuzzleMesh(): THREE.Group {
  const group = new THREE.Group();
  group.visible = false;

  const flash = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.55, 8),
    new THREE.MeshBasicMaterial({
      color: "#fff7ad",
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  flash.rotation.x = Math.PI / 2;
  flash.position.z = 0.18;
  group.add(flash);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 12),
    new THREE.MeshBasicMaterial({
      color: "#38bdf8",
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  disc.position.z = 0.02;
  group.add(disc);

  return group;
}

function createRingMesh(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.72, 24),
    new THREE.MeshBasicMaterial({
      color: "#fdba74",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.visible = false;
  return mesh;
}

function createCoreMesh(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 8),
    new THREE.MeshBasicMaterial({
      color: "#fff7ed",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  mesh.visible = false;
  return mesh;
}

interface CombatVfxProps {
  vfx: CombatVfxState;
}

export function CombatVfx({ vfx }: CombatVfxProps) {
  const muzzleGroupRef = useRef<THREE.Group>(null);
  const ringGroupRef = useRef<THREE.Group>(null);
  const coreGroupRef = useRef<THREE.Group>(null);
  const impactRef = useRef<THREE.InstancedMesh>(null);
  const sparkRef = useRef<THREE.InstancedMesh>(null);
  const debrisRef = useRef<THREE.InstancedMesh>(null);
  const burstLightRef = useRef<THREE.PointLight>(null);
  const muzzleLightRef = useRef<THREE.PointLight>(null);

  const muzzlePool = useMemo(
    () => Array.from({ length: VFX_MAX_MUZZLE }, () => createMuzzleMesh()),
    [],
  );
  const ringPool = useMemo(
    () => Array.from({ length: VFX_MAX_BURST }, () => createRingMesh()),
    [],
  );
  const corePool = useMemo(
    () => Array.from({ length: VFX_MAX_BURST }, () => createCoreMesh()),
    [],
  );

  useLayoutEffect(() => {
    const muzzleGroup = muzzleGroupRef.current;
    const ringGroup = ringGroupRef.current;
    const coreGroup = coreGroupRef.current;
    if (muzzleGroup) {
      for (let i = 0; i < muzzlePool.length; i++) {
        if (!muzzlePool[i]!.parent) muzzleGroup.add(muzzlePool[i]!);
      }
    }
    if (ringGroup) {
      for (let i = 0; i < ringPool.length; i++) {
        if (!ringPool[i]!.parent) ringGroup.add(ringPool[i]!);
      }
    }
    if (coreGroup) {
      for (let i = 0; i < corePool.length; i++) {
        if (!corePool[i]!.parent) coreGroup.add(corePool[i]!);
      }
    }

    const impact = impactRef.current;
    const sparks = sparkRef.current;
    const debris = debrisRef.current;
    if (impact) {
      for (let i = 0; i < IMPACT_COUNT; i++) {
        hideInstance(impact, i);
        impact.setColorAt(i, _color.set("#000000"));
      }
      impact.instanceMatrix.needsUpdate = true;
      if (impact.instanceColor) impact.instanceColor.needsUpdate = true;
    }
    if (sparks) {
      for (let i = 0; i < BURST_SPARK_COUNT; i++) {
        hideInstance(sparks, i);
        sparks.setColorAt(i, _color.set("#000000"));
      }
      sparks.instanceMatrix.needsUpdate = true;
      if (sparks.instanceColor) sparks.instanceColor.needsUpdate = true;
    }
    if (debris) {
      for (let i = 0; i < DEBRIS_COUNT; i++) {
        hideInstance(debris, i);
        debris.setColorAt(i, _color.set("#000000"));
      }
      debris.instanceMatrix.needsUpdate = true;
      if (debris.instanceColor) debris.instanceColor.needsUpdate = true;
    }
  }, [corePool, muzzlePool, ringPool]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const impactMesh = impactRef.current;
    const sparkMesh = sparkRef.current;
    const debrisMesh = debrisRef.current;
    const burstLight = burstLightRef.current;
    const muzzleLight = muzzleLightRef.current;
    if (!impactMesh || !sparkMesh || !debrisMesh) return;

    let hottestBurst = -1;
    let hottestAge = Infinity;
    let latestMuzzle = -1;
    let latestMuzzleAge = Infinity;

    for (let i = 0; i < vfx.muzzles.length; i++) {
      const slot = vfx.muzzles[i]!;
      const mesh = muzzlePool[i]!;
      if (!slot.active) {
        mesh.visible = false;
        continue;
      }
      slot.age += dt;
      if (slot.age >= slot.duration) {
        slot.active = false;
        mesh.visible = false;
        continue;
      }
      const t = slot.age / slot.duration;
      mesh.visible = true;
      mesh.position.set(slot.x, 0.12, slot.z);
      _forward.set(slot.dirX, 0, slot.dirZ).normalize();
      mesh.quaternion.setFromUnitVectors(_axisZ, _forward);
      const scale = 0.7 + (1 - t) * 1.15;
      mesh.scale.set(scale, scale, 0.85 + (1 - t) * 1.4);
      const flash = mesh.children[0] as THREE.Mesh;
      const disc = mesh.children[1] as THREE.Mesh;
      (flash.material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - t);
      (disc.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - t);
      if (slot.age < latestMuzzleAge) {
        latestMuzzleAge = slot.age;
        latestMuzzle = i;
      }
    }

    if (muzzleLight) {
      if (latestMuzzle >= 0) {
        const slot = vfx.muzzles[latestMuzzle]!;
        const fade = 1 - slot.age / slot.duration;
        muzzleLight.visible = true;
        muzzleLight.position.set(slot.x, 0.25, slot.z);
        muzzleLight.intensity = 6 * fade;
      } else {
        muzzleLight.visible = false;
        muzzleLight.intensity = 0;
      }
    }

    for (let i = 0; i < vfx.impacts.length; i++) {
      const slot = vfx.impacts[i]!;
      const base = i * VFX_SPARKS_PER_IMPACT;
      if (!slot.active) {
        for (let p = 0; p < VFX_SPARKS_PER_IMPACT; p++) {
          hideInstance(impactMesh, base + p);
        }
        continue;
      }
      slot.age += dt;
      if (slot.age >= slot.duration) {
        slot.active = false;
        for (let p = 0; p < VFX_SPARKS_PER_IMPACT; p++) {
          hideInstance(impactMesh, base + p);
        }
        continue;
      }
      const t = slot.age / slot.duration;
      const fade = 1 - t;
      for (let p = 0; p < VFX_SPARKS_PER_IMPACT; p++) {
        const idx = base + p;
        _dummy.position.set(
          slot.x + slot.dirs[p * 3]! * slot.speeds[p]! * slot.age,
          0.12 + slot.dirs[p * 3 + 1]! * slot.speeds[p]! * slot.age,
          slot.z + slot.dirs[p * 3 + 2]! * slot.speeds[p]! * slot.age,
        );
        _dummy.scale.setScalar(0.35 + fade * 0.85);
        _dummy.rotation.set(0, 0, 0);
        _dummy.updateMatrix();
        impactMesh.setMatrixAt(idx, _dummy.matrix);
        _color.copy(IMPACT_HOT).lerp(IMPACT_SPARK, t);
        impactMesh.setColorAt(idx, _color);
      }
    }
    impactMesh.instanceMatrix.needsUpdate = true;
    if (impactMesh.instanceColor) impactMesh.instanceColor.needsUpdate = true;

    for (let i = 0; i < vfx.bursts.length; i++) {
      const slot = vfx.bursts[i]!;
      const ring = ringPool[i]!;
      const core = corePool[i]!;
      const sparkBase = i * VFX_SPARKS_PER_BURST;
      const debrisBase = i * VFX_DEBRIS_PER_BURST;
      const ringMat = ring.material as THREE.MeshBasicMaterial;
      const coreMat = core.material as THREE.MeshBasicMaterial;

      if (!slot.active) {
        ring.visible = false;
        core.visible = false;
        for (let p = 0; p < VFX_SPARKS_PER_BURST; p++) {
          hideInstance(sparkMesh, sparkBase + p);
        }
        for (let p = 0; p < VFX_DEBRIS_PER_BURST; p++) {
          hideInstance(debrisMesh, debrisBase + p);
        }
        continue;
      }

      slot.age += dt;
      if (slot.age >= slot.duration) {
        slot.active = false;
        ring.visible = false;
        core.visible = false;
        for (let p = 0; p < VFX_SPARKS_PER_BURST; p++) {
          hideInstance(sparkMesh, sparkBase + p);
        }
        for (let p = 0; p < VFX_DEBRIS_PER_BURST; p++) {
          hideInstance(debrisMesh, debrisBase + p);
        }
        continue;
      }

      const t = slot.age / slot.duration;
      const fade = 1 - t;
      const enemy = slot.kind === "enemy";
      const sparkColor = enemy ? ENEMY_SPARK : PLAYER_SPARK;
      const coreColor = enemy ? ENEMY_CORE : PLAYER_CORE;

      ring.visible = true;
      ring.position.set(slot.x, 0.08, slot.z);
      ring.scale.setScalar(0.35 + t * 3.4);
      ringMat.color.copy(sparkColor);
      ringMat.opacity = 0.85 * fade;

      core.visible = true;
      core.position.set(slot.x, 0.16, slot.z);
      core.scale.setScalar(0.45 + fade * 1.6);
      coreMat.color.copy(coreColor);
      coreMat.opacity = 0.9 * Math.max(0, 1 - t * 2.2);

      for (let p = 0; p < VFX_SPARKS_PER_BURST; p++) {
        const idx = sparkBase + p;
        _dummy.position.set(
          slot.x + slot.sparkDirs[p * 3]! * slot.sparkSpeeds[p]! * slot.age,
          0.14 + slot.sparkDirs[p * 3 + 1]! * slot.sparkSpeeds[p]! * slot.age,
          slot.z + slot.sparkDirs[p * 3 + 2]! * slot.sparkSpeeds[p]! * slot.age,
        );
        _dummy.scale.setScalar(0.4 + fade * 1.1);
        _dummy.rotation.set(0, 0, 0);
        _dummy.updateMatrix();
        sparkMesh.setMatrixAt(idx, _dummy.matrix);
        _color.copy(coreColor).lerp(sparkColor, Math.min(1, t * 1.4));
        sparkMesh.setColorAt(idx, _color);
      }

      for (let p = 0; p < VFX_DEBRIS_PER_BURST; p++) {
        const idx = debrisBase + p;
        const spin = slot.debrisSpin[p]! * slot.age;
        _dummy.position.set(
          slot.x + slot.debrisDirs[p * 3]! * slot.debrisSpeeds[p]! * slot.age,
          0.18 + slot.debrisDirs[p * 3 + 1]! * slot.debrisSpeeds[p]! * slot.age,
          slot.z + slot.debrisDirs[p * 3 + 2]! * slot.debrisSpeeds[p]! * slot.age,
        );
        _dummy.scale.setScalar(0.55 * fade);
        _dummy.rotation.set(spin, spin * 0.7, spin * 1.3);
        _dummy.updateMatrix();
        debrisMesh.setMatrixAt(idx, _dummy.matrix);
        _color.copy(sparkColor).lerp(coreColor, 0.25);
        debrisMesh.setColorAt(idx, _color);
      }

      if (slot.age < hottestAge) {
        hottestAge = slot.age;
        hottestBurst = i;
      }
    }

    sparkMesh.instanceMatrix.needsUpdate = true;
    debrisMesh.instanceMatrix.needsUpdate = true;
    if (sparkMesh.instanceColor) sparkMesh.instanceColor.needsUpdate = true;
    if (debrisMesh.instanceColor) debrisMesh.instanceColor.needsUpdate = true;

    if (burstLight) {
      if (hottestBurst >= 0) {
        const slot = vfx.bursts[hottestBurst]!;
        const fade = 1 - slot.age / slot.duration;
        burstLight.visible = true;
        burstLight.position.set(slot.x, 0.55, slot.z);
        burstLight.color.copy(slot.kind === "enemy" ? ENEMY_SPARK : PLAYER_SPARK);
        burstLight.intensity = 10 * fade;
      } else {
        burstLight.visible = false;
        burstLight.intensity = 0;
      }
    }
  });

  return (
    <>
      <group ref={muzzleGroupRef} />
      <group ref={ringGroupRef} />
      <group ref={coreGroupRef} />
      <instancedMesh
        ref={impactRef}
        args={[undefined, undefined, IMPACT_COUNT]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.055, 6, 6]} />
        <meshBasicMaterial
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={sparkRef}
        args={[undefined, undefined, BURST_SPARK_COUNT]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.07, 6, 6]} />
        <meshBasicMaterial
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={debrisRef}
        args={[undefined, undefined, DEBRIS_COUNT]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.12, 0.05, 0.16]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <pointLight
        ref={burstLightRef}
        color="#fb923c"
        intensity={0}
        distance={12}
        decay={2}
      />
      <pointLight
        ref={muzzleLightRef}
        color="#fde68a"
        intensity={0}
        distance={6}
        decay={2}
      />
    </>
  );
}
