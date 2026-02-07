export interface WeaponAttributes {
    name: string;
    // Modifiable Attributes (By Allocating Points or Attachments)
    key?: string; // Injected Key for tracking
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
    barrelLength: number; // Distance from player center to muzzle
    
    // New Implementation
    type: 'SMALL' | 'LARGE';
    category: 'PISTOL' | 'SHOTGUN' | 'RIFLE' | 'SNIPER' | 'LMG';
    bulletCount: number; // Number of projectiles per shot
}

export interface WeaponState {
    currentAmmo: number;
    totalAmmo: number; // Reserve ammo
    maxTotalAmmo: number; // Cap for reserve ammo
    lastFired: number; // timestamp
    isReloading: boolean;
    reloadStartTime: number;
}