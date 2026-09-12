import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Enemy, Projectile } from "./types";
import { createBoltGeometry, createHostileGeometry } from "./shipGeometry";
import { applyHullMaps, createHostileTextures } from "./shipTextures";

const MAX_ENEMIES = 16;
const MAX_PROJECTILES = 48;

const _dummy = new THREE.Object3D();
const _boltDir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 0, -1);

interface CombatMeshesProps {
  enemiesRef: RefObject<Enemy[]>;
  projectilesRef: RefObject<Projectile[]>;
}

export function CombatMeshes({
  enemiesRef,
  projectilesRef,
}: CombatMeshesProps) {
  const enemyMeshRef = useRef<THREE.InstancedMesh>(null);
  const boltMeshRef = useRef<THREE.InstancedMesh>(null);
  const enemyBoltMeshRef = useRef<THREE.InstancedMesh>(null);

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

  useEffect(
    () => () => {
      hostileMaps.dispose();
      hostileGeometry.dispose();
      boltGeometry.dispose();
      hostileMaterial.dispose();
      boltMaterial.dispose();
      enemyBoltMaterial.dispose();
    },
    [
      boltGeometry,
      boltMaterial,
      enemyBoltMaterial,
      hostileGeometry,
      hostileMaps,
      hostileMaterial,
    ],
  );

  useFrame(() => {
    const enemyMesh = enemyMeshRef.current;
    const boltMesh = boltMeshRef.current;
    const enemyBoltMesh = enemyBoltMeshRef.current;
    if (!enemyMesh || !boltMesh || !enemyBoltMesh) return;

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
    for (let i = 0; i < projectiles.length; i++) {
      const projectile = projectiles[i]!;
      _dummy.position.set(projectile.position.x, 0.06, projectile.position.z);
      _boltDir.set(projectile.velocity.x, 0, projectile.velocity.z).normalize();
      _dummy.quaternion.setFromUnitVectors(_up, _boltDir);
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
    boltMesh.instanceMatrix.needsUpdate = true;
    enemyBoltMesh.instanceMatrix.needsUpdate = true;
    boltMesh.count = MAX_PROJECTILES;
    enemyBoltMesh.count = MAX_PROJECTILES;
    boltMesh.frustumCulled = false;
    enemyBoltMesh.frustumCulled = false;
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
    </>
  );
}
