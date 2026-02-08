import Phaser from 'phaser';
import { Player } from './Player';
import { IInteractable } from '../interfaces/IInteractable';
import { CONTROLS } from '../../config/controls';

export class Vehicle extends Phaser.Physics.Arcade.Sprite implements IInteractable {
    private speed: number = 0;
    private maxSpeed: number = 450; // Reduced from 600
    private acceleration: number = 300;
    // private braking: number = 200;
    private driftFactor: number = 0.92; // More drift
    private rotationSpeed: number = 2.0; // Slower turn
    
    // Interaction
    private interactionCooldown: number = 0;
    
    private isDriven: boolean = false;
    // private driver: Player | null = null;
    
    private keys: Record<string, Phaser.Input.Keyboard.Key> | null = null;
    
    // Visuals
    private bodyGraphics: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string = 'car_red') {
        super(scene, x, y, texture);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setCollideWorldBounds(true);
        this.setDrag(0.5); // Air resistance
        this.setDepth(25); // Below player (30) but above items (10)
        
        // Physics Tuning
        // Physics Tuning
        this.setMass(1000); // Heavy
        this.setPushable(false); // Player can't push it
        
        // Body setup (Initial) - Will be updated in update() for rotation wrapping
        this.setBodySize(64, 32);
        
        // Visual Fallback (Colored Box)
        this.bodyGraphics = scene.add.graphics();
        this.bodyGraphics.fillStyle(0xff0000, 1); // Red
        this.bodyGraphics.fillRect(-32, -16, 64, 32);
        this.bodyGraphics.setDepth(25);
        // this.bodyGraphics.setVisible(false); // Hide if using real texture, but keep for now as requested
    }
    
    public setDriver(player: Player) {
        this.isDriven = true;
        // this.driver = player;
        this.keys = this.scene.input.keyboard!.addKeys({
            up: CONTROLS.MOVE_UP,
            down: CONTROLS.MOVE_DOWN,
            left: CONTROLS.MOVE_LEFT,
            right: CONTROLS.MOVE_RIGHT,
            brake: CONTROLS.MELEE, // Using Space/Melee as brake
            exit: CONTROLS.INTERACT
        }) as Record<string, Phaser.Input.Keyboard.Key>;
        
        // Cooldown to prevent instant exit
        this.interactionCooldown = 1000;
    }
    
    public removeDriver() {
        this.isDriven = false;
        // this.driver = null;
        if (this.keys) {
            // We might not want to remove keys from the SCENE, just clear our ref
            this.keys = null;
        }
        // Apply Parking Brake (Damping)
        this.setDrag(800);
        
        // Cooldown to prevent instant re-entry
        this.interactionCooldown = 1000;
    }

    update(_time: number, delta: number) {
        if (this.interactionCooldown > 0) {
            this.interactionCooldown -= delta;
        }
        
        // Sync Visuals
        this.bodyGraphics.setPosition(this.x, this.y);
        this.bodyGraphics.setRotation(this.rotation);

        // Update Physics Body AABB to "wrap" the tilted rectangle
        // Phaser Arcade Physics doesn't support rotated rects, so we grow the AABB
        const w = 64; // Visual Width
        const h = 32; // Visual Height
        const cos = Math.abs(Math.cos(this.rotation));
        const sin = Math.abs(Math.sin(this.rotation));
        
        const newWidth = w * cos + h * sin;
        const newHeight = w * sin + h * cos;
        
        this.setBodySize(newWidth, newHeight);
        
        // Center the body on the sprite (Origin 0.5, 0.5)
        // Arcade offset is from the top-left of the sprite's texture frame
        this.setOffset(
            (this.width / 2) - (newWidth / 2),
            (this.height / 2) - (newHeight / 2)
        );

        if (this.isDriven && this.keys) {
            this.handleDriving(delta);
        } else {
            // Apply friction when not driven
             const lateralVelocity = new Phaser.Math.Vector2(this.body!.velocity).project(
                new Phaser.Math.Vector2(Math.cos(this.rotation + Math.PI/2), Math.sin(this.rotation + Math.PI/2))
            );
            this.setVelocityX(this.body!.velocity.x - lateralVelocity.x * 0.9);
            this.setVelocityY(this.body!.velocity.y - lateralVelocity.y * 0.9);
            
            // Decelerate forward speed naturally
             this.body!.velocity.scale(0.98);
        }
    }
    
    private handleDriving(delta: number) {
        if (!this.keys) return;
        
        const dt = delta / 1000;
        
        // Acceleration / Braking
        if (this.keys.up.isDown) {
            this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * dt);
        } else if (this.keys.down.isDown) {
            // Reverse or Brake
            this.speed = Math.max(-this.maxSpeed / 2, this.speed - this.acceleration * dt);
        } else {
            // Coasting
            if (this.speed > 0) this.speed = Math.max(0, this.speed - 200 * dt);
            if (this.speed < 0) this.speed = Math.min(0, this.speed + 200 * dt);
        }
        
        // Steering (Only when moving)
        if (Math.abs(this.speed) > 10) {
            if (this.keys.left.isDown) {
                this.rotation -= this.rotationSpeed * dt;
            } else if (this.keys.right.isDown) {
                this.rotation += this.rotationSpeed * dt;
            }
        }
        
        // Apply Velocity vector based on rotation
        this.scene.physics.velocityFromRotation(this.rotation, this.speed, this.body!.velocity);
        
        // Drift / Lateral Friction
        const lateralVelocity = new Phaser.Math.Vector2(this.body!.velocity).project(
            new Phaser.Math.Vector2(Math.cos(this.rotation + Math.PI/2), Math.sin(this.rotation + Math.PI/2))
        );
        
        this.setVelocityX(this.body!.velocity.x - lateralVelocity.x * this.driftFactor);
        this.setVelocityY(this.body!.velocity.y - lateralVelocity.y * this.driftFactor);
    }
    
    public destroy(fromScene?: boolean) {
        if (this.bodyGraphics) this.bodyGraphics.destroy();
        super.destroy(fromScene);
    }

    // --- Interaction ---
    
    public canInteract(_player: Player): boolean {
        return !this.isDriven && this.interactionCooldown <= 0;
    }

    public canExit(): boolean {
        return this.interactionCooldown <= 0;
    }

    public getInteractionPrompt(_player: Player): string {
        return "Press F to Drive";
    }

    public interact(player: Player, _delta: number): void {
        if (this.isDriven || this.interactionCooldown > 0) return;
        player.enterVehicle(this);
    }
}
