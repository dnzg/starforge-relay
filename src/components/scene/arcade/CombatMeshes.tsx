import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MAX_ENEMIES, MAX_PROJECTILES } from "./enemyBehavior";
import { enemyWreckStage } from "./shipWreck";
import type { Enemy, EnemyKind, Projectile, SuperBurstState } from "./types";

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
  wreck: {
    scorch: THREE.BoxGeometry;
    hole: THREE.CylinderGeometry;
    stub: THREE.BoxGeometry;
    fire: THREE.ConeGeometry;
    ember: THREE.SphereGeometry;
    smoke: THREE.SphereGeometry;
    scorchMat: THREE.MeshStandardMaterial;
    stubMat: THREE.MeshStandardMaterial;
    fireMat: THREE.MeshBasicMaterial;
    emberMat: THREE.MeshBasicMaterial;
    smokeMat: THREE.MeshBasicMaterial;
  };
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
    wreck: {
      scorch: new THREE.BoxGeometry(0.22, 0.04, 0.28),
      hole: new THREE.CylinderGeometry(0.04, 0.055, 0.08, 6),
      stub: new THREE.BoxGeometry(0.14, 0.035, 0.16),
      fire: new THREE.ConeGeometry(0.07, 0.28, 6),
      ember: new THREE.SphereGeometry(0.03, 6, 6),
      smoke: new THREE.SphereGeometry(0.12, 8, 8),
      scorchMat: new THREE.MeshStandardMaterial({
        color: "#1a0d0b",
        roughness: 0.95,
        metalness: 0.05,
      }),
      stubMat: new THREE.MeshStandardMaterial({
        color: "#3a241c",
        roughness: 0.82,
        metalness: 0.22,
      }),
      fireMat: new THREE.MeshBasicMaterial({
        color: "#ff6a28",
        transparent: true,
        opacity: 0.84,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      emberMat: new THREE.MeshBasicMaterial({
        color: "#ffb347",
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      smokeMat: new THREE.MeshBasicMaterial({
        color: "#161210",
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    },
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
  assets.wreck.scorch.dispose();
  assets.wreck.hole.dispose();
  assets.wreck.stub.dispose();
  assets.wreck.fire.dispose();
  assets.wreck.ember.dispose();
  assets.wreck.smoke.dispose();
  assets.wreck.scorchMat.dispose();
  assets.wreck.stubMat.dispose();
  assets.wreck.fireMat.dispose();
  assets.wreck.emberMat.dispose();
  assets.wreck.smokeMat.dispose();
}

function addWreckPart(
  group: THREE.Group,
  mesh: THREE.Object3D,
  hideAt?: number,
): void {
  group.add(mesh);
  if (hideAt !== undefined) {
    mesh.userData.hideAt = hideAt;
    const breakables = group.userData.breakables as THREE.Object3D[];
    breakables.push(mesh);
  }
}

function applyEnemyWreck(mesh: THREE.Group, stage: number): void {
  if (mesh.userData.wreckStage === stage) return;
  mesh.userData.wreckStage = stage;
  const wreck1 = mesh.userData.wreck1 as THREE.Object3D | undefined;
  const wreck2 = mesh.userData.wreck2 as THREE.Object3D | undefined;
  if (wreck1) wreck1.visible = stage >= 1;
  if (wreck2) wreck2.visible = stage >= 2;
  const breakables = mesh.userData.breakables as THREE.Object3D[] | undefined;
  if (!breakables) return;
  for (let i = 0; i < breakables.length; i++) {
    const part = breakables[i]!;
    const hideAt = Number(part.userData.hideAt);
    part.visible = !Number.isFinite(hideAt) || stage < hideAt;
  }
}

function createInterceptorMesh(assets: SharedEnemyAssets): THREE.Group {
  const group = new THREE.Group();
  group.userData.breakables = [];

  const body = new THREE.Mesh(assets.interceptor.body, assets.interceptor.bodyMat);
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.12;
  group.add(body);

  const wingL = new THREE.Mesh(assets.interceptor.wing, assets.interceptor.wingMat);
  wingL.position.set(-0.28, 0, 0.12);
  wingL.rotation.z = 0.55;
  addWreckPart(group, wingL, 2);

  const wingR = new THREE.Mesh(assets.interceptor.wing, assets.interceptor.wingMat);
  wingR.position.set(0.28, 0, 0.12);
  wingR.rotation.z = -0.55;
  addWreckPart(group, wingR, 1);

  const wreck1 = new THREE.Group();
  const scorch = new THREE.Mesh(assets.wreck.scorch, assets.wreck.scorchMat);
  scorch.position.set(0.04, 0.08, -0.02);
  scorch.rotation.z = 0.4;
  wreck1.add(scorch);
  const ember = new THREE.Mesh(assets.wreck.ember, assets.wreck.emberMat);
  ember.position.set(0.08, 0.12, 0.06);
  wreck1.add(ember);
  wreck1.visible = false;
  group.add(wreck1);

  const wreck2 = new THREE.Group();
  const stub = new THREE.Mesh(assets.wreck.stub, assets.wreck.stubMat);
  stub.position.set(-0.16, 0.02, 0.1);
  stub.rotation.z = 0.7;
  wreck2.add(stub);
  const fire = new THREE.Mesh(assets.wreck.fire, assets.wreck.fireMat);
  fire.position.set(0, 0.1, 0.18);
  fire.rotation.x = Math.PI / 2;
  wreck2.add(fire);
  wreck2.userData.fire = fire;
  wreck2.visible = false;
  group.add(wreck2);

  group.scale.setScalar(0.92);
  group.visible = false;
  group.userData.kind = "interceptor";
  group.userData.wreck1 = wreck1;
  group.userData.wreck2 = wreck2;
  return group;
}

function createGunshipMesh(assets: SharedEnemyAssets): THREE.Group {
  const group = new THREE.Group();
  group.userData.breakables = [];

  const hull = new THREE.Mesh(assets.gunship.hull, assets.gunship.hullMat);
  group.add(hull);

  const nacelleL = new THREE.Mesh(assets.gunship.nacelle, assets.gunship.nacelleMat);
  nacelleL.rotation.x = Math.PI / 2;
  nacelleL.position.set(-0.62, -0.02, 0.05);
  addWreckPart(group, nacelleL, 2);

  const nacelleR = new THREE.Mesh(assets.gunship.nacelle, assets.gunship.nacelleMat);
  nacelleR.rotation.x = Math.PI / 2;
  nacelleR.position.set(0.62, -0.02, 0.05);
  group.add(nacelleR);

  const turret = new THREE.Mesh(assets.gunship.turret, assets.gunship.turretMat);
  turret.position.set(0, 0.22, 0.05);
  addWreckPart(group, turret, 2);

  const dome = new THREE.Mesh(assets.gunship.dome, assets.gunship.turretMat);
  dome.position.set(0, 0.34, 0.05);
  addWreckPart(group, dome, 1);

  const wreck1 = new THREE.Group();
  const scorch = new THREE.Mesh(assets.wreck.scorch, assets.wreck.scorchMat);
  scorch.position.set(0.28, 0.16, 0.08);
  scorch.scale.set(1.4, 1, 1.1);
  wreck1.add(scorch);
  const hole = new THREE.Mesh(assets.wreck.hole, assets.wreck.scorchMat);
  hole.position.set(-0.2, 0.16, -0.08);
  hole.rotation.z = Math.PI / 2;
  wreck1.add(hole);
  wreck1.visible = false;
  group.add(wreck1);

  const wreck2 = new THREE.Group();
  const stub = new THREE.Mesh(assets.wreck.stub, assets.wreck.stubMat);
  stub.position.set(-0.5, -0.02, 0.05);
  stub.rotation.z = 0.45;
  wreck2.add(stub);
  const fire = new THREE.Mesh(assets.wreck.fire, assets.wreck.fireMat);
  fire.position.set(-0.52, 0.08, 0.08);
  fire.rotation.x = 0.9;
  wreck2.add(fire);
  const smoke = new THREE.Mesh(assets.wreck.smoke, assets.wreck.smokeMat);
  smoke.position.set(0, 0.28, 0.05);
  wreck2.add(smoke);
  wreck2.userData.fire = fire;
  wreck2.visible = false;
  group.add(wreck2);

  group.scale.setScalar(1.05);
  group.visible = false;
  group.userData.kind = "gunship";
  group.userData.wreck1 = wreck1;
  group.userData.wreck2 = wreck2;
  return group;
}

function createDroneMesh(assets: SharedEnemyAssets): THREE.Group {
  const group = new THREE.Group();
  group.userData.breakables = [];

  const core = new THREE.Mesh(assets.drone.core, assets.drone.coreMat);
  group.add(core);

  const ring = new THREE.Mesh(assets.drone.ring, assets.drone.ringMat);
  ring.rotation.x = Math.PI / 2;
  addWreckPart(group, ring, 2);
  group.userData.spin = ring;

  const spikeA = new THREE.Mesh(assets.drone.spike, assets.drone.spikeMat);
  spikeA.position.set(0, 0.34, 0);
  addWreckPart(group, spikeA, 1);

  const spikeB = new THREE.Mesh(assets.drone.spike, assets.drone.spikeMat);
  spikeB.position.set(0, -0.34, 0);
  spikeB.rotation.x = Math.PI;
  addWreckPart(group, spikeB, 2);

  const wreck1 = new THREE.Group();
  const scorch = new THREE.Mesh(assets.wreck.scorch, assets.wreck.scorchMat);
  scorch.position.set(0.08, 0.06, 0.04);
  scorch.scale.set(0.7, 0.7, 0.7);
  wreck1.add(scorch);
  const ember = new THREE.Mesh(assets.wreck.ember, assets.wreck.emberMat);
  ember.position.set(0.12, 0.1, 0.08);
  wreck1.add(ember);
  wreck1.visible = false;
  group.add(wreck1);

  const wreck2 = new THREE.Group();
  const fire = new THREE.Mesh(assets.wreck.fire, assets.wreck.fireMat);
  fire.position.set(0, 0.08, 0.12);
  fire.rotation.x = 1.1;
  wreck2.add(fire);
  const smoke = new THREE.Mesh(assets.wreck.smoke, assets.wreck.smokeMat);
  smoke.position.set(0, 0.16, 0);
  wreck2.add(smoke);
  wreck2.userData.fire = fire;
  wreck2.visible = false;
  group.add(wreck2);

  group.scale.setScalar(0.72);
  group.visible = false;
  group.userData.kind = "drone";
  group.userData.wreck1 = wreck1;
  group.userData.wreck2 = wreck2;
  return group;
}

function createGlowBolt(owner: "player" | "enemy"): THREE.Group {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.045, 0.42, 4, 8),
    new THREE.MeshBasicMaterial({
      color: owner === "enemy" ? "#fecdd3" : "#fff7ad",
      toneMapped: false,
    }),
  );
  core.rotation.x = Math.PI / 2;
  group.add(core);

  const glow = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.13, 0.72, 4, 8),
    new THREE.MeshBasicMaterial({
      color: owner === "enemy" ? "#fb7185" : "#facc15",
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  glow.rotation.x = Math.PI / 2;
  group.add(glow);

  const trail = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 1.85),
    new THREE.MeshBasicMaterial({
      color: owner === "enemy" ? "#fda4af" : "#7dd3fc",
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  trail.rotation.x = Math.PI / 2;
  trail.position.z = -0.85;
  group.add(trail);

  group.visible = false;
  group.userData.owner = owner;
  return group;
}

function createSuperBolt(): THREE.Group {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.09, 1.15, 4, 8),
    new THREE.MeshBasicMaterial({
      color: "#ecfeff",
      toneMapped: false,
    }),
  );
  core.rotation.x = Math.PI / 2;
  group.add(core);

  const glow = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 1.6, 4, 8),
    new THREE.MeshBasicMaterial({
      color: "#22d3ee",
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  glow.rotation.x = Math.PI / 2;
  group.add(glow);

  const trail = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 3.4),
    new THREE.MeshBasicMaterial({
      color: "#a5f3fc",
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  trail.rotation.x = Math.PI / 2;
  trail.position.z = -1.4;
  group.add(trail);

  group.visible = false;
  group.userData.kind = "super";
  return group;
}

const KIND_ORDER: EnemyKind[] = ["interceptor", "gunship", "drone"];

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
  const playerBoltPool = useMemo(
    () => Array.from({ length: MAX_PROJECTILES }, () => createGlowBolt("player")),
    [],
  );
  const enemyBoltPool = useMemo(
    () => Array.from({ length: MAX_PROJECTILES }, () => createGlowBolt("enemy")),
    [],
  );
  const superBoltPool = useMemo(
    () => Array.from({ length: 4 }, () => createSuperBolt()),
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
  const novaGeometry = useMemo(() => new THREE.RingGeometry(0.65, 0.95, 40), []);
  const novaRef = useRef<THREE.Mesh>(null);
  const novaLightRef = useRef<THREE.PointLight>(null);

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
    for (let i = 0; i < playerBoltPool.length; i++) {
      projectileGroup.add(playerBoltPool[i]!);
      projectileGroup.add(enemyBoltPool[i]!);
    }
    for (let i = 0; i < superBoltPool.length; i++) {
      projectileGroup.add(superBoltPool[i]!);
    }

    return () => {
      enemyGroup.clear();
      projectileGroup.clear();
      disposeSharedAssets(assets);
      novaMaterial.dispose();
      novaGeometry.dispose();
    };
  }, [assets, pools, playerBoltPool, enemyBoltPool, superBoltPool, novaMaterial, novaGeometry]);

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
      applyEnemyWreck(mesh, enemyWreckStage(enemy.hp, enemy.maxHp || enemy.hp));

      const spin = mesh.userData.spin as THREE.Object3D | undefined;
      if (spin && spin.visible) spin.rotation.z += delta * 1.8;

      const wreck2 = mesh.userData.wreck2 as THREE.Group | undefined;
      const fire = wreck2?.userData.fire as THREE.Object3D | undefined;
      if (fire && wreck2?.visible) {
        const pulse = 0.75 + Math.sin(clock.elapsedTime * 20 + enemy.id) * 0.25;
        fire.scale.set(pulse, 0.9 + pulse * 0.45, pulse);
      }
    }

    for (let i = interceptorUsed; i < pools.interceptor.length; i++) {
      const unused = pools.interceptor[i]!;
      unused.visible = false;
      applyEnemyWreck(unused, 0);
    }
    for (let i = gunshipUsed; i < pools.gunship.length; i++) {
      const unused = pools.gunship[i]!;
      unused.visible = false;
      applyEnemyWreck(unused, 0);
    }
    for (let i = droneUsed; i < pools.drone.length; i++) {
      const unused = pools.drone[i]!;
      unused.visible = false;
      applyEnemyWreck(unused, 0);
    }

    const projectiles = projectilesRef.current;
    let playerUsed = 0;
    let enemyUsed = 0;
    let superUsed = 0;
    for (let i = 0; i < projectiles.length; i++) {
      const projectile = projectiles[i]!;
      const mesh =
        projectile.kind === "super"
          ? superBoltPool[superUsed++]
          : projectile.owner === "enemy"
            ? enemyBoltPool[enemyUsed++]
            : playerBoltPool[playerUsed++];
      if (!mesh) continue;
      mesh.visible = true;
      mesh.position.set(projectile.position.x, 0.08, projectile.position.z);
      mesh.rotation.y = Math.atan2(projectile.velocity.x, projectile.velocity.z);
    }
    for (let i = playerUsed; i < playerBoltPool.length; i++) {
      playerBoltPool[i]!.visible = false;
    }
    for (let i = enemyUsed; i < enemyBoltPool.length; i++) {
      enemyBoltPool[i]!.visible = false;
    }
    for (let i = superUsed; i < superBoltPool.length; i++) {
      superBoltPool[i]!.visible = false;
    }

    const nova = novaRef.current;
    const burst = superBurstRef.current;
    if (nova && burst) {
      if (!burst.active) {
        nova.visible = false;
        if (novaLightRef.current) novaLightRef.current.intensity = 0;
      } else {
        const t = burst.duration > 0 ? burst.age / burst.duration : 1;
        if (t >= 1) {
          nova.visible = false;
          if (novaLightRef.current) novaLightRef.current.intensity = 0;
        } else {
          const scale = 1 + t * 7.5;
          nova.visible = true;
          nova.position.set(burst.x, 0.12, burst.z);
          nova.rotation.x = -Math.PI / 2;
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
      <group ref={enemyGroupRef} dispose={null} />
      <group ref={projectileGroupRef} dispose={null} />
      <mesh
        ref={novaRef}
        geometry={novaGeometry}
        material={novaMaterial}
        visible={false}
        name="super-nova"
      />
      <pointLight ref={novaLightRef} color="#67e8f9" intensity={0} distance={12} />
    </>
  );
}
