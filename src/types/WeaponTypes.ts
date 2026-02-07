export interface WeaponAttributes {
    name: string;
    damage: number;
    fireRate: number; // Time between shots in ms
    magSize: number;
    reloadTime: number; // ms
    minRange: number; // pixels (Start of optimal range)
    range: number; // pixels (End of optimal range)
    spread: number; // degrees of inaccuracy
    recoil: number; // visual kickback intensity
    bulletSpeed: number; // pixels per second
    critChance: number; // 0.0 to 1.0 (Probability of headshot)
}

export interface WeaponState {
    currentAmmo: number;
    totalAmmo: number; // Reserve ammo
    lastFired: number; // timestamp
    isReloading: boolean;
    reloadStartTime: number;
}