import Phaser from 'phaser';
import { Player } from './Player';
import { IInteractable } from '../interfaces/IInteractable';
import { CONTROLS } from '../../config/controls';

export class Vehicle extends Phaser.Physics.Arcade.Sprite implements IInteractable {
    private speed: number = 0;
    private maxSpeed: number = 600;
    private acceleration: number = 400;
    private braking: number = 300;
    private driftFactor: number = 0.95; // 0 = Ice, 1 = On Rails
    private rotationSpeed: number = 2.5; // Radians per second
    
    private isDriven: boolean = false;
    private driver: Player | null = null;
    
    private keys: Record<string, Phaser.Input.Keyboard.Key> | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string = 'car_red') {
        super(scene, x, y, texture);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setCollideWorldBounds(true);
        this.setDrag(0.5); // Air resistance
        this.setDepth(25); // Below player (30) but above items (10)
        
        // Setup body
        // Assuming cars are rectangular
        this.setBodySize(this.width * 0.8, this.height * 0.8);
    }
    
    public setDriver(player: Player) {
        this.isDriven = true;
        this.driver = player;
        this.keys = this.scene.input.keyboard!.addKeys({
            up: CONTROLS.MOVE_UP,
            down: CONTROLS.MOVE_DOWN,
            left: CONTROLS.MOVE_LEFT,
            right: CONTROLS.MOVE_RIGHT,
            brake: CONTROLS.MELEE, // Using Space/Melee as brake
            exit: CONTROLS.INTERACT
        }) as Record<string, Phaser.Input.Keyboard.Key>;
        
        // Reset speed to avoid instant jump if carrying over velocity weirdly, 
        // though Arcade physics handles existing velocity fine.
    }
    
    public removeDriver() {
        this.isDriven = false;
        this.driver = null;
        if (this.keys) {
            // We might not want to remove keys from the SCENE, just clear our ref
            this.keys = null;
        }
        // Apply Parking Brake (Damping)
        this.setDrag(800);
    }

    update(time: number, delta: number) {
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
            const turnDir = this.speed > 0 ? 1 : -1; // Reverse steering inverted? No, usually typical car steering feels better normal.
            // Actually in reverse, Left key still turns front wheels left, causing car to turn left (relative to driver facing back? No)
            
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

    // --- Interaction ---
    
    public canInteract(player: Player): boolean {
        return !this.isDriven;
    }

    public getInteractionPrompt(player: Player): string {
        return "Press F to Drive";
    }

    public interact(player: Player, delta: number): void {
        if (this.isDriven) return;
        player.enterVehicle(this);
    }
}
