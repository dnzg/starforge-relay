import {
  ENEMY_KINDS,
  dist2,
  type AttackPattern,
  type Enemy,
  type EnemyKind,
  type PlayerState,
  type Projectile,
  type Vec2,
} from "./types";

export const SECTOR_BOUNDS = 22;
export const MAX_ENEMIES = 12;
export const MAX_PROJECTILES = 24;

const MIN_SPAWN_SEPARATION = 5.2;
const SEPARATION_PADDING = 1.85;
const SEPARATION_STRENGTH = 6.8;
const MAX_SPEED_MULT = 1.4;
const SPAWN_CANDIDATES = 14;
const ENEMY_LIMIT = SECTOR_BOUNDS + 5;

interface ArchetypeConfig {
  kind: EnemyKind;
  pattern: AttackPattern;
  hp: (threat: number) => number;
  speed: (threat: number) => number;
  radius: number;
  preferredRange: number;
  spawnRadiusMin: number;
  spawnRadiusMax: number;
  fireInterval: number;
  shotSpeed: number;
}

const ARCHETYPES: Record<EnemyKind, ArchetypeConfig> = {
  interceptor: {
    kind: "interceptor",
    pattern: "chase",
    hp: (threat) => 2 + Math.floor(threat / 4),
    speed: (threat) => 4.15 + threat * 0.16,
    radius: 0.55,
    preferredRange: 1.35,
    spawnRadiusMin: 12,
    spawnRadiusMax: 16.5,
    fireInterval: 0,
    shotSpeed: 0,
  },
  gunship: {
    kind: "gunship",
    pattern: "strafe_orbit",
    hp: (threat) => 4 + Math.floor(threat / 3),
    speed: (threat) => 2.15 + threat * 0.08,
    radius: 1.05,
    preferredRange: 6.5,
    spawnRadiusMin: 15,
    spawnRadiusMax: 19,
    fireInterval: 1.65,
    shotSpeed: 11.5,
  },
  drone: {
    kind: "drone",
    pattern: "sniper_hover",
    hp: (threat) => 1 + Math.floor(threat / 5),
    speed: (threat) => 2.7 + threat * 0.1,
    radius: 0.42,
    preferredRange: 10.8,
    spawnRadiusMin: 17,
    spawnRadiusMax: 22,
    fireInterval: 2.15,
    shotSpeed: 18,
  },
};

export function enemyHitRadius(enemy: Enemy): number {
  return enemy.radius + 0.22;
}

export function enemyContactRadius(enemy: Enemy): number {
  return enemy.radius + 0.5;
}

const sepScratch = { x: 0, z: 0 };
const posScratch = { x: 0, z: 0 };

function clampToArena(x: number, z: number, out: Vec2): Vec2 {
  out.x = Math.max(-ENEMY_LIMIT, Math.min(ENEMY_LIMIT, x));
  out.z = Math.max(-ENEMY_LIMIT, Math.min(ENEMY_LIMIT, z));
  return out;
}

function pickBalancedKind(existing: Enemy[]): EnemyKind {
  const counts = { interceptor: 0, gunship: 0, drone: 0 };
  for (let i = 0; i < existing.length; i++) {
    counts[existing[i]!.kind] += 1;
  }
  let min = Infinity;
  for (let i = 0; i < ENEMY_KINDS.length; i++) {
    const count = counts[ENEMY_KINDS[i]!];
    if (count < min) min = count;
  }
  let pick: EnemyKind = ENEMY_KINDS[0];
  let seen = 0;
  for (let i = 0; i < ENEMY_KINDS.length; i++) {
    const kind = ENEMY_KINDS[i]!;
    if (counts[kind] !== min) continue;
    seen += 1;
    if (Math.random() * seen < 1) pick = kind;
  }
  return pick;
}

function pickOrbitDir(kind: EnemyKind, existing: Enemy[]): 1 | -1 {
  let plus = 0;
  let minus = 0;
  for (let i = 0; i < existing.length; i++) {
    const other = existing[i]!;
    if (other.kind !== kind) continue;
    if (other.orbitDir === 1) plus += 1;
    else minus += 1;
  }
  if (plus < minus) return 1;
  if (minus < plus) return -1;
  return Math.random() < 0.5 ? 1 : -1;
}

function pickSpreadPosition(
  player: Vec2,
  existing: Enemy[],
  radiusMin: number,
  radiusMax: number,
): Vec2 {
  let bestX = player.x + radiusMin;
  let bestZ = player.z;
  let bestScore = -Infinity;

  for (let c = 0; c < SPAWN_CANDIDATES; c++) {
    const angle = (c / SPAWN_CANDIDATES) * Math.PI * 2 + Math.random() * 0.28;
    const radius = radiusMin + Math.random() * (radiusMax - radiusMin);
    const x = player.x + Math.cos(angle) * radius;
    const z = player.z + Math.sin(angle) * radius;
    clampToArena(x, z, posScratch);
    let nearest = Infinity;
    for (let i = 0; i < existing.length; i++) {
      const d = dist2(posScratch, existing[i]!.position);
      if (d < nearest) nearest = d;
    }
    const score =
      nearest +
      (nearest >= MIN_SPAWN_SEPARATION ? 4 : 0) +
      Math.random() * 0.35;
    if (score > bestScore) {
      bestScore = score;
      bestX = posScratch.x;
      bestZ = posScratch.z;
    }
  }

  return { x: bestX, z: bestZ };
}

export function spawnEnemy(
  id: number,
  player: PlayerState,
  threatLevel: number,
  existing: Enemy[],
): Enemy {
  const kind = pickBalancedKind(existing);
  const archetype = ARCHETYPES[kind];
  const position = pickSpreadPosition(
    player.position,
    existing,
    archetype.spawnRadiusMin,
    archetype.spawnRadiusMax,
  );
  const rangeJitter = (Math.random() - 0.5) * 1.4;

  return {
    id,
    kind,
    position,
    hp: archetype.hp(threatLevel),
    speed: archetype.speed(threatLevel),
    radius: archetype.radius,
    heading: Math.atan2(
      player.position.x - position.x,
      player.position.z - position.z,
    ),
    strafePhase: Math.random() * Math.PI * 2,
    orbitDir: pickOrbitDir(kind, existing),
    preferredRange: archetype.preferredRange + rangeJitter,
    fireCooldown: 0.35 + Math.random() * 0.9,
  };
}

function applySeparation(enemies: Enemy[], index: number): typeof sepScratch {
  const enemy = enemies[index]!;
  sepScratch.x = 0;
  sepScratch.z = 0;

  for (let j = 0; j < enemies.length; j++) {
    if (j === index) continue;
    const other = enemies[j]!;
    const dx = enemy.position.x - other.position.x;
    const dz = enemy.position.z - other.position.z;
    const dist = Math.hypot(dx, dz);
    const desired = enemy.radius + other.radius + SEPARATION_PADDING;
    if (dist >= desired || dist < 0.0001) continue;
    const weight = (desired - dist) / desired;
    sepScratch.x += (dx / dist) * weight;
    sepScratch.z += (dz / dist) * weight;
  }

  return sepScratch;
}

function tryEnemyShot(
  enemy: Enemy,
  nx: number,
  nz: number,
  dist: number,
  dt: number,
  projectiles: Projectile[],
  nextId: { current: number },
): void {
  const archetype = ARCHETYPES[enemy.kind];
  enemy.fireCooldown = Math.max(0, enemy.fireCooldown - dt);
  if (archetype.fireInterval <= 0 || enemy.fireCooldown > 0) return;
  if (projectiles.length >= MAX_PROJECTILES - 2) return;
  if (Math.abs(dist - enemy.preferredRange) > 3.4) return;

  const muzzle = enemy.radius + 0.35;
  projectiles.push({
    id: nextId.current++,
    position: {
      x: enemy.position.x + nx * muzzle,
      z: enemy.position.z + nz * muzzle,
    },
    velocity: {
      x: nx * archetype.shotSpeed,
      z: nz * archetype.shotSpeed,
    },
    ttl: 2.1,
    team: "hostile",
  });
  enemy.fireCooldown = archetype.fireInterval + Math.random() * 0.28;
}

export function updateEnemies(
  enemies: Enemy[],
  player: PlayerState,
  dt: number,
  elapsed: number,
  projectiles: Projectile[],
  nextId: { current: number },
): void {
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i]!;
    const dx = player.position.x - enemy.position.x;
    const dz = player.position.z - enemy.position.z;
    const dist = Math.max(0.001, Math.hypot(dx, dz));
    const nx = dx / dist;
    const nz = dz / dist;
    const sep = applySeparation(enemies, i);

    let vx = 0;
    let vz = 0;

    if (enemy.kind === "interceptor") {
      const lane = 1.45 + (enemy.id % 3) * 0.4;
      const aimX = player.position.x + -nz * enemy.orbitDir * lane;
      const aimZ = player.position.z + nx * enemy.orbitDir * lane;
      const adx = aimX - enemy.position.x;
      const adz = aimZ - enemy.position.z;
      const adist = Math.max(0.001, Math.hypot(adx, adz));
      const weave = Math.sin(elapsed * 4.1 + enemy.strafePhase) * 0.22;
      vx = (adx / adist) * enemy.speed + -nz * weave * enemy.speed;
      vz = (adz / adist) * enemy.speed + nx * weave * enemy.speed;
    } else if (enemy.kind === "gunship") {
      const radial = dist - enemy.preferredRange;
      vx = nx * radial * 0.85 + -nz * enemy.orbitDir * enemy.speed;
      vz = nz * radial * 0.85 + nx * enemy.orbitDir * enemy.speed;
    } else {
      const band = enemy.preferredRange;
      if (dist < band - 1.6) {
        vx = -nx * enemy.speed;
        vz = -nz * enemy.speed;
      } else if (dist > band + 1.6) {
        vx = nx * enemy.speed * 0.55;
        vz = nz * enemy.speed * 0.55;
      } else {
        vx = Math.sin(elapsed * 1.35 + enemy.strafePhase) * 0.85;
        vz = Math.cos(elapsed * 1.05 + enemy.strafePhase * 1.3) * 0.85;
      }
    }

    vx += sep.x * SEPARATION_STRENGTH;
    vz += sep.z * SEPARATION_STRENGTH;

    const mag = Math.hypot(vx, vz);
    const maxSpeed = enemy.speed * MAX_SPEED_MULT;
    if (mag > maxSpeed && mag > 0.0001) {
      const scale = maxSpeed / mag;
      vx *= scale;
      vz *= scale;
    }

    clampToArena(enemy.position.x + vx * dt, enemy.position.z + vz * dt, posScratch);
    enemy.position.x = posScratch.x;
    enemy.position.z = posScratch.z;
    enemy.heading =
      enemy.kind === "interceptor" ? Math.atan2(vx, vz) : Math.atan2(dx, dz);

    tryEnemyShot(enemy, nx, nz, dist, dt, projectiles, nextId);
  }
}
