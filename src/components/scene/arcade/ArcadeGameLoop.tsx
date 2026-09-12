import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ArcadeInputState } from "../../../hooks/useArcadeInput";
import { PlayerShipMesh } from "./PlayerShipMesh";
import { CombatMeshes } from "./CombatMeshes";
import {
  createInitialPlayer,
  dist2,
  type CombatCallbacks,
  type Enemy,
  type PlayerState,
  type Projectile,
} from "./types";

const PLAYER_SPEED = 9;
const BOOST_MULT = 1.75;
const FIRE_COOLDOWN = 0.18;
const PROJECTILE_SPEED = 28;
const PROJECTILE_TTL = 2.2;
const SECTOR_BOUNDS = 22;
const ENEMY_CONTACT_DAMAGE = 12;
const ENEMY_SPAWN_INTERVAL = 2.4;

interface ArcadeGameLoopProps {
  enabled: boolean;
  sectorKey: string;
  threatLevel: number;
  getInput: () => ArcadeInputState;
  callbacks: CombatCallbacks;
}

function spawnEnemy(
  id: number,
  player: PlayerState,
  threatLevel: number,
): Enemy {
  const angle = Math.random() * Math.PI * 2;
  const radius = 16 + Math.random() * 8;
  return {
    id,
    position: {
      x: player.position.x + Math.cos(angle) * radius,
      z: player.position.z + Math.sin(angle) * radius,
    },
    hp: 2 + Math.floor(threatLevel / 4),
    speed: 2.8 + threatLevel * 0.15,
    strafePhase: Math.random() * Math.PI * 2,
  };
}

function resetGameState(
  playerRef: RefObject<PlayerState>,
  enemiesRef: RefObject<Enemy[]>,
  projectilesRef: RefObject<Projectile[]>,
  nextIdRef: RefObject<number>,
  sectorKey: string,
  threatLevel: number,
  sectorKeyRef: RefObject<string>,
) {
  if (sectorKeyRef.current === sectorKey) return;
  sectorKeyRef.current = sectorKey;
  playerRef.current = createInitialPlayer();
  enemiesRef.current = [];
  projectilesRef.current = [];
  nextIdRef.current = 1;

  const initialCount = Math.min(5, 2 + Math.floor(threatLevel / 2));
  for (let i = 0; i < initialCount; i++) {
    enemiesRef.current.push(
      spawnEnemy(nextIdRef.current++, playerRef.current, threatLevel),
    );
  }
}

export function ArcadeGameLoop({
  enabled,
  sectorKey,
  threatLevel,
  getInput,
  callbacks,
}: ArcadeGameLoopProps) {
  const { camera } = useThree();
  const playerRef = useRef<PlayerState>(createInitialPlayer());
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const nextIdRef = useRef(1);
  const fireCooldownRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const sectorKeyRef = useRef("");
  const invulnRef = useRef(false);
  const cameraTarget = useRef(new THREE.Vector3());

  useEffect(() => {
    resetGameState(
      playerRef,
      enemiesRef,
      projectilesRef,
      nextIdRef,
      sectorKey,
      threatLevel,
      sectorKeyRef,
    );
  }, [sectorKey, threatLevel]);

  useFrame((_, delta) => {
    if (!enabled) return;

    const player = playerRef.current;
    const input = getInput();
    const speed =
      PLAYER_SPEED * (input.boost ? BOOST_MULT : 1) * delta;

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

    fireCooldownRef.current = Math.max(0, fireCooldownRef.current - delta);
    if (input.firePressed && fireCooldownRef.current <= 0) {
      fireCooldownRef.current = FIRE_COOLDOWN;
      const dirX = Math.sin(player.rotation);
      const dirZ = Math.cos(player.rotation);
      projectilesRef.current.push({
        id: nextIdRef.current++,
        position: {
          x: player.position.x + dirX * 0.8,
          z: player.position.z + dirZ * 0.8,
        },
        velocity: { x: dirX * PROJECTILE_SPEED, z: dirZ * PROJECTILE_SPEED },
        ttl: PROJECTILE_TTL,
      });
    }

    projectilesRef.current = projectilesRef.current
      .map((projectile) => ({
        ...projectile,
        position: {
          x: projectile.position.x + projectile.velocity.x * delta,
          z: projectile.position.z + projectile.velocity.z * delta,
        },
        ttl: projectile.ttl - delta,
      }))
      .filter((projectile) => projectile.ttl > 0);

    spawnTimerRef.current += delta;
    if (
      spawnTimerRef.current >= ENEMY_SPAWN_INTERVAL &&
      enemiesRef.current.length < 6 + Math.floor(threatLevel / 2)
    ) {
      spawnTimerRef.current = 0;
      enemiesRef.current.push(
        spawnEnemy(nextIdRef.current++, player, threatLevel),
      );
    }

    enemiesRef.current = enemiesRef.current.map((enemy) => {
      const dx = player.position.x - enemy.position.x;
      const dz = player.position.z - enemy.position.z;
      const dist = Math.max(0.001, Math.hypot(dx, dz));
      const nx = dx / dist;
      const nz = dz / dist;
      const strafe =
        Math.sin(performance.now() * 0.002 + enemy.strafePhase) * 0.35;
      const px = -nz * strafe;
      const pz = nx * strafe;

      return {
        ...enemy,
        position: {
          x: enemy.position.x + (nx + px) * enemy.speed * delta,
          z: enemy.position.z + (nz + pz) * enemy.speed * delta,
        },
      };
    });

    const survivingEnemies: Enemy[] = [];
    for (const enemy of enemiesRef.current) {
      let hp = enemy.hp;
      projectilesRef.current = projectilesRef.current.filter((projectile) => {
        if (dist2(projectile.position, enemy.position) < 0.75) {
          hp -= 1;
          return false;
        }
        return true;
      });
      if (hp <= 0) {
        callbacks.onEnemyKilled();
      } else {
        survivingEnemies.push({ ...enemy, hp });
      }
    }
    enemiesRef.current = survivingEnemies;

    if (!invulnRef.current) {
      for (const enemy of enemiesRef.current) {
        if (dist2(player.position, enemy.position) < 1.05) {
          player.invulnTimer = 1.1;
          invulnRef.current = true;
          callbacks.onPlayerHit(ENEMY_CONTACT_DAMAGE);
          break;
        }
      }
    }

    const camOffset = new THREE.Vector3(
      -Math.sin(player.rotation) * 5.5,
      3.2,
      -Math.cos(player.rotation) * 5.5,
    );
    cameraTarget.current.set(
      player.position.x + camOffset.x,
      camOffset.y,
      player.position.z + camOffset.z,
    );
    camera.position.lerp(cameraTarget.current, 1 - Math.exp(-4 * delta));
    camera.lookAt(player.position.x, 0.4, player.position.z);
  });

  return (
    <>
      <PlayerShipMesh playerRef={playerRef} invulnRef={invulnRef} />
      <CombatMeshes enemiesRef={enemiesRef} projectilesRef={projectilesRef} />
    </>
  );
}
