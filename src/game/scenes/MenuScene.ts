import Phaser from 'phaser';
import { EventBus } from '../EventBus';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    console.log('MenuScene: Active');
    
    const startGame = () => {
        this.scene.start('CityScene', { isPreview: false });
    };

    const startEditor = () => {
        this.scene.start('EditorScene');
    };

    // Clean up any stale listeners first
    EventBus.off('start-game');
    EventBus.off('start-editor');

    // Subscribe
    EventBus.on('start-game', startGame);
    EventBus.on('start-editor', startEditor);

    // Cleanup on shutdown
    this.events.on('shutdown', () => {
        EventBus.off('start-game', startGame);
        EventBus.off('start-editor', startEditor);
        console.log('MenuScene: Shutdown');
    });
  }
}