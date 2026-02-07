// Basic Types for scaffolding
export enum GameState {
  MENU = 'MENU',
  GAME = 'GAME',
  PAUSED = 'PAUSED',
  EDITOR = 'EDITOR',
  GAME_OVER = 'GAME_OVER',
  POST_GAME_STATS = 'POST_GAME_STATS'
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  ammo: number;
  maxAmmo: number;
  kills: number;
  headshots: number;
}

export interface SessionReport {
  xpGained: number;
  levelUp: boolean;
  newLevel: number;
  kills: number;
  day: number;
  timePlayed: number;
  nextState: GameState;
  weaponXpInfo?: Record<string, { newLevel: number; levelUp: boolean; xpGained: number }>;
}