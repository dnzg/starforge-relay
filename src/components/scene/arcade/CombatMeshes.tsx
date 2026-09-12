import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Enemy, Projectile, SuperBurstState } from "./types";
import { createBoltGeometry, createHostileGeometry } from "./shipGeometry";
import { applyHullMaps, createHostileTextures } from "./shipTextures";

const MAX_ENEMIES = 16;
const MAX_PROJECTILES = 48;
const MAX_SUPER_BOLTS = 6;

const _dummy = new THREE.Object3D();
const _boltDir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 0, -1);

interface CombatMeshesProps {
  enemiesRef: RefObject<Enemy[]>;
  projectilesRef: RefObject<Projectile[]>;
  superBurstRef: RefObject<SuperBurstState>;
}

export function CombatMeshes({
  enemiesRef,
  projectilesRef,
  superBurstRef,
}: CombatMeshesProps) {
  const enemyMeshRef = useRef<THREE.InstancedMesh>(null);
  const boltMeshRef = useRef<THREE.InstancedMesh>(null);
  const enemyBoltMeshRef = useRef<THREE.InstancedMesh>(null);
  const superBoltMeshRef = useRef<THREE.InstancedMesh>(null);
  const novaRef = useRef<THREE.Mesh>(null);
  const novaLightRef = useRef<THREE.PointLight>(null);

  const hostileGeometry = useMemo(() => createHostileGeometry(), []);
  const boltGeometry = useMemo(() => createBoltGeometry(), []);
  const hostileMaps = useMemo(() => createHostileTextures(), []);

  const hostileMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      emissive: "#de2944",
      emissiveIntensity: 0.42,
      metalness: 0.62,
      roughness: 0.34,
    });
    applyHullMaps(material, hostileMaps, 1.35);
    return material;
  }, [hostileMaps]);

  const boltMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffd0d6",
        emissive: "#de2944",
        emissiveIntensity: 1.4,
        toneMapped: false,
      }),
    [],
  );
  const enemyBoltMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffe7b8",
        emissive: "#f0a030",
        emissiveIntensity: 1.5,
        toneMapped: false,
      }),
    [],
  );
  const superBoltMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e9d5ff",
        emissive: "#22d3ee",
        emissiveIntensity: 2.2,
        toneMapped: false,
      }),
    [],
  );
  const novaMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#67e8f9",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [],
  );
  const novaGeometry = useMemo(
    () => new THREE.RingGeometry(0.65, 0.95, 40),
    [],
  );

  useEffect(
    () => () => {
      hostileMaps.dispose();
      hostileGeometry.dispose();
      boltGeometry.dispose();
      hostileMaterial.dispose();
      boltMaterial.dispose();
      enemyBoltMaterial.dispose();
      superBoltMaterial.dispose();
      novaMaterial.dispose();
      novaGeometry.dispose();
    },
    [
      boltGeometry,
      boltMaterial,
      enemyBoltMaterial,
      hostileGeometry,
      hostileMaps,
      hostileMaterial,
      novaGeometry,
      novaMaterial,
      superBoltMaterial,
    ],
  );

  useFrame((_, delta) => {
    const enemyMesh = enemyMeshRef.current;
    const boltMesh = boltMeshRef.current;
    const enemyBoltMesh = enemyBoltMeshRef.current;
    const superBoltMesh = superBoltMeshRef.current;
    if (!enemyMesh || !boltMesh || !enemyBoltMesh || !superBoltMesh) return;

    const enemies = enemiesRef.current;
    for (let i = 0; i < MAX_ENEMIES; i++) {
      if (i < enemies.length) {
        const enemy = enemies[i]!;
        _dummy.position.set(enemy.position.x, 0, enemy.position.z);
        _dummy.rotation.set(0, enemy.rotation, 0);
        _dummy.scale.setScalar(1.12);
      } else {
        _dummy.position.set(0, -20, 0);
        _dummy.scale.setScalar(0);
      }
      _dummy.updateMatrix();
      enemyMesh.setMatrixAt(i, _dummy.matrix);
    }
    enemyMesh.instanceMatrix.needsUpdate = true;
    enemyMesh.count = MAX_ENEMIES;
    enemyMesh.frustumCulled = false;

    const projectiles = projectilesRef.current;
    let playerBolt = 0;
    let enemyBolt = 0;
    let superBolt = 0;
    for (let i = 0; i < projectiles.length; i++) {
      const projectile = projectiles[i]!;
      _dummy.position.set(projectile.position.x, 0.06, projectile.position.z);
      _boltDir.set(projectile.velocity.x, 0, projectile.velocity.z).normalize();
      _dummy.quaternion.setFromUnitVectors(_up, _boltDir);
      if (projectile.kind === "super") {
        _dummy.scale.set(2.6, 2.6, 4.4);
        _dummy.updateMatrix();
        if (superBolt < MAX_SUPER_BOLTS) {
          superBoltMesh.setMatrixAt(superBolt++, _dummy.matrix);
        }
        continue;
      }
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();
      if (projectile.owner === "enemy") {
        if (enemyBolt < MAX_PROJECTILES) {
          enemyBoltMesh.setMatrixAt(enemyBolt++, _dummy.matrix);
        }
      } else if (playerBolt < MAX_PROJECTILES) {
        boltMesh.setMatrixAt(playerBolt++, _dummy.matrix);
      }
    }
    _dummy.position.set(0, -20, 0);
    _dummy.quaternion.identity();
    _dummy.scale.setScalar(0);
    _dummy.updateMatrix();
    for (let i = playerBolt; i < MAX_PROJECTILES; i++) {
      boltMesh.setMatrixAt(i, _dummy.matrix);
    }
    for (let i = enemyBolt; i < MAX_PROJECTILES; i++) {
      enemyBoltMesh.setMatrixAt(i, _dummy.matrix);
    }
    for (let i = superBolt; i < MAX_SUPER_BOLTS; i++) {
      superBoltMesh.setMatrixAt(i, _dummy.matrix);
    }
    boltMesh.instanceMatrix.needsUpdate = true;
    enemyBoltMesh.instanceMatrix.needsUpdate = true;
    superBoltMesh.instanceMatrix.needsUpdate = true;
    boltMesh.count = MAX_PROJECTILES;
    enemyBoltMesh.count = MAX_PROJECTILES;
    superBoltMesh.count = MAX_SUPER_BOLTS;
    boltMesh.frustumCulled = false;
    enemyBoltMesh.frustumCulled = false;
    superBoltMesh.frustumCulled = false;

    const nova = novaRef.current;
    const burst = superBurstRef.current;
    if (nova && burst) {
      if (!burst.active) {
        nova.visible = false;
        if (novaLightRef.current) novaLightRef.current.intensity = 0;
      } else {
        burst.age += delta;
        const t = burst.age / burst.duration;
        if (t >= 1) {
          burst.active = false;
          nova.visible = false;
          if (novaLightRef.current) novaLightRef.current.intensity = 0;
        } else {
          nova.visible = true;
          nova.position.set(burst.x, 0.12, burst.z);
          nova.rotation.x = -Math.PI / 2;
          const scale = 0.8 + t * 9.5;
          nova.scale.set(scale, scale, 1);
          novaMaterial.opacity = (1 - t) * 0.85;
          if (novaLightRef.current) {
            novaLightRef.current.position.set(burst.x, 0.7, burst.z);
            novaLightRef.current.intensity = (1 - t) * 10;
          }
        }
      }
    }
  });

  return (
    <>
      <instancedMesh
        ref={enemyMeshRef}
        args={[hostileGeometry, hostileMaterial, MAX_ENEMIES]}
        dispose={null}
        name="hostile-fighters"
      />
      <instancedMesh
        ref={boltMeshRef}
        args={[boltGeometry, boltMaterial, MAX_PROJECTILES]}
        dispose={null}
        name="bolts"
      />
      <instancedMesh
        ref={enemyBoltMeshRef}
        args={[boltGeometry, enemyBoltMaterial, MAX_PROJECTILES]}
        dispose={null}
        name="enemy-bolts"
      />
      <instancedMesh
        ref={superBoltMeshRef}
        args={[boltGeometry, superBoltMaterial, MAX_SUPER_BOLTS]}
        dispose={null}
        name="super-bolts"
      />
      <mesh
        ref={novaRef}
        geometry={novaGeometry}
        material={novaMaterial}
        visible={false}
        name="super-nova"
      />
      <pointLight
        ref={novaLightRef}
        color="#67e8f9"
        intensity={0}
        distance={12}
        decay={2}
      />
    </>
  );
}
