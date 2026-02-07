import Phaser from 'phaser';
import PhaserRaycaster from 'phaser-raycaster';
import { DEBUG } from './constants';
import { BootScene } from '../game/scenes/BootScene';
import { EditorScene } from '../game/scenes/EditorScene';
import { MenuScene } from '../game/scenes/MenuScene';
import { CityScene } from '../game/scenes/CityScene';

/**
 * Core Phaser Game Configuration
 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL if available, Canvas fallback
  parent: 'phaser-container', // ID of the DOM element to mount to
  backgroundColor: '#000000', // Black background for menu
  scene: [BootScene, MenuScene, CityScene, EditorScene], // Register Scenes
  scale: {
    mode: Phaser.Scale.RESIZE, // Responsive
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // Top down game, no vertical gravity
      debug: DEBUG.SHOW_COLLIDERS, // Show hitboxes in dev mode
      fps: 60, // Fixed physics step
    },
  },
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: true,
    powerPreference: 'high-performance',
  },
  fps: {
    target: 60,
    forceSetTimeOut: true, 
  },
  plugins: {
    scene: [
      {
        key: 'PhaserRaycaster',
        plugin: PhaserRaycaster,
        mapping: 'raycasterPlugin'
      }
    ]
  }
};