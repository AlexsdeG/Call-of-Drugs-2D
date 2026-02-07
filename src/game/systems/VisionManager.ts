import Phaser from 'phaser';
import { VISION, PLAYER } from '../../config/constants';
import { Player } from '../entities/Player';

export class VisionManager {
    private scene: Phaser.Scene;
    
    // The dark overlay (for background/obstacles)
    private fogGraphics: Phaser.GameObjects.Graphics;
    
    // The mask source (Visible shapes = Transparent fog)
    private maskGraphics: Phaser.GameObjects.Graphics;
    
    // The visual outline (Yellow cone lines)
    private debugGraphics: Phaser.GameObjects.Graphics;
    
    // Masks
    private targetMask: Phaser.Display.Masks.BitmapMask;
    
    public isReady: boolean = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        // 1. The Fog Overlay (Dimming)
        // This covers the background and crates with 65% opacity black
        this.fogGraphics = this.scene.add.graphics({ fillStyle: { color: VISION.FOG_COLOR, alpha: VISION.FOG_ALPHA } });
        this.fogGraphics.setDepth(100); 

        // 2. The Mask Source
        // Note: Using make.graphics creates a graphics object not automatically added to display list (which is good for masks)
        // OR add.graphics with visible false.
        this.maskGraphics = this.scene.add.graphics({ x: 0, y: 0 });
        this.maskGraphics.setVisible(false);
        
        // 3. Debug Outline (Optional visuals on top of fog)
        this.debugGraphics = this.scene.add.graphics();
        this.debugGraphics.setDepth(101);

        // 4. Create the Masks
        
        // A. Fog Mask (Inverted)
        // We want the Fog Graphics to be visible EVERYWHERE except the cone.
        // So we create a mask from the cone, and invert alpha.
        const fogMask = new Phaser.Display.Masks.BitmapMask(this.scene, this.maskGraphics);
        fogMask.invertAlpha = true;
        this.fogGraphics.setMask(fogMask);

        // B. Target Mask (Normal)
        // We want Targets to be visible ONLY inside the cone.
        // So we create a mask from the cone, normal alpha.
        this.targetMask = new Phaser.Display.Masks.BitmapMask(this.scene, this.maskGraphics);
        this.targetMask.invertAlpha = false;
        
        this.isReady = true;
    }

    public setup(player: Player, obstacles: any[]) {
        this.isReady = true;
        console.log("VisionManager: Math-based Setup Complete");
    }

    public setTargetLayer(layer: Phaser.GameObjects.Layer) {
        // Apply the hard cutoff mask to the enemy layer
        layer.setMask(this.targetMask);
    }

    public update(player: Player) {
        if (!this.isReady) return;

        this.updateFogAndMask(player);
    }

    private updateFogAndMask(player: Player) {
        const cam = this.scene.cameras.main;
        
        // --- 1. Reset Fog Rect (Covers screen) ---
        this.fogGraphics.clear();
        this.fogGraphics.fillStyle(VISION.FOG_COLOR, VISION.FOG_ALPHA);
        this.fogGraphics.fillRect(
            cam.scrollX - 100, 
            cam.scrollY - 100, 
            cam.width + 200, 
            cam.height + 200
        );

        // --- 2. Update Mask Source (White Cone) ---
        // This updates both the Fog Mask (Hole) and Target Mask (Visibility)
        this.maskGraphics.clear();
        this.maskGraphics.fillStyle(0xffffff, 1); 

        // A. The Safe Zone Circle around Player
        this.maskGraphics.fillCircle(player.x, player.y, PLAYER.BASE_RADIUS * 3);

        // B. The Vision Cone (Flashlight)
        const rMax = VISION.CONE_RANGE;
        const halfArcRad = Phaser.Math.DegToRad(VISION.CONE_ANGLE / 2);
        
        this.maskGraphics.beginPath();
        this.maskGraphics.slice(
            player.x,           // Center X
            player.y,           // Center Y
            rMax,               // Radius
            player.rotation - halfArcRad,   // Start angle (radians)
            player.rotation + halfArcRad,   // End angle (radians)
            false               // anticlockwise
        );
        this.maskGraphics.fillPath();

        // --- 3. Debug Visuals ---
        this.debugGraphics.clear();
    }

    public destroy() {
        if (this.fogGraphics) this.fogGraphics.destroy();
        if (this.maskGraphics) this.maskGraphics.destroy();
        if (this.debugGraphics) this.debugGraphics.destroy();
        this.isReady = false;
        console.log("VisionManager: Destroyed");
    }
}