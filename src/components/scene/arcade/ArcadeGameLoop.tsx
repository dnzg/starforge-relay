import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ArcadeInputState } from "../../../hooks/useArcadeInput";
import {
  arcadeUiRef,
  KILLS_FOR_JUMP,
  MANA_BOOST_PER_SECOND,
  MANA_MAX,
  MANA_PER_KILL,
  MANA_PER_SECOND,
  resetArcadeUiForSector,
  writeMana,
} from "../../../lib/combat/arcadeUiRef";
import {
  createCombatVfxState,
  type CombatVfxApi,
} from "../../../lib/combat/combatVfx";
import { telegramHaptic } from "../../../lib/telegram/haptics";
import { PlayerShipMesh } from "./PlayerShipMesh";
import { BoostStreaks } from "./BoostStreaks";
import { CombatMeshes } from "./CombatMeshes";
import { CombatVfx } from "./CombatVfx";
import { JumpGateMesh } from "./JumpGateMesh";
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
  type SuperBurstState,
} from "./types";
import { playSfx, setBoostAudio, sfxPan } from "../../../lib/audio/gameAudio";

const PLAYER_SPEED = 9;
const BOOST_MULT = 1.75;
const FIRE_COOLDOWN = 0.16;
const PROJECTILE_SPEED = 28;
const PROJECTILE_TTL = 2.2;
const ENEMY_CONTACT_DAMAGE = 12;
const HOSTILE_SHOT_DAMAGE = 8;
const HOSTILE_SHOT_RADIUS = 0.55;
const SUPER_HIT_RADIUS = 1.9;
const SUPER_DAMAGE = 8;
const SUPER_SPEED = 42;
const SUPER_TTL = 1.75;
const NOVA_RADIUS = 4.8;
const NOVA_DAMAGE = 3;
const MANA_LOCK_AFTER_SUPER = 0.85;
const MAX_DELTA = 0.05;
const TIME_SCALE_LERP = 7;
const SECTOR_ENEMY_MIN = 5;
const SECTOR_ENEMY_MAX = 8;
const JUMP_GATE_RADIUS = 2.2;
const BASE_FOV = 60;
const BOOST_FOV = 76;
const WARP_FOV = 72;
const BOOST_CAM_BACK = 1.35;

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
  manaRef: RefObject<number>,
  superBurstRef: RefObject<SuperBurstState>,
  manaLockRef: RefObject<number>,
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
  manaRef.current = 0;
  manaLockRef.current = 0;
  superBurstRef.current.active = false;
  resetArcadeUiForSector();

  const initialCount = THREE.MathUtils.clamp(
    SECTOR_ENEMY_MIN + Math.floor(threatLevel / 2),
    SECTOR_ENEMY_MIN,
    SECTOR_ENEMY_MAX,
  );
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

function applyNova(enemies: Enemy[], originX: number, originZ: number): void {
  const origin = { x: originX, z: originZ };
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i]!;
    if (dist2(origin, enemy.position) < NOVA_RADIUS) {
      enemy.hp -= NOVA_DAMAGE;
    }
  }
}

function triggerSuperBurst(burst: SuperBurstState, x: number, z: number): void {
  burst.active = true;
  burst.x = x;
  burst.z = z;
  burst.age = 0;
  burst.duration = 0.5;
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
  manaRef: RefObject<number>,
  manaLockRef: RefObject<number>,
  playerX: number,
): void {
  let surviving = 0;
  for (let ei = 0; ei < enemies.length; ei++) {
    const enemy = enemies[ei]!;
    let hp = enemy.hp;
    let hit = false;

    let pw = 0;
    for (let pi = 0; pi < projectiles.length; pi++) {
      const projectile = projectiles[pi]!;
      if (projectile.owner === "player") {
        const radius =
          projectile.kind === "super"
            ? SUPER_HIT_RADIUS
            : enemyHitRadius(enemy);
        if (dist2(projectile.position, enemy.position) < radius) {
          hp -= projectile.kind === "super" ? SUPER_DAMAGE : 1;
          hit = true;
          if (projectile.kind === "super") {
            projectiles[pw++] = projectile;
          }
          continue;
        }
      }
      projectiles[pw++] = projectile;
    }
    projectiles.length = pw;

    if (hp <= 0) {
      spawnExplosion(explosions, enemy.position.x, enemy.position.z);
      vfxApi.spawnBurst(enemy.position.x, enemy.position.z, "enemy");
      playSfx("explosion", { pan: sfxPan(enemy.position.x, playerX) });
      shakeRef.current = Math.max(shakeRef.current, 0.55);
      callbacks.onEnemyKilled();
      telegramHaptic("medium");
      sectorKillsRef.current += 1;
      if (manaLockRef.current <= 0) {
        manaRef.current = writeMana(manaRef.current + MANA_PER_KILL);
      }
      if (
        sectorKillsRef.current >= KILLS_FOR_JUMP &&
        !jumpGateRef.current.active
      ) {
        jumpGateRef.current.active = true;
        playSfx("gate_unlock");
      }
    } else {
      if (hit) {
        vfxApi.spawnImpact(enemy.position.x, enemy.position.z);
        playSfx("impact", { pan: sfxPan(enemy.position.x, playerX) });
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
  arcadeUiRef.playerHeading = player.rotation;
  arcadeUiRef.sectorKills = sectorKills;
  arcadeUiRef.killsRequired = KILLS_FOR_JUMP;
  arcadeUiRef.jumpGateUnlocked = jumpGate.active;
  arcadeUiRef.jumpGateX = jumpGate.position.x;
  arcadeUiRef.jumpGateZ = jumpGate.position.z;

  let blipCount = 0;
  const blips = arcadeUiRef.blips;
  for (let i = 0; i < enemies.length && blipCount < blips.length; i++) {
    const enemy = enemies[i]!;
    const blip = blips[blipCount]!;
    blip.x = enemy.position.x;
    blip.z = enemy.position.z;
    blip.kind = "enemy";
    blipCount += 1;
  }
  if (jumpGate.active && blipCount < blips.length) {
    const blip = blips[blipCount]!;
    blip.x = jumpGate.position.x;
    blip.z = jumpGate.position.z;
    blip.kind = "gate";
    blipCount += 1;
  }
  arcadeUiRef.blipCount = blipCount;
  arcadeUiRef.targetType = "none";
  arcadeUiRef.targetX = player.position.x;
  arcadeUiRef.targetZ = player.position.z;
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
  const { camera, clock, gl } = useThree();
  const viewportElRef = useRef<HTMLElement | null>(null);
  const playerRef = useRef<PlayerState>(createInitialPlayer());
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const explosionsRef = useRef<ExplosionSlot[]>(createExplosionPool());
  const nextIdRef = useRef(1);
  const fireCooldownRef = useRef(0);
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
  const boostHeldRef = useRef(false);
  const boostSmoothRef = useRef(0);
  const boostVisualRef = useRef(0);
  const boostPunchRef = useRef(0);
  const manaRef = useRef(0);
  const manaLockRef = useRef(0);
  const superBurstRef = useRef<SuperBurstState>({
    active: false,
    x: 0,
    z: 0,
    age: 0,
    duration: 0.5,
  });
  const vfx = useMemo(() => createCombatVfxState(), []);

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.clearViewOffset();
      camera.far = 800;
      camera.updateProjectionMatrix();
    }
  }, [camera]);

  useEffect(() => {
    return () => {
      viewportElRef.current?.style.setProperty("--boost", "0");
      setBoostAudio(0);
    };
  }, []);

  useEffect(() => {
    jumpGateTriggeredRef.current = false;
    boostHeldRef.current = false;
    boostSmoothRef.current = 0;
    boostVisualRef.current = 0;
    boostPunchRef.current = 0;
    setBoostAudio(0);
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
      manaRef,
      superBurstRef,
      manaLockRef,
    );
  }, [sectorKey, threatLevel, vfx.api]);

  useFrame((_, delta) => {
    const rawDt = clampDelta(delta);
    const ui = arcadeUiRef;
    ui.worldTimeScale +=
      (ui.worldTimeScaleTarget - ui.worldTimeScale) *
      (1 - Math.exp(-TIME_SCALE_LERP * rawDt));
    if (Math.abs(ui.worldTimeScale - ui.worldTimeScaleTarget) < 0.002) {
      ui.worldTimeScale = ui.worldTimeScaleTarget;
    }
    const dt = rawDt * ui.worldTimeScale;
    const player = playerRef.current;
    const persp =
      camera instanceof THREE.PerspectiveCamera ? camera : null;

    if (enabled) {
      const input = getInput();
      const canBoost = input.boost && manaRef.current > 0;
      if (canBoost && !boostHeldRef.current) {
        playSfx("boost");
        boostPunchRef.current = 1;
      }
      boostHeldRef.current = canBoost;
      if (canBoost) {
        manaRef.current = writeMana(
          manaRef.current - MANA_BOOST_PER_SECOND * dt,
        );
      }
      const boost = canBoost ? BOOST_MULT : 1;
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
          kind: "bolt",
        });
        vfx.api.spawnMuzzle(muzzleX, muzzleZ, _nose.x, _nose.z);
        playSfx("player_laser");
        telegramHaptic("light");
      }

      manaLockRef.current = Math.max(0, manaLockRef.current - dt);
      if (manaLockRef.current <= 0 && !canBoost) {
        manaRef.current = writeMana(manaRef.current + MANA_PER_SECOND * dt);
      }
      if (input.superPressed && manaRef.current >= MANA_MAX) {
        manaRef.current = writeMana(0);
        manaLockRef.current = MANA_LOCK_AFTER_SUPER;
        noseDirection(player.rotation, _nose);
        projectilesRef.current.push({
          id: nextIdRef.current++,
          position: {
            x: player.position.x + _nose.x * 1.05,
            z: player.position.z + _nose.z * 1.05,
          },
          velocity: {
            x: _nose.x * SUPER_SPEED,
            z: _nose.z * SUPER_SPEED,
          },
          ttl: SUPER_TTL,
          owner: "player",
          kind: "super",
        });
        applyNova(enemiesRef.current, player.position.x, player.position.z);
        triggerSuperBurst(superBurstRef.current, player.position.x, player.position.z);
        vfx.api.spawnBurst(player.position.x, player.position.z, "player");
        shakeRef.current = Math.max(shakeRef.current, 0.95);
        playSfx("super");
      }
      if (superBurstRef.current.active) {
        superBurstRef.current.age += dt;
        if (superBurstRef.current.age >= superBurstRef.current.duration) {
          superBurstRef.current.active = false;
        }
      }

      updateProjectiles(projectilesRef.current, dt);

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
        manaRef,
        manaLockRef,
        player.position.x,
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
          playSfx("player_hit");
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
    const boostHeld = enabled && boostHeldRef.current;
    boostSmoothRef.current +=
      ((boostHeld ? 1 : 0) - boostSmoothRef.current) *
      (1 - Math.exp(-9 * dt));
    boostPunchRef.current = Math.max(0, boostPunchRef.current - dt * 3.1);
    const boostVisual = Math.min(
      1.2,
      boostSmoothRef.current + boostPunchRef.current * 0.55,
    );
    boostVisualRef.current = boostVisual;
    if (!viewportElRef.current) {
      viewportElRef.current = gl.domElement.closest(".viewport");
    }
    viewportElRef.current?.style.setProperty(
      "--boost",
      boostVisual.toFixed(3),
    );
    setBoostAudio(boostVisual);
    const camBack = CAM_BACK + boostVisual * BOOST_CAM_BACK;

    cameraTarget.current.set(
      player.position.x + Math.sin(camYawRef.current) * camBack,
      CAM_HEIGHT + player.pitch * 0.85 - boostVisual * 0.18,
      player.position.z + Math.cos(camYawRef.current) * camBack,
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
    if (boostVisual > 0.04) {
      const t = clock.elapsedTime;
      _shake.set(
        Math.sin(t * 51) * boostVisual * 0.045,
        Math.cos(t * 37) * boostVisual * 0.028,
        Math.sin(t * 29) * boostVisual * 0.032,
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
        : THREE.MathUtils.lerp(BASE_FOV, BOOST_FOV, Math.min(1, boostVisual));
      persp.fov += (targetFov - persp.fov) * (1 - Math.exp(-5 * dt));
      persp.updateProjectionMatrix();
    }
  });

  return (
    <>
      <PlayerShipMesh
        playerRef={playerRef}
        invulnRef={invulnRef}
        boostIntensityRef={boostVisualRef}
      />
      <BoostStreaks intensityRef={boostVisualRef} />
      <CombatMeshes
        enemiesRef={enemiesRef}
        projectilesRef={projectilesRef}
        superBurstRef={superBurstRef}
      />
      <CombatVfx vfx={vfx} />
      <ExplosionBursts explosionsRef={explosionsRef} />
      <JumpGateMesh gateRef={jumpGateRef} />
    </>
  );
}
