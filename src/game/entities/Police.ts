import Phaser from 'phaser';
import { ZOMBIE, PLAYER } from '../../config/constants';
import { Player } from './Player';
import { PathfindingManager } from '../systems/PathfindingManager';
import { Barricade } from './Barricade';
import { useEmpireStore } from '../../store/useEmpireStore';
// PowerUp imports removed
import { POWERUP } from '../../config/constants';
// EventBus import kept for other uses if any
import { EventBus } from '../EventBus';

type PoliceState = 'SPAWN' | 'IDLE' | 'PATHING' | 'CHASE' | 'ATTACK' | 'ATTACK_BARRIER' | 'DEAD';

export class Police extends Phaser.Physics.Arcade.Sprite {
    private aiState: PoliceState = 'SPAWN';
    private target: Player;
    private pathfinder: PathfindingManager;
    private speed: number;
    private barricadeGroup?: Phaser.Physics.Arcade.StaticGroup;
    private wallLayer?: Phaser.Tilemaps.TilemapLayer;
    
    // Combat Target (Barricade)
    private barrierTarget: Barricade | null = null;

    // Pathing Data
    private currentPath: {x: number, y: number}[] | null = null;
    private pathIndex: number = 0;
    private lastPathRequestTime: number = 0;
    private readonly PATH_RECALC_RATE = 500; // ms

    // Combat Data
    private health: number = 100;
    private lastAttackTime: number = 0;
    private readonly BARRIER_ATTACK_RATE = 700; // 0.7s
    
    // Slow Effect
    private slowUntil: number = 0;

    // AI Logic
    private breached: boolean = false;

    
    // Raycast Line Cache
    private losLine: Phaser.Geom.Line = new Phaser.Geom.Line();

    constructor(
        scene: Phaser.Scene, 
        x: number, 
        y: number, 
        target: Player, 
        pathfinder: PathfindingManager,
        barricadeGroup?: Phaser.Physics.Arcade.StaticGroup,
        wallLayer?: Phaser.Tilemaps.TilemapLayer,
        targetLayer?: Phaser.GameObjects.Layer
    ) {
        super(scene, x, y, 'police');
        this.target = target;
        this.pathfinder = pathfinder;
        this.barricadeGroup = barricadeGroup;
        this.wallLayer = wallLayer;

        if (targetLayer) {
            targetLayer.add(this);
        } else {
            scene.add.existing(this);
        }
        scene.physics.add.existing(this);

        this.setDepth(29); 
        this.setCircle(12, 4, 4); 
        this.setCollideWorldBounds(true);
        this.setBounce(0.1); 
        this.setDrag(200); 

        // Randomize Speed
        if (Math.random() > 0.9) {
             this.speed = PLAYER.DEFAULT_SPEED * 0.9; 
        } else {
             this.speed = ZOMBIE.DEFAULT_SPEED * Phaser.Math.FloatBetween(0.7, 1.1);
        }
        
        this.setAlpha(0);
        this.setScale(0);
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            scale: 1,
            duration: 1000,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Immediately start hunting (No IDLE)
                if (this.active) {
                    this.aiState = 'PATHING';
                    this.requestPath();
                }
            }
        });
    }

    update(time: number, delta: number) {
        if (!this.active || !this.body || this.aiState === 'DEAD' || this.aiState === 'SPAWN') return;

        // Safety: If player is dead/destroyed, stop logic
        if (!this.target || !this.target.active) {
            this.setVelocity(0, 0);
            return;
        }

        // --- BARRIER LOGIC ---
        // If we are targeting a barrier, stay in this mode until it's broken
        if (this.aiState === 'ATTACK_BARRIER') {
            if (!this.barrierTarget || !this.barrierTarget.active) {
                // Destroyed completely
                this.aiState = 'PATHING';
                this.barrierTarget = null;
            } else if (!this.barrierTarget.hasPanels()) {
                // Broken (Walkable), move through it
                this.aiState = 'PATHING';
                this.barrierTarget = null;
                // Push through with force to prevent getting stuck
                this.scene.physics.moveToObject(this, this.target, this.getSpeed());
            } else {
                // Attack
                this.handleBarrierAttack(time);
                return;
            }
        }
        
        // Proximity Check for Barricades
        if (this.barrierTarget && !this.breached) {
             const dist = Phaser.Math.Distance.Between(this.x, this.y, this.barrierTarget.x, this.barrierTarget.y);
             
             // If close to target barricade
             if (dist < 40) { 
                 if (this.barrierTarget.hasPanels()) {
                     // It's closed, attack it
                      if (this.aiState !== 'ATTACK_BARRIER') {
                         this.aiState = 'ATTACK_BARRIER';
                         this.setVelocity(0, 0);
                     }
                 } else {
                     // It's open, we have breached!
                     this.breached = true;
                     this.barrierTarget = null;
                     this.aiState = 'PATHING';
                     this.requestPath(); // Switch to player target
                     return;
                 }
             }
        }

        const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        // --- PLAYER LOGIC ---
        if (distToPlayer < ZOMBIE.ATTACK_RANGE) {
            this.aiState = 'ATTACK';
            this.setVelocity(0, 0); 
            this.handleAttack(time);
        } else if (distToPlayer < ZOMBIE.AGGRO_RADIUS && this.hasLineOfSight()) {
            this.aiState = 'CHASE';
            this.handleChase();
        } else {
            this.aiState = 'PATHING';
            this.handlePathing(time, distToPlayer);
        }

        // Rotation & Micro-Movement to prevent stacking
        if (this.body.velocity.length() > 5) {
            this.setRotation(this.body.velocity.angle());
        }
        
        // Anti-Stacking jitter
        if (Math.random() < 0.02) {
             const s = this.getSpeed();
             this.setVelocity(
                 this.body.velocity.x + (Math.random() - 0.5) * (s * 0.2), 
                 this.body.velocity.y + (Math.random() - 0.5) * (s * 0.2)
             );
        }
    }

    public takeDamage(amount: number, skipPoints: boolean = false): boolean {
        if (this.aiState === 'DEAD') return false;

        // Check Insta-Kill
        // PowerUp checks removed

        this.health -= amount;

        // Visual Feedback
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
             if (this.active && this.aiState !== 'DEAD') this.clearTint();
        });
        
        // Simple Knockback
        if (this.body && this.target) {
             const angle = Phaser.Math.Angle.Between(this.target.x, this.target.y, this.x, this.y);
             const knockback = new Phaser.Math.Vector2();
             this.scene.physics.velocityFromRotation(angle, 100, knockback);
             this.body.velocity.add(knockback);
        }

        if (this.health <= 0) {
            this.die(skipPoints);
            return true;
        }
        return false;
    }

    private die(skipPoints: boolean = false) {
        this.aiState = 'DEAD';
        this.setVelocity(0, 0);
        this.setTint(0x333333);
        if (this.body) this.body.enable = false;

        if (!skipPoints) {
            useEmpireStore.getState().addCash(100);
        }

        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            angle: 90,
            scale: 0.8,
            duration: 400,
            onComplete: () => {
                this.destroy();
            }
        });
    }

    public handleCollisionWithBarricade(barricade: Barricade) {
        if (this.aiState !== 'ATTACK_BARRIER' && barricade.hasPanels()) {
            this.aiState = 'ATTACK_BARRIER';
            this.barrierTarget = barricade;
            this.setVelocity(0, 0);
        }
    }
    
    public applySlow() {
        // Apply slow for next 100ms (covering this frame and until next update)
        this.slowUntil = this.scene.time.now + 100;
    }

    private getSpeed(): number {
        if (this.scene.time.now < this.slowUntil) {
            return this.speed * 0.7;
        }
        return this.speed;
    }

    private handleBarrierAttack(time: number) {
        if (time > this.lastAttackTime + this.BARRIER_ATTACK_RATE) {
            if (this.barrierTarget && this.barrierTarget.hasPanels()) {
                 this.barrierTarget.removePanel(); 
                 
                 this.scene.tweens.add({
                    targets: this,
                    x: this.barrierTarget.x,
                    y: this.barrierTarget.y,
                    duration: 100,
                    yoyo: true,
                    ease: 'Power1'
                 });
            }
            this.lastAttackTime = time;
        }
    }

    private handleChase() {
        if (this.target.active) {
            this.scene.physics.moveToObject(this, this.target, this.getSpeed());
        }
    }

    private handlePathing(time: number, dist: number) {
        if (!this.currentPath || this.pathIndex >= this.currentPath.length) {
            if (time > this.lastPathRequestTime + this.PATH_RECALC_RATE) {
                this.requestPath();
            }
            return;
        } 
        
        const node = this.currentPath[this.pathIndex];
        const distToNode = Phaser.Math.Distance.Between(this.x, this.y, node.x, node.y);

        if (distToNode < 15) { 
            this.pathIndex++;
        } else {
            this.scene.physics.moveTo(this, node.x, node.y, this.getSpeed());
        }

        if (time > this.lastPathRequestTime + this.PATH_RECALC_RATE) {
            this.lastPathRequestTime = time + Math.random() * 200; 
            this.requestPath();
        }
    }

    private requestPath() {
        if (!this.target.active || !this.scene.sys.isActive()) return;
        this.lastPathRequestTime = this.scene.time.now;

        if (this.breached) {
            // Already inside/breached: Chase Player
            this.pathfinder.findPath(this.x, this.y, this.target.x, this.target.y, (path) => {
                if (!this.active) return;
                if (path && path.length > 0) {
                    this.currentPath = path;
                    this.pathIndex = 1; 
                }
            });
        } else {
            // Outside: Target closest Barricade (Open or Closed)
            this.findPathToBarricade();
        }
    }

    private findPathToBarricade() {
        if (!this.barricadeGroup) {
            this.breached = true; 
            this.requestPath();
            return;
        }

        // Get all barricades and sort by distance
        const sortedBarricades = this.barricadeGroup.getChildren()
            .map(b => b as Barricade)
            .sort((a, b) => {
                const distA = Phaser.Math.Distance.Between(this.x, this.y, a.x, a.y);
                const distB = Phaser.Math.Distance.Between(this.x, this.y, b.x, b.y);
                return distA - distB;
            });

        // Try pathing to barricades sequentially
        const tryNextBarricade = (index: number) => {
            if (index >= sortedBarricades.length) {
                // All unreachable? Fallback to player/breach
                this.breached = true;
                this.requestPath();
                return;
            }

            const bar = sortedBarricades[index];
            
            // Find path to barricade interaction point
            this.pathfinder.findPathToNeighbor(this.x, this.y, bar.x, bar.y, (path) => {
                 if (!this.active) return;
                 
                 if (path && path.length > 0) {
                     this.currentPath = path;
                     this.pathIndex = 1;
                     this.barrierTarget = bar; 
                 } else {
                     // Path failed, try next closest barricade
                     tryNextBarricade(index + 1);
                 }
            });
        };

        tryNextBarricade(0);
    }

    private handleAttack(time: number) {
        if (time > this.lastAttackTime + ZOMBIE.ATTACK_COOLDOWN) {
            // Lunge slightly towards player (but don't overlap centers to prevent physics push)
            const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
            const lungeDist = 10;
            const targetX = this.x + Math.cos(angle) * lungeDist;
            const targetY = this.y + Math.sin(angle) * lungeDist;

            this.scene.tweens.add({
                targets: this,
                x: targetX,
                y: targetY,
                duration: 100,
                yoyo: true,
                ease: 'Power1',
                onComplete: () => {
                    if (this.body) this.setVelocity(0,0);
                }
            });
            this.scene.events.emit('player-damaged', ZOMBIE.DAMAGE);
            this.lastAttackTime = time;
        }
    }

    private hasLineOfSight(): boolean {
        // If no wall layer provided, assume clear LOS
        if (!this.wallLayer) return true;

        this.losLine.setTo(this.x, this.y, this.target.x, this.target.y);
        
        // Get all tiles along the line
        const tiles = this.wallLayer.getTilesWithinShape(this.losLine);

        for (const tile of tiles) {
            // Check if tile is a wall (index 1 is wall, 0 is floor)
            // Or use .canCollide property if collisions are set up
            if (tile.index !== -1 && tile.index !== 0) {
                return false;
            }
        }
        return true;
    }
    
    private spawnPowerUp() {
        // PowerUp spawn removed
    }
}