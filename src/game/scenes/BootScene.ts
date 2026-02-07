import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { PLAYER } from '../../config/constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.audio('click', 'sounds/ui/click.mp3');
    this.load.audio('step', 'sounds/player/step.mp3');
    this.load.audio('weapon_pistol_fire', 'sounds/weapons/M1911/fire.mp3');
    this.load.audio('weapon_pistol_reload', 'sounds/weapons/M1911/reload.mp3');
    this.load.audio('weapon_rifle_fire', 'sounds/weapons/AK-47/fire.mp3');
    this.load.audio('weapon_rifle_reload', 'sounds/weapons/AK-47/reload.mp3');
  }

  create() {
    console.log('BootScene: Generating Assets...');
    
    // 1. Player
    const size = PLAYER.BASE_RADIUS * 4;
    const center = size / 2;
    const pGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    pGraphics.fillStyle(0xffffff, 1);
    pGraphics.fillCircle(center, center, PLAYER.BASE_RADIUS);
    pGraphics.fillStyle(0xff0000, 1);
    pGraphics.fillRect(center, center - 2, PLAYER.BASE_RADIUS + 12, 4);
    pGraphics.generateTexture('player', size, size);
    pGraphics.destroy();

    // 2. Bullet
    const bGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    bGraphics.fillStyle(0xffff00, 1);
    bGraphics.fillRect(0, 0, 8, 4); 
    bGraphics.generateTexture('bullet', 8, 4);
    bGraphics.destroy();

    // 3. Muzzle Flash
    const mGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    mGraphics.fillStyle(0xffffaa, 0.8);
    mGraphics.beginPath();
    const points = [{ x: 10, y: 10 }, { x: 25, y: 5 }, { x: 15, y: 15 }, { x: 30, y: 20 }, { x: 15, y: 25 }, { x: 25, y: 35 }, { x: 10, y: 30 }];
    mGraphics.fillPoints(points, true);
    mGraphics.generateTexture('muzzleflash', 40, 40);
    mGraphics.destroy();

    // 4. Spark
    const sGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    sGraphics.fillStyle(0xffffff, 1); 
    sGraphics.fillCircle(4, 4, 2);
    sGraphics.generateTexture('flare', 8, 8);
    sGraphics.destroy();

    // 5. Map Tileset
    const tGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    tGraphics.fillStyle(0x444444, 1); tGraphics.fillRect(0, 0, 32, 32);
    tGraphics.lineStyle(1, 0x555555); tGraphics.strokeRect(0, 0, 32, 32);
    tGraphics.fillStyle(0x8B4513, 1); tGraphics.fillRect(32, 0, 32, 32);
    tGraphics.lineStyle(2, 0x5D2906); tGraphics.strokeRect(32, 0, 32, 32);
    tGraphics.beginPath(); tGraphics.moveTo(32, 0); tGraphics.lineTo(64, 32); tGraphics.moveTo(64, 0); tGraphics.lineTo(32, 32); tGraphics.strokePath();
    tGraphics.generateTexture('tileset', 64, 32);
    tGraphics.destroy();

    // 6. Zombie
    const zGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    const zCenter = 16;
    zGraphics.fillStyle(0x2E8B57, 1); zGraphics.fillCircle(zCenter, zCenter, 14);
    zGraphics.lineStyle(2, 0x000000); zGraphics.strokeCircle(zCenter, zCenter, 14);
    zGraphics.fillStyle(0x2E8B57, 1); zGraphics.fillRect(zCenter + 10, zCenter - 8, 12, 4); zGraphics.fillRect(zCenter + 10, zCenter + 4, 12, 4);
    zGraphics.fillStyle(0xff0000, 1); zGraphics.fillCircle(zCenter + 6, zCenter - 4, 2); zGraphics.fillCircle(zCenter + 6, zCenter + 4, 2);
    zGraphics.generateTexture('zombie', 32, 32);
    zGraphics.destroy();

    // 7. Door (Metal Gate)
    const dGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    dGraphics.fillStyle(0x555555, 1);
    dGraphics.fillRect(0, 0, 32, 32);
    dGraphics.lineStyle(2, 0x222222);
    dGraphics.strokeRect(0, 0, 32, 32);
    dGraphics.lineStyle(1, 0x888888);
    dGraphics.moveTo(0, 0); dGraphics.lineTo(32, 32); // Cross pattern
    dGraphics.moveTo(32, 0); dGraphics.lineTo(0, 32);
    dGraphics.strokePath();
    dGraphics.generateTexture('door', 32, 32);
    dGraphics.destroy();

    // 8. Barricade (Wood Planks)
    const baGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    baGraphics.fillStyle(0x000000, 0); // Transparent base
    baGraphics.fillRect(0, 0, 32, 32);
    baGraphics.fillStyle(0xD2691E, 1); // Chocolate wood
    // Draw 3 planks
    baGraphics.fillRect(2, 4, 28, 6);
    baGraphics.fillRect(2, 12, 28, 6);
    baGraphics.fillRect(2, 20, 28, 6);
    baGraphics.lineStyle(1, 0x000000);
    baGraphics.strokeRect(2, 4, 28, 6);
    baGraphics.strokeRect(2, 12, 28, 6);
    baGraphics.strokeRect(2, 20, 28, 6);
    baGraphics.generateTexture('barricade', 32, 32);
    baGraphics.destroy();

    // 9. Wall Buy (Chalk Outline)
    const wbGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    wbGraphics.lineStyle(2, 0xffffff, 1);
    wbGraphics.strokeRect(4, 8, 24, 16); // Gun shape outline
    wbGraphics.moveTo(4, 24); wbGraphics.lineTo(12, 32); // Handle
    wbGraphics.strokePath();
    wbGraphics.generateTexture('wallbuy_texture', 32, 32);
    wbGraphics.destroy();

    // 10. Mystery Box (Crate + Lid)
    // Box
    const mbGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    mbGraphics.fillStyle(0x8B4513, 1); // Dark brown
    mbGraphics.fillRect(0, 0, 64, 32);
    mbGraphics.lineStyle(4, 0xFFD700); // Gold trim
    mbGraphics.strokeRect(0, 0, 64, 32);
    mbGraphics.fillStyle(0x000000, 1); 
    mbGraphics.fillCircle(32, 16, 8); // Question mark circle bg
    mbGraphics.generateTexture('mysterybox', 64, 32);
    mbGraphics.destroy();
    
    // Lid
    const mblGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    mblGraphics.fillStyle(0xA0522D, 1); // Lighter brown
    mblGraphics.fillRect(0, 0, 64, 10);
    mblGraphics.lineStyle(2, 0xFFD700);
    mblGraphics.strokeRect(0, 0, 64, 10);
    mblGraphics.generateTexture('mysterybox_lid', 64, 10);
    mblGraphics.destroy();

    // 11. Pixel (Helper)
    const pxGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    pxGraphics.fillStyle(0xffffff, 1);
    pxGraphics.fillRect(0, 0, 1, 1);
    pxGraphics.generateTexture('pixel', 1, 1);
    pxGraphics.destroy();

    // 12. Perk Machine Base (Generic Tall Box)
    const pmGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    pmGraphics.fillStyle(0xcccccc, 1); // Light Gray Base (Tint will color it)
    pmGraphics.fillRect(0, 0, 32, 48); // Tall
    pmGraphics.lineStyle(2, 0x333333);
    pmGraphics.strokeRect(0, 0, 32, 48);
    // Detail (Display Screen)
    pmGraphics.fillStyle(0x000000, 1);
    pmGraphics.fillRect(4, 8, 24, 16);
    pmGraphics.generateTexture('perk_machine_base', 32, 48);
    pmGraphics.destroy();

    // 13. Pack-a-Punch (Complex Machine)
    const papGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    papGraphics.fillStyle(0x4B0082, 1); // Indigo/Purple
    papGraphics.fillRect(0, 0, 48, 48); // Large
    papGraphics.lineStyle(3, 0xFFD700); // Gold Trim
    papGraphics.strokeRect(0, 0, 48, 48);
    // Gears / Tech Details
    papGraphics.fillStyle(0x00ffff, 0.5); // Glowy bits
    papGraphics.fillCircle(24, 24, 10);
    papGraphics.generateTexture('pack_a_punch', 48, 48);
    papGraphics.destroy();
    
    // 14. PowerUp Base (Floating Icon Background)
    const puGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    puGraphics.fillStyle(0xffffff, 1); // White (Tinted later)
    puGraphics.fillCircle(16, 16, 12);
    puGraphics.lineStyle(2, 0xffff00); // Gold Ring
    puGraphics.strokeCircle(16, 16, 12);
    puGraphics.generateTexture('powerup_base', 32, 32);
    puGraphics.destroy();

    console.log('BootScene: Assets Ready');
    EventBus.emit('scene-ready', this);
    this.scene.start('MenuScene');
  }
}