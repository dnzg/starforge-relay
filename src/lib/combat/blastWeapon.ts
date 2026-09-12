export const BLAST_CLIP = 8;
export const BLAST_INTERVAL = 0.16;
export const BLAST_RELOAD = 1.55;

export interface BlastWeaponState {
  ammo: number;
  shotCooldown: number;
  reloadLeft: number;
}

export function createBlastWeapon(): BlastWeaponState {
  return {
    ammo: BLAST_CLIP,
    shotCooldown: 0,
    reloadLeft: 0,
  };
}

export function tickBlastWeapon(weapon: BlastWeaponState, dt: number): void {
  weapon.shotCooldown = Math.max(0, weapon.shotCooldown - dt);
  if (weapon.reloadLeft <= 0) return;
  weapon.reloadLeft = Math.max(0, weapon.reloadLeft - dt);
  if (weapon.reloadLeft === 0) {
    weapon.ammo = BLAST_CLIP;
  }
}

export function tryFireBlast(weapon: BlastWeaponState): boolean {
  if (weapon.reloadLeft > 0 || weapon.shotCooldown > 0 || weapon.ammo <= 0) {
    return false;
  }
  weapon.ammo -= 1;
  weapon.shotCooldown = BLAST_INTERVAL;
  if (weapon.ammo <= 0) {
    weapon.reloadLeft = BLAST_RELOAD;
  }
  return true;
}

export function blastHud(weapon: BlastWeaponState): {
  ammo: number;
  ammoMax: number;
  reloading: boolean;
  reloadProgress: number;
} {
  const reloading = weapon.reloadLeft > 0;
  return {
    ammo: reloading ? 0 : weapon.ammo,
    ammoMax: BLAST_CLIP,
    reloading,
    reloadProgress: reloading ? 1 - weapon.reloadLeft / BLAST_RELOAD : 1,
  };
}
