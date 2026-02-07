// Basic Types for scaffolding
export enum GameState {
  MENU = 'MENU',
  GAME = 'GAME',
  PAUSED = 'PAUSED',
  EDITOR = 'EDITOR'
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  ammo: number;
  maxAmmo: number;
  points: number;
}