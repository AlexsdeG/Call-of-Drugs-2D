import Phaser from 'phaser';

/**
 * Input Key Mappings
 * Maps logical actions to physical keys.
 */

export const CONTROLS = {
  // Movement
  MOVE_UP: Phaser.Input.Keyboard.KeyCodes.W,
  MOVE_DOWN: Phaser.Input.Keyboard.KeyCodes.S,
  MOVE_LEFT: Phaser.Input.Keyboard.KeyCodes.A,
  MOVE_RIGHT: Phaser.Input.Keyboard.KeyCodes.D,
  
  // Actions
  SPRINT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
  INTERACT: Phaser.Input.Keyboard.KeyCodes.F,
  RELOAD: Phaser.Input.Keyboard.KeyCodes.R,
  DROP_ITEM: Phaser.Input.Keyboard.KeyCodes.G,
  
  // UI / Meta
  PAUSE: Phaser.Input.Keyboard.KeyCodes.ESC,
  INVENTORY: Phaser.Input.Keyboard.KeyCodes.TAB,
  SCOREBOARD: Phaser.Input.Keyboard.KeyCodes.CAPS_LOCK,
  
  // Mouse (Handled via Pointer events, defined here for reference)
  FIRE: 'POINTER_LEFT',
  AIM: 'POINTER_RIGHT',
  
  // Weapon Slots
  SLOT_1: Phaser.Input.Keyboard.KeyCodes.ONE,
  SLOT_2: Phaser.Input.Keyboard.KeyCodes.TWO,
  SLOT_3: Phaser.Input.Keyboard.KeyCodes.THREE,
  MELEE: Phaser.Input.Keyboard.KeyCodes.V,
  
} as const;

export type ControlKey = keyof typeof CONTROLS;
