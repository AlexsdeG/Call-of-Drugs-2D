import Phaser from 'phaser';
import { POLICE_VISION, DEBUG } from '../../config/constants';
import { Player } from '../entities/Player';

/**
 * VisionCone - Reusable vision detection system for police/NPCs
 * Uses simple geometry-based detection (no external raycaster dependency)
 */
export class VisionCone {
    private scene: Phaser.Scene;
    private owner: Phaser.Physics.Arcade.Sprite;
    private wallLayer?: Phaser.Tilemaps.TilemapLayer;
    
    // Detection state
    private detectionTimer: number = 0;
    private isPlayerDetected: boolean = false;
    
    // Debug graphics
    private debugGraphics?: Phaser.GameObjects.Graphics;
    
    // Cached geometry
    private losLine: Phaser.Geom.Line = new Phaser.Geom.Line();

    constructor(
        scene: Phaser.Scene, 
        owner: Phaser.Physics.Arcade.Sprite,
        wallLayer?: Phaser.Tilemaps.TilemapLayer
    ) {
        this.scene = scene;
        this.owner = owner;
        this.wallLayer = wallLayer;

        // Force disable debug for now to fix lag issues
        // if (DEBUG.SHOW_POLICE_VISION) {
        //     this.debugGraphics = scene.add.graphics();
        //     this.debugGraphics.setDepth(150);
        // }
    }

    /**
     * Check if player is within the vision cone
     */
    public isPlayerVisible(player: Player): boolean {
        if (!player || !player.active || !this.owner.active) return false;

        const distance = Phaser.Math.Distance.Between(
            this.owner.x, this.owner.y,
            player.x, player.y
        );

        // 1. Range check
        if (distance > POLICE_VISION.CONE_RANGE) {
            return false;
        }

        // 2. Angle check (is player within cone angle?)
        const angleToPlayer = Phaser.Math.Angle.Between(
            this.owner.x, this.owner.y,
            player.x, player.y
        );
        
        const ownerAngle = this.owner.rotation;
        const halfConeRad = Phaser.Math.DegToRad(POLICE_VISION.CONE_ANGLE / 2);
        
        // Normalize angle difference
        let angleDiff = Phaser.Math.Angle.Wrap(angleToPlayer - ownerAngle);
        
        if (Math.abs(angleDiff) > halfConeRad) {
            return false;
        }

        // 3. Line of Sight check (wall occlusion)
        if (!this.hasLineOfSight(player)) {
            return false;
        }

        return true;
    }

    /**
     * Update detection with delay timer
     * Returns true if detection is confirmed (after DETECT_DELAY)
     */
    public updateDetection(player: Player, delta: number): boolean {
        if (this.isPlayerVisible(player)) {
            this.detectionTimer += delta;
            
            if (this.detectionTimer >= POLICE_VISION.DETECT_DELAY) {
                this.isPlayerDetected = true;
                return true;
            }
        } else {
            // Reset timer when player leaves cone
            this.detectionTimer = Math.max(0, this.detectionTimer - delta * 2);
            if (this.detectionTimer === 0) {
                this.isPlayerDetected = false;
            }
        }
        
        return this.isPlayerDetected;
    }

    /**
     * Check line of sight (wall occlusion)
     */
    private hasLineOfSight(player: Player): boolean {
        if (!this.wallLayer) return true;

        this.losLine.setTo(this.owner.x, this.owner.y, player.x, player.y);
        
        const tiles = this.wallLayer.getTilesWithinShape(this.losLine);

        for (const tile of tiles) {
            // Check if tile is a wall (non-floor)
            if (tile.index !== -1 && tile.index !== 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * Draw debug visualization of the vision cone
     */
    public drawDebug(): void {
        if (!this.debugGraphics || !DEBUG.SHOW_POLICE_VISION) return;

        this.debugGraphics.clear();
        
        const halfAngle = Phaser.Math.DegToRad(POLICE_VISION.CONE_ANGLE / 2);
        const startAngle = this.owner.rotation - halfAngle;
        const endAngle = this.owner.rotation + halfAngle;

        // Draw cone fill
        this.debugGraphics.fillStyle(
            this.isPlayerDetected ? 0xff0000 : 0xffff00, 
            this.isPlayerDetected ? 0.4 : 0.2
        );
        
        this.debugGraphics.beginPath();
        this.debugGraphics.moveTo(this.owner.x, this.owner.y);
        this.debugGraphics.arc(
            this.owner.x, this.owner.y,
            POLICE_VISION.CONE_RANGE,
            startAngle, endAngle,
            false
        );
        this.debugGraphics.closePath();
        this.debugGraphics.fillPath();

        // Draw cone outline
        this.debugGraphics.lineStyle(2, 0xffff00, 0.8);
        this.debugGraphics.beginPath();
        this.debugGraphics.moveTo(this.owner.x, this.owner.y);
        this.debugGraphics.lineTo(
            this.owner.x + Math.cos(startAngle) * POLICE_VISION.CONE_RANGE,
            this.owner.y + Math.sin(startAngle) * POLICE_VISION.CONE_RANGE
        );
        this.debugGraphics.moveTo(this.owner.x, this.owner.y);
        this.debugGraphics.lineTo(
            this.owner.x + Math.cos(endAngle) * POLICE_VISION.CONE_RANGE,
            this.owner.y + Math.sin(endAngle) * POLICE_VISION.CONE_RANGE
        );
        this.debugGraphics.strokePath();

        // Draw detection progress bar
        if (this.detectionTimer > 0 && !this.isPlayerDetected) {
            const progress = this.detectionTimer / POLICE_VISION.DETECT_DELAY;
            const barWidth = 30;
            const barHeight = 4;
            
            this.debugGraphics.fillStyle(0x000000, 0.7);
            this.debugGraphics.fillRect(
                this.owner.x - barWidth / 2,
                this.owner.y - 25,
                barWidth, barHeight
            );
            
            this.debugGraphics.fillStyle(0xff6600, 1);
            this.debugGraphics.fillRect(
                this.owner.x - barWidth / 2,
                this.owner.y - 25,
                barWidth * progress, barHeight
            );
        }
    }

    /**
     * Get current detection state
     */
    public getDetectionProgress(): number {
        return this.detectionTimer / POLICE_VISION.DETECT_DELAY;
    }

    /**
     * Reset detection state
     */
    public resetDetection(): void {
        this.detectionTimer = 0;
        this.isPlayerDetected = false;
    }

    /**
     * Cleanup resources
     */
    public destroy(): void {
        if (this.debugGraphics) {
            this.debugGraphics.destroy();
        }
    }
}
