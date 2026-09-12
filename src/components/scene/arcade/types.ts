import * as THREE from "three";

export interface Vec2 {
  x: number;
  z: number;
}

export interface Projectile {
  id: number;
  position: Vec2;
  velocity: Vec2;
  ttl: number;
}

export interface Enemy {
  id: number;
  position: Vec2;
  hp: number;
  speed: number;
  strafePhase: number;
}

export interface PlayerState {
  position: Vec2;
  rotation: number;
  pitch: number;
  roll: number;
  invulnTimer: number;
}

export interface CombatCallbacks {
  onEnemyKilled: () => void;
  onPlayerHit: (damage: number) => void;
  onJumpGateEnter: () => void;
}

export interface JumpGateState {
  active: boolean;
  position: Vec2;
}

export interface ArcadeGameRefs {
  player: PlayerState;
  enemies: Enemy[];
  projectiles: Projectile[];
  nextId: number;
  fireCooldown: number;
  spawnTimer: number;
  sectorKey: string;
}

export function createInitialPlayer(): PlayerState {
  return {
    position: { x: 0, z: 0 },
    rotation: 0,
    pitch: 0,
    roll: 0,
    invulnTimer: 0,
  };
}

export function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

export function vecToThree(v: Vec2, y = 0): THREE.Vector3 {
  return new THREE.Vector3(v.x, y, v.z);
}
