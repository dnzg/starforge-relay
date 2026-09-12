import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Enemy, Projectile } from "./types";

const MAX_ENEMIES = 12;
const MAX_PROJECTILES = 24;

function createEnemyMesh(): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.45, 0),
    new THREE.MeshStandardMaterial({
      color: "#f87171",
      emissive: "#dc2626",
      emissiveIntensity: 0.45,
      metalness: 0.4,
      roughness: 0.35,
    }),
  );
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const wingMaterial = new THREE.MeshStandardMaterial({ color: "#991b1b" });
  const wingL = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.05, 0.15),
    wingMaterial,
  );
  wingL.position.set(-0.35, 0, 0);
  wingL.rotation.z = 0.5;
  group.add(wingL);

  const wingR = wingL.clone();
  wingR.position.set(0.35, 0, 0);
  wingR.rotation.z = -0.5;
  group.add(wingR);

  group.visible = false;
  return group;
}

function createProjectileMesh(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.06, 0.35, 4, 8),
    new THREE.MeshStandardMaterial({
      color: "#fef08a",
      emissive: "#facc15",
      emissiveIntensity: 1.2,
    }),
  );
  mesh.rotation.x = Math.PI / 2;
  mesh.visible = false;
  return mesh;
}

interface CombatMeshesProps {
  enemiesRef: RefObject<Enemy[]>;
  projectilesRef: RefObject<Projectile[]>;
}

export function CombatMeshes({
  enemiesRef,
  projectilesRef,
}: CombatMeshesProps) {
  const enemyGroupRef = useRef<THREE.Group>(null);
  const projectileGroupRef = useRef<THREE.Group>(null);
  const enemyPool = useMemo(
    () => Array.from({ length: MAX_ENEMIES }, () => createEnemyMesh()),
    [],
  );
  const projectilePool = useMemo(
    () => Array.from({ length: MAX_PROJECTILES }, () => createProjectileMesh()),
    [],
  );

  useFrame(() => {
    const enemyGroup = enemyGroupRef.current;
    const projectileGroup = projectileGroupRef.current;
    if (!enemyGroup || !projectileGroup) return;

    const enemies = enemiesRef.current;
    for (let i = 0; i < enemyPool.length; i++) {
      const mesh = enemyPool[i]!;
      if (i < enemies.length) {
        const enemy = enemies[i]!;
        mesh.visible = true;
        mesh.position.set(enemy.position.x, 0, enemy.position.z);
        if (!mesh.parent) enemyGroup.add(mesh);
      } else {
        mesh.visible = false;
      }
    }

    const projectiles = projectilesRef.current;
    for (let i = 0; i < projectilePool.length; i++) {
      const mesh = projectilePool[i]!;
      if (i < projectiles.length) {
        const projectile = projectiles[i]!;
        mesh.visible = true;
        mesh.position.set(projectile.position.x, 0, projectile.position.z);
        if (!mesh.parent) projectileGroup.add(mesh);
      } else {
        mesh.visible = false;
      }
    }
  });

  return (
    <>
      <group ref={enemyGroupRef} />
      <group ref={projectileGroupRef} />
    </>
  );
}
