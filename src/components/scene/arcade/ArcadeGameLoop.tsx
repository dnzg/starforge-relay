import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ArcadeInputState } from "../../../hooks/useArcadeInput";
import {
  arcadeUiRef,
  KILLS_FOR_JUMP,
  resetArcadeUiForSector,
} from "../../../lib/combat/arcadeUiRef";
import { PlayerShipMesh } from "./PlayerShipMesh";
import { CombatMeshes } from "./CombatMeshes";
import { JumpGateMesh } from "./JumpGateMesh";
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
  type JumpGateState,
  type PlayerState,
  type Projectile,
} from "./types";

const PLAYER_SPEED = 9;
const BOOST_MULT = 1.75;
const FIRE_COOLDOWN = 0.18;
const PROJECTILE_SPEED = 28;
const PROJECTILE_TTL = 2.2;
const ENEMY_CONTACT_DAMAGE = 12;
const HOSTILE_SHOT_DAMAGE = 8;
const HOSTILE_SHOT_RADIUS = 0.55;
const ENEMY_SPAWN_INTERVAL = 2.4;
const MAX_DELTA = 0.05;
const JUMP_GATE_RADIUS = 2.2;

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

function updateProjectiles(
  projectiles: Projectile[],
  dt: number,
): void {
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
): void {
  const surviving: Enemy[] = [];
  for (let ei = 0; ei < enemies.length; ei++) {
    const enemy = enemies[ei]!;
    let hp = enemy.hp;

    let pw = 0;
    for (let pi = 0; pi < projectiles.length; pi++) {
      const projectile = projectiles[pi]!;
      if (
        projectile.team === "player" &&
        dist2(projectile.position, enemy.position) < enemyHitRadius(enemy)
      ) {
        hp -= 1;
      } else {
        projectiles[pw++] = projectile;
      }
    }
    projectiles.length = pw;

    if (hp <= 0) {
      callbacks.onEnemyKilled();
      sectorKillsRef.current += 1;
      if (
        sectorKillsRef.current >= KILLS_FOR_JUMP &&
        !jumpGateRef.current.active
      ) {
        jumpGateRef.current.active = true;
      }
    } else {
      enemy.hp = hp;
      surviving.push(enemy);
    }
  }
  enemies.length = 0;
  enemies.push(...surviving);
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
  sectorKey: string;
  threatLevel: number;
  getInput: () => ArcadeInputState;
  callbacks: CombatCallbacks;
}

export function ArcadeGameLoop({
  enabled,
  sectorKey,
  threatLevel,
  getInput,
  callbacks,
}: ArcadeGameLoopProps) {
  const { camera, clock } = useThree();
  const playerRef = useRef<PlayerState>(createInitialPlayer());
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
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
  const camOffset = useRef(new THREE.Vector3());
  const jumpGateTriggeredRef = useRef(false);

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
    );
  }, [sectorKey, threatLevel]);

  useFrame((_, delta) => {
    if (!enabled) return;

    const dt = clampDelta(delta);
    const player = playerRef.current;
    const input = getInput();
    const speed = PLAYER_SPEED * (input.boost ? BOOST_MULT : 1) * dt;

    if (input.moveX !== 0 || input.moveY !== 0) {
      player.position.x += input.moveX * speed;
      player.position.z += input.moveY * speed;
      player.rotation = Math.atan2(input.moveX, input.moveY);
    }

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

    fireCooldownRef.current = Math.max(0, fireCooldownRef.current - dt);
    if (input.firePressed && fireCooldownRef.current <= 0) {
      fireCooldownRef.current = FIRE_COOLDOWN;
      const dirX = Math.sin(player.rotation);
      const dirZ = Math.cos(player.rotation);
      if (projectilesRef.current.length < MAX_PROJECTILES) {
        projectilesRef.current.push({
          id: nextIdRef.current++,
          position: {
            x: player.position.x + dirX * 0.8,
            z: player.position.z + dirZ * 0.8,
          },
          velocity: { x: dirX * PROJECTILE_SPEED, z: dirZ * PROJECTILE_SPEED },
          ttl: PROJECTILE_TTL,
          team: "player",
        });
      }
    }

    updateProjectiles(projectilesRef.current, dt);

    spawnTimerRef.current += dt;
    const maxEnemies = 6 + Math.floor(threatLevel / 2);
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
    );

    if (!invulnRef.current) {
      let hit = false;
      for (let i = 0; i < enemiesRef.current.length; i++) {
        const enemy = enemiesRef.current[i]!;
        if (dist2(player.position, enemy.position) < enemyContactRadius(enemy)) {
          callbacks.onPlayerHit(ENEMY_CONTACT_DAMAGE);
          hit = true;
          break;
        }
      }
      if (!hit) {
        let pw = 0;
        const shots = projectilesRef.current;
        for (let i = 0; i < shots.length; i++) {
          const projectile = shots[i]!;
          if (
            !hit &&
            projectile.team === "hostile" &&
            dist2(player.position, projectile.position) < HOSTILE_SHOT_RADIUS
          ) {
            callbacks.onPlayerHit(HOSTILE_SHOT_DAMAGE);
            hit = true;
            continue;
          }
          shots[pw++] = projectile;
        }
        shots.length = pw;
      }
      if (hit) {
        player.invulnTimer = 1.1;
        invulnRef.current = true;
      }
    }

    const gate = jumpGateRef.current;
    if (
      gate.active &&
      !jumpGateTriggeredRef.current &&
      dist2(player.position, gate.position) < JUMP_GATE_RADIUS
    ) {
      jumpGateTriggeredRef.current = true;
      callbacks.onJumpGateEnter();
    }

    updateObjectiveTarget(
      player,
      enemiesRef.current,
      gate,
      sectorKillsRef.current,
    );

    camOffset.current.set(
      -Math.sin(player.rotation) * 5.5,
      3.2,
      -Math.cos(player.rotation) * 5.5,
    );
    cameraTarget.current.set(
      player.position.x + camOffset.current.x,
      camOffset.current.y,
      player.position.z + camOffset.current.z,
    );
    const lerpFactor = 1 - Math.pow(0.001, dt);
    camera.position.lerp(cameraTarget.current, lerpFactor);
    lookTarget.current.set(player.position.x, 0.4, player.position.z);
    camera.lookAt(lookTarget.current);
  });

  return (
    <>
      <PlayerShipMesh playerRef={playerRef} invulnRef={invulnRef} />
      <CombatMeshes enemiesRef={enemiesRef} projectilesRef={projectilesRef} />
      <JumpGateMesh gateRef={jumpGateRef} />
    </>
  );
}
