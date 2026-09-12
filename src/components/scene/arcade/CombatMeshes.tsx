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

function createProjectilePool(count: number): THREE.Group[] {
  const coreGeo = new THREE.CapsuleGeometry(0.045, 0.42, 4, 8);
  const glowGeo = new THREE.CapsuleGeometry(0.13, 0.72, 4, 8);
  const trailGeo = new THREE.PlaneGeometry(0.2, 1.85);
  const coreMat = new THREE.MeshBasicMaterial({
    color: "#fff7ad",
    toneMapped: false,
  });
  const glowMat = new THREE.MeshBasicMaterial({
    color: "#facc15",
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const trailMat = new THREE.MeshBasicMaterial({
    color: "#7dd3fc",
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const haloMat = new THREE.MeshBasicMaterial({
    color: "#fde68a",
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });

  return Array.from({ length: count }, () => {
    const group = new THREE.Group();

    const core = new THREE.Mesh(coreGeo, coreMat);
    core.rotation.x = Math.PI / 2;
    group.add(core);

    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = Math.PI / 2;
    group.add(glow);

    const trail = new THREE.Mesh(trailGeo, trailMat);
    trail.rotation.x = Math.PI / 2;
    trail.position.z = -0.85;
    group.add(trail);

    const halo = new THREE.Mesh(trailGeo, haloMat);
    halo.rotation.y = Math.PI / 2;
    halo.position.z = -0.7;
    halo.scale.set(0.55, 1.15, 1);
    group.add(halo);

    group.visible = false;
    return group;
  });
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
  const projectilePool = useMemo(() => createProjectilePool(MAX_PROJECTILES), []);

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
        mesh.position.set(projectile.position.x, 0.08, projectile.position.z);
        mesh.rotation.y = Math.atan2(projectile.velocity.x, projectile.velocity.z);
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
