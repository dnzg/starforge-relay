import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MAX_ENEMIES, MAX_PROJECTILES } from "./enemyBehavior";
import type { Enemy, EnemyKind, Projectile } from "./types";

const POOL_PER_KIND = MAX_ENEMIES;

interface SharedEnemyAssets {
  interceptor: {
    body: THREE.ConeGeometry;
    wing: THREE.BoxGeometry;
    bodyMat: THREE.MeshStandardMaterial;
    wingMat: THREE.MeshStandardMaterial;
  };
  gunship: {
    hull: THREE.BoxGeometry;
    nacelle: THREE.CylinderGeometry;
    turret: THREE.CylinderGeometry;
    dome: THREE.SphereGeometry;
    hullMat: THREE.MeshStandardMaterial;
    nacelleMat: THREE.MeshStandardMaterial;
    turretMat: THREE.MeshStandardMaterial;
  };
  drone: {
    core: THREE.IcosahedronGeometry;
    ring: THREE.TorusGeometry;
    spike: THREE.ConeGeometry;
    coreMat: THREE.MeshStandardMaterial;
    ringMat: THREE.MeshStandardMaterial;
    spikeMat: THREE.MeshStandardMaterial;
  };
  playerBolt: THREE.MeshStandardMaterial;
  hostileBolt: THREE.MeshStandardMaterial;
  bolt: THREE.CapsuleGeometry;
}

function createSharedAssets(): SharedEnemyAssets {
  return {
    interceptor: {
      body: new THREE.ConeGeometry(0.22, 0.98, 6),
      wing: new THREE.BoxGeometry(0.58, 0.04, 0.16),
      bodyMat: new THREE.MeshStandardMaterial({
        color: "#fb923c",
        emissive: "#c2410c",
        emissiveIntensity: 0.55,
        metalness: 0.45,
        roughness: 0.3,
      }),
      wingMat: new THREE.MeshStandardMaterial({
        color: "#9a3412",
        metalness: 0.4,
        roughness: 0.45,
      }),
    },
    gunship: {
      hull: new THREE.BoxGeometry(1.35, 0.28, 0.72),
      nacelle: new THREE.CylinderGeometry(0.12, 0.16, 0.7, 6),
      turret: new THREE.CylinderGeometry(0.16, 0.18, 0.18, 8),
      dome: new THREE.SphereGeometry(0.14, 8, 6),
      hullMat: new THREE.MeshStandardMaterial({
        color: "#c084fc",
        emissive: "#6d28d9",
        emissiveIntensity: 0.4,
        metalness: 0.55,
        roughness: 0.32,
      }),
      nacelleMat: new THREE.MeshStandardMaterial({
        color: "#4c1d95",
        metalness: 0.5,
        roughness: 0.4,
      }),
      turretMat: new THREE.MeshStandardMaterial({
        color: "#e879f9",
        emissive: "#a21caf",
        emissiveIntensity: 0.55,
        metalness: 0.45,
        roughness: 0.28,
      }),
    },
    drone: {
      core: new THREE.IcosahedronGeometry(0.28, 0),
      ring: new THREE.TorusGeometry(0.38, 0.035, 8, 20),
      spike: new THREE.ConeGeometry(0.05, 0.22, 5),
      coreMat: new THREE.MeshStandardMaterial({
        color: "#4ade80",
        emissive: "#15803d",
        emissiveIntensity: 0.6,
        metalness: 0.35,
        roughness: 0.25,
      }),
      ringMat: new THREE.MeshStandardMaterial({
        color: "#86efac",
        emissive: "#22c55e",
        emissiveIntensity: 0.7,
        metalness: 0.3,
        roughness: 0.2,
      }),
      spikeMat: new THREE.MeshStandardMaterial({
        color: "#166534",
        metalness: 0.4,
        roughness: 0.4,
      }),
    },
    playerBolt: new THREE.MeshStandardMaterial({
      color: "#fef08a",
      emissive: "#facc15",
      emissiveIntensity: 1.2,
    }),
    hostileBolt: new THREE.MeshStandardMaterial({
      color: "#fda4af",
      emissive: "#e11d48",
      emissiveIntensity: 1.15,
    }),
    bolt: new THREE.CapsuleGeometry(0.06, 0.35, 4, 8),
  };
}

function disposeSharedAssets(assets: SharedEnemyAssets): void {
  assets.interceptor.body.dispose();
  assets.interceptor.wing.dispose();
  assets.interceptor.bodyMat.dispose();
  assets.interceptor.wingMat.dispose();
  assets.gunship.hull.dispose();
  assets.gunship.nacelle.dispose();
  assets.gunship.turret.dispose();
  assets.gunship.dome.dispose();
  assets.gunship.hullMat.dispose();
  assets.gunship.nacelleMat.dispose();
  assets.gunship.turretMat.dispose();
  assets.drone.core.dispose();
  assets.drone.ring.dispose();
  assets.drone.spike.dispose();
  assets.drone.coreMat.dispose();
  assets.drone.ringMat.dispose();
  assets.drone.spikeMat.dispose();
  assets.playerBolt.dispose();
  assets.hostileBolt.dispose();
  assets.bolt.dispose();
}

function createInterceptorMesh(assets: SharedEnemyAssets): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(assets.interceptor.body, assets.interceptor.bodyMat);
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.12;
  group.add(body);

  const wingL = new THREE.Mesh(assets.interceptor.wing, assets.interceptor.wingMat);
  wingL.position.set(-0.28, 0, 0.12);
  wingL.rotation.z = 0.55;
  group.add(wingL);

  const wingR = new THREE.Mesh(assets.interceptor.wing, assets.interceptor.wingMat);
  wingR.position.set(0.28, 0, 0.12);
  wingR.rotation.z = -0.55;
  group.add(wingR);

  group.scale.setScalar(0.92);
  group.visible = false;
  group.userData.kind = "interceptor";
  return group;
}

function createGunshipMesh(assets: SharedEnemyAssets): THREE.Group {
  const group = new THREE.Group();
  const hull = new THREE.Mesh(assets.gunship.hull, assets.gunship.hullMat);
  group.add(hull);

  const nacelleL = new THREE.Mesh(assets.gunship.nacelle, assets.gunship.nacelleMat);
  nacelleL.rotation.x = Math.PI / 2;
  nacelleL.position.set(-0.62, -0.02, 0.05);
  group.add(nacelleL);

  const nacelleR = new THREE.Mesh(assets.gunship.nacelle, assets.gunship.nacelleMat);
  nacelleR.rotation.x = Math.PI / 2;
  nacelleR.position.set(0.62, -0.02, 0.05);
  group.add(nacelleR);

  const turret = new THREE.Mesh(assets.gunship.turret, assets.gunship.turretMat);
  turret.position.set(0, 0.22, 0.05);
  group.add(turret);

  const dome = new THREE.Mesh(assets.gunship.dome, assets.gunship.turretMat);
  dome.position.set(0, 0.34, 0.05);
  group.add(dome);

  group.scale.setScalar(1.05);
  group.visible = false;
  group.userData.kind = "gunship";
  return group;
}

function createDroneMesh(assets: SharedEnemyAssets): THREE.Group {
  const group = new THREE.Group();
  const core = new THREE.Mesh(assets.drone.core, assets.drone.coreMat);
  group.add(core);

  const ring = new THREE.Mesh(assets.drone.ring, assets.drone.ringMat);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  group.userData.spin = ring;

  const spikeA = new THREE.Mesh(assets.drone.spike, assets.drone.spikeMat);
  spikeA.position.set(0, 0.34, 0);
  group.add(spikeA);

  const spikeB = new THREE.Mesh(assets.drone.spike, assets.drone.spikeMat);
  spikeB.position.set(0, -0.34, 0);
  spikeB.rotation.x = Math.PI;
  group.add(spikeB);

  group.scale.setScalar(0.72);
  group.visible = false;
  group.userData.kind = "drone";
  return group;
}

function createProjectileMesh(assets: SharedEnemyAssets): THREE.Mesh {
  const mesh = new THREE.Mesh(assets.bolt, assets.playerBolt);
  mesh.rotation.x = Math.PI / 2;
  mesh.visible = false;
  mesh.userData.owner = "player";
  return mesh;
}

const KIND_ORDER: EnemyKind[] = ["interceptor", "gunship", "drone"];

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
  const assets = useMemo(() => createSharedAssets(), []);
  const pools = useMemo(
    () => ({
      interceptor: Array.from({ length: POOL_PER_KIND }, () =>
        createInterceptorMesh(assets),
      ),
      gunship: Array.from({ length: POOL_PER_KIND }, () =>
        createGunshipMesh(assets),
      ),
      drone: Array.from({ length: POOL_PER_KIND }, () => createDroneMesh(assets)),
    }),
    [assets],
  );
  const projectilePool = useMemo(
    () => Array.from({ length: MAX_PROJECTILES }, () => createProjectileMesh(assets)),
    [assets],
  );

  useEffect(() => {
    const enemyGroup = enemyGroupRef.current;
    const projectileGroup = projectileGroupRef.current;
    if (!enemyGroup || !projectileGroup) return;

    for (let k = 0; k < KIND_ORDER.length; k++) {
      const pool = pools[KIND_ORDER[k]!];
      for (let i = 0; i < pool.length; i++) {
        enemyGroup.add(pool[i]!);
      }
    }
    for (let i = 0; i < projectilePool.length; i++) {
      projectileGroup.add(projectilePool[i]!);
    }

    return () => {
      enemyGroup.clear();
      projectileGroup.clear();
      disposeSharedAssets(assets);
    };
  }, [assets, pools, projectilePool]);

  useFrame(({ clock }, delta) => {
    const enemies = enemiesRef.current;
    let interceptorUsed = 0;
    let gunshipUsed = 0;
    let droneUsed = 0;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i]!;
      let mesh: THREE.Group | undefined;
      if (enemy.kind === "interceptor") {
        mesh = pools.interceptor[interceptorUsed++];
      } else if (enemy.kind === "gunship") {
        mesh = pools.gunship[gunshipUsed++];
      } else {
        mesh = pools.drone[droneUsed++];
      }
      if (!mesh) continue;

      const bob =
        enemy.kind === "drone"
          ? Math.sin(clock.elapsedTime * 2.6 + enemy.strafePhase) * 0.14
          : 0;
      mesh.visible = true;
      mesh.position.set(enemy.position.x, bob, enemy.position.z);
      mesh.rotation.y = enemy.heading;

      const spin = mesh.userData.spin as THREE.Object3D | undefined;
      if (spin) spin.rotation.z += delta * 1.8;
    }

    for (let i = interceptorUsed; i < pools.interceptor.length; i++) {
      pools.interceptor[i]!.visible = false;
    }
    for (let i = gunshipUsed; i < pools.gunship.length; i++) {
      pools.gunship[i]!.visible = false;
    }
    for (let i = droneUsed; i < pools.drone.length; i++) {
      pools.drone[i]!.visible = false;
    }

    const projectiles = projectilesRef.current;
    for (let i = 0; i < projectilePool.length; i++) {
      const mesh = projectilePool[i]!;
      if (i < projectiles.length) {
        const projectile = projectiles[i]!;
        mesh.visible = true;
        mesh.position.set(projectile.position.x, 0, projectile.position.z);
        if (mesh.userData.owner !== projectile.owner) {
          mesh.material =
            projectile.owner === "enemy" ? assets.hostileBolt : assets.playerBolt;
          mesh.userData.owner = projectile.owner;
        }
      } else {
        mesh.visible = false;
      }
    }
  });

  return (
    <>
      <group ref={enemyGroupRef} dispose={null} />
      <group ref={projectileGroupRef} dispose={null} />
    </>
  );
}
