import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ArcadeInputState } from "../../../hooks/useArcadeInput";
import {
  arcadeUiRef,
  KILLS_FOR_JUMP,
  resetArcadeUiForSector,
} from "../../../lib/combat/arcadeUiRef";
import {
  createCombatVfxState,
  type CombatVfxApi,
} from "../../../lib/combat/combatVfx";
import { PlayerShipMesh } from "./PlayerShipMesh";
import { CombatMeshes } from "./CombatMeshes";
import { CombatVfx } from "./CombatVfx";
import { JumpGateMesh } from "./JumpGateMesh";
import { WorldObjectiveLabels } from "./WorldObjectiveLabels";
import {
  applyArcadeFlight,
  CAM_BACK,
  CAM_HEIGHT,
} from "./arcadeFlight";
import {
  createExplosionPool,
  ExplosionBursts,
  spawnExplosion,
} from "./ExplosionBursts";
import { lerpAngle, noseDirection } from "./shipGeometry";
import {
  enemyContactRadius,
  enemyHitRadius,
  MAX_ENEMIES,
  MAX_PROJECTILES,
  SECTOR_BOUNDS,
  spawnEnemy,
  updateEnemies,
} from "./enemyBehavior";
import {
  createInitialPlayer,
  dist2,
  type CombatCallbacks,
  type Enemy,
  type ExplosionSlot,
  type JumpGateState,
  type PlayerState,
  type Projectile,
} from "./types";

const PLAYER_SPEED = 9;
const BOOST_MULT = 1.75;
const FIRE_COOLDOWN = 0.16;
const PROJECTILE_SPEED = 28;
const PROJECTILE_TTL = 2.2;
const ENEMY_CONTACT_DAMAGE = 12;
const HOSTILE_SHOT_DAMAGE = 8;
const HOSTILE_SHOT_RADIUS = 0.55;
const ENEMY_SPAWN_INTERVAL = 2.4;
const MAX_DELTA = 0.05;
const JUMP_GATE_RADIUS = 2.2;
const BASE_FOV = 60;
const BOOST_FOV = 68;
const WARP_FOV = 72;

const _nose = new THREE.Vector3();
const _shake = new THREE.Vector3();

function clampDelta(delta: number): number {
  return Math.min(delta, MAX_DELTA);
}

function resetGameState(
  playerRef: RefObject<PlayerState>,
  enemiesRef: RefObject<Enemy[]>,
  projectilesRef: RefObject<Projectile[]>,
  nextIdRef: RefObject<number>,
  sectorKey: string,
  threatLevel: number,
  sectorKeyRef: RefObject<string>,
  sectorKillsRef: RefObject<number>,
  jumpGateRef: RefObject<JumpGateState>,
  explosionsRef: RefObject<ExplosionSlot[]>,
  vfxApi: CombatVfxApi,
) {
  if (sectorKeyRef.current === sectorKey) return;
  sectorKeyRef.current = sectorKey;
  playerRef.current = createInitialPlayer();
  enemiesRef.current.length = 0;
  projectilesRef.current.length = 0;
  nextIdRef.current = 1;
  sectorKillsRef.current = 0;
  jumpGateRef.current = {
    active: false,
    position: { x: 0, z: -18 },
  };
  for (const slot of explosionsRef.current) {
    slot.active = false;
  }
  vfxApi.reset();
  resetArcadeUiForSector();

  const initialCount = Math.min(5, 2 + Math.floor(threatLevel / 2));
  for (let i = 0; i < initialCount; i++) {
    enemiesRef.current.push(
      spawnEnemy(
        nextIdRef.current++,
        playerRef.current,
        threatLevel,
        enemiesRef.current,
      ),
    );
  }
}

function updateProjectiles(projectiles: Projectile[], dt: number): void {
  let write = 0;
  for (let i = 0; i < projectiles.length; i++) {
    const projectile = projectiles[i]!;
    projectile.position.x += projectile.velocity.x * dt;
    projectile.position.z += projectile.velocity.z * dt;
    projectile.ttl -= dt;
    if (projectile.ttl > 0) {
      projectiles[write++] = projectile;
    }
  }
  projectiles.length = write;
}

function resolveCollisions(
  enemies: Enemy[],
  projectiles: Projectile[],
  callbacks: CombatCallbacks,
  sectorKillsRef: RefObject<number>,
  jumpGateRef: RefObject<JumpGateState>,
  explosions: ExplosionSlot[],
  shakeRef: RefObject<number>,
  vfxApi: CombatVfxApi,
): void {
  let surviving = 0;
  for (let ei = 0; ei < enemies.length; ei++) {
    const enemy = enemies[ei]!;
    let hp = enemy.hp;
    let hit = false;

    let pw = 0;
    for (let pi = 0; pi < projectiles.length; pi++) {
      const projectile = projectiles[pi]!;
      if (
        projectile.owner === "player" &&
        dist2(projectile.position, enemy.position) < enemyHitRadius(enemy)
      ) {
        hp -= 1;
        hit = true;
      } else {
        projectiles[pw++] = projectile;
      }
    }
    projectiles.length = pw;

    if (hp <= 0) {
      spawnExplosion(explosions, enemy.position.x, enemy.position.z);
      vfxApi.spawnBurst(enemy.position.x, enemy.position.z, "enemy");
      shakeRef.current = Math.max(shakeRef.current, 0.55);
      callbacks.onEnemyKilled();
      sectorKillsRef.current += 1;
      if (
        sectorKillsRef.current >= KILLS_FOR_JUMP &&
        !jumpGateRef.current.active
      ) {
        jumpGateRef.current.active = true;
      }
    } else {
      if (hit) {
        vfxApi.spawnImpact(enemy.position.x, enemy.position.z);
      }
      enemy.hp = hp;
      enemies[surviving++] = enemy;
    }
  }
  enemies.length = surviving;
}

function updateObjectiveTarget(
  player: PlayerState,
  enemies: Enemy[],
  jumpGate: JumpGateState,
  sectorKills: number,
): void {
  arcadeUiRef.playerX = player.position.x;
  arcadeUiRef.playerZ = player.position.z;
  arcadeUiRef.sectorKills = sectorKills;
  arcadeUiRef.killsRequired = KILLS_FOR_JUMP;
  arcadeUiRef.jumpGateUnlocked = jumpGate.active;
  arcadeUiRef.jumpGateX = jumpGate.position.x;
  arcadeUiRef.jumpGateZ = jumpGate.position.z;

  if (jumpGate.active) {
    arcadeUiRef.targetType = "gate";
    arcadeUiRef.targetX = jumpGate.position.x;
    arcadeUiRef.targetZ = jumpGate.position.z;
    return;
  }

  let nearest: Enemy | null = null;
  let nearestDist = Infinity;
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i]!;
    const d = dist2(player.position, enemy.position);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = enemy;
    }
  }

  if (nearest) {
    arcadeUiRef.targetType = "enemy";
    arcadeUiRef.targetX = nearest.position.x;
    arcadeUiRef.targetZ = nearest.position.z;
  } else {
    arcadeUiRef.targetType = "none";
    arcadeUiRef.targetX = player.position.x;
    arcadeUiRef.targetZ = player.position.z;
  }
}

interface ArcadeGameLoopProps {
  enabled: boolean;
  hyperspaceActive?: boolean;
  sectorKey: string;
  threatLevel: number;
  getInput: () => ArcadeInputState;
  callbacks: CombatCallbacks;
}

export function ArcadeGameLoop({
  enabled,
  hyperspaceActive = false,
  sectorKey,
  threatLevel,
  getInput,
  callbacks,
}: ArcadeGameLoopProps) {
  const { camera, clock } = useThree();
  const playerRef = useRef<PlayerState>(createInitialPlayer());
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const explosionsRef = useRef<ExplosionSlot[]>(createExplosionPool());
  const nextIdRef = useRef(1);
  const fireCooldownRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const sectorKeyRef = useRef("");
  const invulnRef = useRef(false);
  const sectorKillsRef = useRef(0);
  const jumpGateRef = useRef<JumpGateState>({
    active: false,
    position: { x: 0, z: -18 },
  });
  const cameraTarget = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());
  const camYawRef = useRef(0);
  const shakeRef = useRef(0);
  const turnRateRef = useRef(0);
  const jumpGateTriggeredRef = useRef(false);
  const vfx = useMemo(() => createCombatVfxState(), []);

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.clearViewOffset();
      camera.far = 800;
      camera.updateProjectionMatrix();
    }
  }, [camera]);

  useEffect(() => {
    jumpGateTriggeredRef.current = false;
    resetGameState(
      playerRef,
      enemiesRef,
      projectilesRef,
      nextIdRef,
      sectorKey,
      threatLevel,
      sectorKeyRef,
      sectorKillsRef,
      jumpGateRef,
      explosionsRef,
      vfx.api,
    );
  }, [sectorKey, threatLevel, vfx.api]);

  useFrame((_, delta) => {
    const dt = clampDelta(delta);
    const player = playerRef.current;
    const persp =
      camera instanceof THREE.PerspectiveCamera ? camera : null;

    if (enabled) {
      const input = getInput();
      const boost = input.boost ? BOOST_MULT : 1;
      const speed = PLAYER_SPEED * boost * dt;
      const previousYaw = player.rotation;

      applyArcadeFlight(player, input, speed, dt);
      player.position.x = THREE.MathUtils.clamp(
        player.position.x,
        -SECTOR_BOUNDS,
        SECTOR_BOUNDS,
      );
      player.position.z = THREE.MathUtils.clamp(
        player.position.z,
        -SECTOR_BOUNDS,
        SECTOR_BOUNDS,
      );

      turnRateRef.current = THREE.MathUtils.lerp(
        turnRateRef.current,
        player.rotation - previousYaw,
        0.35,
      );

      fireCooldownRef.current = Math.max(0, fireCooldownRef.current - dt);
      if (
        input.fire &&
        fireCooldownRef.current <= 0 &&
        projectilesRef.current.length < MAX_PROJECTILES
      ) {
        fireCooldownRef.current = FIRE_COOLDOWN;
        noseDirection(player.rotation, _nose);
        const muzzleX = player.position.x + _nose.x * 0.95;
        const muzzleZ = player.position.z + _nose.z * 0.95;
        projectilesRef.current.push({
          id: nextIdRef.current++,
          position: {
            x: muzzleX,
            z: muzzleZ,
          },
          velocity: {
            x: _nose.x * PROJECTILE_SPEED,
            z: _nose.z * PROJECTILE_SPEED,
          },
          ttl: PROJECTILE_TTL,
          owner: "player",
        });
        vfx.api.spawnMuzzle(muzzleX, muzzleZ, _nose.x, _nose.z);
      }

      updateProjectiles(projectilesRef.current, dt);

      spawnTimerRef.current += dt;
      const maxEnemies = Math.min(
        MAX_ENEMIES,
        6 + Math.floor(threatLevel / 2),
      );
      if (
        spawnTimerRef.current >= ENEMY_SPAWN_INTERVAL &&
        enemiesRef.current.length < maxEnemies
      ) {
        spawnTimerRef.current = 0;
        enemiesRef.current.push(
          spawnEnemy(
            nextIdRef.current++,
            player,
            threatLevel,
            enemiesRef.current,
          ),
        );
      }

      updateEnemies(
        enemiesRef.current,
        player,
        dt,
        clock.elapsedTime,
        projectilesRef.current,
        nextIdRef,
      );

      resolveCollisions(
        enemiesRef.current,
        projectilesRef.current,
        callbacks,
        sectorKillsRef,
        jumpGateRef,
        explosionsRef.current,
        shakeRef,
        vfx.api,
      );

      if (!invulnRef.current) {
        let hit = false;
        for (let i = 0; i < enemiesRef.current.length; i++) {
          const enemy = enemiesRef.current[i]!;
          if (dist2(player.position, enemy.position) < enemyContactRadius(enemy)) {
            hit = true;
            const dx = enemy.position.x - player.position.x;
            const dz = enemy.position.z - player.position.z;
            const dist = Math.max(0.001, Math.hypot(dx, dz));
            enemy.position.x += (dx / dist) * 1.4;
            enemy.position.z += (dz / dist) * 1.4;
            callbacks.onPlayerHit(ENEMY_CONTACT_DAMAGE);
            break;
          }
        }

        if (!hit) {
          let pw = 0;
          for (let i = 0; i < projectilesRef.current.length; i++) {
            const bolt = projectilesRef.current[i]!;
            if (
              bolt.owner === "enemy" &&
              dist2(player.position, bolt.position) < HOSTILE_SHOT_RADIUS
            ) {
              hit = true;
              callbacks.onPlayerHit(HOSTILE_SHOT_DAMAGE);
              continue;
            }
            projectilesRef.current[pw++] = bolt;
          }
          projectilesRef.current.length = pw;
        }

        if (hit) {
          player.invulnTimer = 1.1;
          invulnRef.current = true;
          shakeRef.current = Math.max(shakeRef.current, 0.7);
          vfx.api.spawnBurst(player.position.x, player.position.z, "player");
        }
      }

      const gate = jumpGateRef.current;
      if (
        gate.active &&
        !jumpGateTriggeredRef.current &&
        dist2(player.position, gate.position) < JUMP_GATE_RADIUS
      ) {
        jumpGateTriggeredRef.current = true;
        shakeRef.current = Math.max(shakeRef.current, 0.9);
        callbacks.onJumpGateEnter();
      }

      updateObjectiveTarget(
        player,
        enemiesRef.current,
        gate,
        sectorKillsRef.current,
      );
    }

    camYawRef.current = lerpAngle(
      camYawRef.current,
      player.rotation,
      1 - Math.exp(-3.1 * dt),
    );
    cameraTarget.current.set(
      player.position.x + Math.sin(camYawRef.current) * CAM_BACK,
      CAM_HEIGHT + player.pitch * 0.85,
      player.position.z + Math.cos(camYawRef.current) * CAM_BACK,
    );
    shakeRef.current = Math.max(0, shakeRef.current - dt * 2.4);
    if (shakeRef.current > 0) {
      const s = shakeRef.current;
      _shake.set(
        Math.sin(player.invulnTimer * 38) * s * 0.28,
        Math.cos(player.invulnTimer * 27) * s * 0.12,
        Math.sin(player.invulnTimer * 21) * s * 0.22,
      );
      cameraTarget.current.add(_shake);
    }

    const lerpFactor = 1 - Math.exp(-5.2 * dt);
    camera.position.lerp(cameraTarget.current, lerpFactor);
    lookTarget.current.set(
      player.position.x - Math.sin(player.rotation) * 1.6,
      0.45 - player.pitch * 0.55,
      player.position.z - Math.cos(player.rotation) * 1.6,
    );
    camera.lookAt(lookTarget.current);
    camera.rotateZ(-turnRateRef.current * 1.8);

    if (persp) {
      const targetFov = hyperspaceActive
        ? WARP_FOV
        : enabled && getInput().boost
          ? BOOST_FOV
          : BASE_FOV;
      persp.fov += (targetFov - persp.fov) * (1 - Math.exp(-5 * dt));
      persp.updateProjectionMatrix();
    }
  });

  return (
    <>
      <PlayerShipMesh playerRef={playerRef} invulnRef={invulnRef} />
      <CombatMeshes enemiesRef={enemiesRef} projectilesRef={projectilesRef} />
      <CombatVfx vfx={vfx} />
      <ExplosionBursts explosionsRef={explosionsRef} />
      <JumpGateMesh gateRef={jumpGateRef} />
      <WorldObjectiveLabels jumpGateRef={jumpGateRef} />
    </>
  );
}
