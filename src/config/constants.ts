/**
 * Global Magic Numbers and Constants
 * Reference this file instead of hardcoding values.
 */
export const VERSION = "0.2.5";

export const PLAYER = {
  DEFAULT_SPEED: 160, // pixels per second
  SPRINT_SPEED_MULTIPLIER: 1.5,
  MAX_HEALTH: 100,
  MAX_STAMINA: 100,
  MIN_STAMINA_TO_SPRINT: 15, // Hysteresis threshold
  STAMINA_REGEN_RATE: 10, // per second
  STAMINA_DRAIN_RATE: 25, // per second
  INTERACTION_RADIUS: 60, // pixels
  DEFAULT_FOV: 90, // Degrees for flashlight
  BASE_RADIUS: 13, // Collision radius
} as const;

export const ZOMBIE = {
  DEFAULT_SPEED: 90,
  RUN_SPEED: 140,
  AGGRO_RADIUS: 400,
  ATTACK_RANGE: 35,
  DAMAGE: 20,
  ATTACK_COOLDOWN: 1000, // ms
  MAX_LIMIT: 50, // Max active zombies (optimization)
} as const;

export const WORLD = {
  TILE_SIZE: 32,
  DEFAULT_ZOOM: 1.5,
  GRAVITY: { x: 0, y: 0 }, // Top-down
} as const;

export const VISION = {
    CONE_ANGLE: 90, // Degrees
    CONE_RANGE: 400, // Pixels
    RAY_COUNT: 100, // Resolution of shadows
    FOG_ALPHA: 0.65, // 65% darkness for obstacles/background
    FOG_COLOR: 0x000000,
    SOFT_SHADOWS: true,
} as const;

export const WAVE = {
    MAX_ACTIVE_ZOMBIES: 24, // Hard cap on active entities
    INTERMISSION_DURATION: 5000, // ms
    BASE_SPAWN_RATE: 3000, // ms
} as const;

export const WEAPON = {
  DEFAULT_RECOIL_DURATION: 50, // ms
  DEFAULT_RELOAD_TIME: 2000, // ms
} as const;

export const WEAPON_DEFS = {
    PISTOL: {
        name: 'M1911',
        damage: 25,
        fireRate: 400, // ms
        magSize: 8,
        reloadTime: 1500, // ms
        minRange: 150, // Close range penalty starts here
        range: 600, // Optimal range ends here
        spread: 2, // degrees
        recoil: 5, // pixels kickback
        bulletSpeed: 1600,
        critChance: 0.1, // 10% chance
        barrelLength: 30,
        type: 'SMALL',
        category: 'PISTOL',
        bulletCount: 1,
        cost: 250,
        
    },
    RIFLE: {
        name: 'AK-47',
        damage: 35,
        fireRate: 100,
        magSize: 30,
        reloadTime: 2500,
        minRange: 250, // Harder to use very close
        range: 900, // Better range
        spread: 5,
        recoil: 3,
        bulletSpeed: 2200, // Faster bullets
        critChance: 0.05, // Lower crit chance due to spray
        barrelLength: 45,
        type: 'LARGE',
        category: 'RIFLE',
        bulletCount: 1,
        cost: 1000,
    },
    SHOTGUN: {
        name: 'Olympia',
        damage: 15, // Per pellet
        fireRate: 800,
        magSize: 2,
        reloadTime: 3000,
        minRange: 50,
        range: 400,
        spread: 15,
        recoil: 15,
        bulletSpeed: 1600,
        critChance: 0.0,
        barrelLength: 40,
        type: 'LARGE',
        category: 'SHOTGUN',
        bulletCount: 8,
        cost: 500,
    },
    SNIPER: {
        name: 'L96A1',
        damage: 150,
        fireRate: 1500,
        magSize: 5,
        reloadTime: 3500,
        minRange: 400,
        range: 1500,
        spread: 0.1,
        recoil: 20,
        bulletSpeed: 3000,
        critChance: 0.5,
        barrelLength: 55,
        type: 'LARGE',
        category: 'SNIPER',
        bulletCount: 1,
        cost: 2000,
    }
} as const;

// ... existing UI constants ...
  
  export const PERK = {
      JUGGERNOG_COST: 2500,
      SPEED_COLA_COST: 3000,
      DOUBLE_TAP_COST: 2000,
      STAMIN_UP_COST: 2000,
      JUGGERNOG_HEALTH: 250,
      SPEED_COLA_RELOAD_MULTIPLIER: 0.5,
      DOUBLE_TAP_FIRERATE_MULTIPLIER: 0.66,
      STAMIN_UP_SPEED_MULTIPLIER: 1.2,
      STAMIN_UP_DURATION_MULTIPLIER: 2.0,
  } as const;

  export const POWERUP = {
      DURATION: 30000, // 30s
      INSTA_KILL_DAMAGE: 9999,
      DOUBLE_POINTS_MULTIPLIER: 2,
  } as const;

  export const DEBUG = {
    SHOW_COLLIDERS: (import.meta as any).env?.DEV ?? false,
    SHOW_PATHFINDING: false,
  } as const;