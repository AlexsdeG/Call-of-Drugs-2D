import Phaser from 'phaser';

// Global Event Bus for communication between React components and Phaser scenes
export const EventBus = new Phaser.Events.EventEmitter();
