import Phaser from 'phaser';
import { POLICE_VISION, HEAT, DEBUG } from '../../config/constants';
import { Player } from './Player';
import { PathfindingManager } from '../systems/PathfindingManager';
import { VisionCone } from '../systems/VisionCone';
import { useEmpireStore } from '../../store/useEmpireStore';
import { EventBus } from '../EventBus';

/**
 * Police AI States:
 * - PATROL: Walk random waypoints, no engagement
 * - INVESTIGATE: Move toward crime location
 * - CHASE: Sprint at player when detected with illegal items
 * - ARREST: At player, attempt arrest
 * - DEAD: Inactive
 */
type PoliceState = 'SPAWN' | 'PATROL' | 'INVESTIGATE' | 'CHASE' | 'ARREST' | 'DEAD';

export class Police extends Phaser.Physics.Arcade.Sprite {
    private aiState: PoliceState = 'SPAWN';
    private target: Player;
    private pathfinder: PathfindingManager;
    private wallLayer?: Phaser.Tilemaps.TilemapLayer;
    
    // Vision System
    private visionCone: VisionCone;
    
    // Patrolling
    private patrolPoints: { x: number, y: number }[] = [];
    private currentPatrolIndex: number = 0;
    private patrolWaitTimer: number = 0;
    
    // Investigation
    private investigateTarget: { x: number, y: number } | null = null;
    private investigateTimer: number = 0;
    
    // Pathing Data
    private currentPath: {x: number, y: number}[] | null = null;
    private pathIndex: number = 0;
    private lastPathRequestTime: number = 0;
    private readonly PATH_RECALC_RATE = 1000; // ms

    // Combat Data
    private health: number = 100;
    private lastAttackTime: number = 0;
    
    // Speed
    private patrolSpeed: number = POLICE_VISION.PATROL_SPEED;
    private chaseSpeed: number = POLICE_VISION.CHASE_SPEED;

    constructor(
        scene: Phaser.Scene, 
        x: number, 
        y: number, 
        target: Player, 
        pathfinder: PathfindingManager,
        wallLayer?: Phaser.Tilemaps.TilemapLayer,
        targetLayer?: Phaser.GameObjects.Layer
    ) {
        super(scene, x, y, 'police');
        this.target = target;
        this.pathfinder = pathfinder;
        this.wallLayer = wallLayer;

        // Add to scene
        if (targetLayer) {
            targetLayer.add(this);
        } else {
            scene.add.existing(this);
        }
        scene.physics.add.existing(this);

        // Physics setup
        this.setDepth(29); 
        this.setCircle(12, 4, 4); 
        this.setCollideWorldBounds(true);
        this.setBounce(0.1); 
        this.setDrag(200);
        
        // Initialize vision cone
        this.visionCone = new VisionCone(scene, this, wallLayer);
        
        // Generate patrol points around spawn location
        this.generatePatrolPoints(x, y);

        // Spawn animation
        this.setAlpha(0);
        this.setScale(0);
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            scale: 1,
            duration: 800,
            ease: 'Back.easeOut',
            onComplete: () => {
                if (this.active) {
                    this.aiState = 'PATROL';
                    this.requestPathToNextPatrol();
                }
            }
        });

        // Listen for crime events
        this.scene.events.on('crime-committed', this.onCrimeCommitted, this);
    }

    /**
     * Generate random patrol waypoints around spawn position
     */
    private generatePatrolPoints(centerX: number, centerY: number) {
        const radius = 150;
        const points = 4;
        
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            this.patrolPoints.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius
            });
        }
        
        // Shuffle patrol points for variety
        this.patrolPoints.sort(() => Math.random() - 0.5);
    }

    update(time: number, delta: number) {
        if (!this.active || !this.body || this.aiState === 'DEAD' || this.aiState === 'SPAWN') return;

        // Safety: If player is dead/destroyed, stop logic
        if (!this.target || !this.target.active) {
            this.setVelocity(0, 0);
            return;
        }

        // Update vision cone and check for player detection
        const playerHasIllegal = this.playerHasIllegalItems();
        const isDetected = this.visionCone.updateDetection(this.target, delta);
        
        // Draw debug if enabled
        if (DEBUG.SHOW_POLICE_VISION) {
            this.visionCone.drawDebug();
        }

        // Get heat level
        const heat = useEmpireStore.getState().heat;

        // State machine logic
        switch (this.aiState) {
            case 'PATROL':
                this.handlePatrol(time, delta);
                
                // Check for player detection
                if (isDetected && playerHasIllegal && heat >= HEAT.IGNORE_THRESHOLD) {
                    this.startChase();
                }
                break;

            case 'INVESTIGATE':
                this.handleInvestigate(time, delta);
                
                // While investigating, still check for player
                if (isDetected && playerHasIllegal) {
                    this.startChase();
                }
                break;

            case 'CHASE':
                this.handleChase(time, delta);
                
                // If player escapes line of sight for too long, go back to patrol
                if (!this.visionCone.isPlayerVisible(this.target)) {
                    this.investigateTimer += delta;
                    if (this.investigateTimer > 3000) { // 3 seconds to lose pursuit
                        this.aiState = 'PATROL';
                        this.investigateTimer = 0;
                        this.currentPath = null;
                    }
                } else {
                    this.investigateTimer = 0;
                }
                break;

            case 'ARREST':
                this.handleArrest(time);
                break;
        }

        // Rotation based on velocity
        if (this.body.velocity.length() > 5) {
            this.setRotation(this.body.velocity.angle());
        }
    }

    /**
     * Check if player has any illegal items
     */
    private playerHasIllegalItems(): boolean {
        const inventory = useEmpireStore.getState().inventory;
        return inventory.some(item => item.illegal);
    }

    /**
     * Patrol behavior - walk between waypoints
     */
    private handlePatrol(time: number, _delta: number) {
        // Wait at patrol point
        if (this.patrolWaitTimer > 0) {
            this.patrolWaitTimer -= _delta;
            this.setVelocity(0, 0);
            return;
        }

        // Follow current path
        if (!this.currentPath || this.pathIndex >= this.currentPath.length) {
            if (time > this.lastPathRequestTime + this.PATH_RECALC_RATE) {
                this.nextPatrolPoint();
                this.requestPathToNextPatrol();
            }
            return;
        }

        const node = this.currentPath[this.pathIndex];
        const distToNode = Phaser.Math.Distance.Between(this.x, this.y, node.x, node.y);

        if (distToNode < 20) {
            this.pathIndex++;
            
            // Reached final node? Wait and then next point
            if (this.pathIndex >= this.currentPath.length) {
                this.patrolWaitTimer = Phaser.Math.Between(1000, 3000);
            }
        } else {
            this.scene.physics.moveTo(this, node.x, node.y, this.patrolSpeed);
        }
    }

    private nextPatrolPoint() {
        this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
    }

    private requestPathToNextPatrol() {
        if (!this.scene.sys.isActive()) return;
        this.lastPathRequestTime = this.scene.time.now;
        
        const target = this.patrolPoints[this.currentPatrolIndex];
        if (!target) return;

        this.pathfinder.findPath(this.x, this.y, target.x, target.y, (path) => {
            if (!this.active) return;
            if (path && path.length > 0) {
                this.currentPath = path;
                this.pathIndex = 1;
            }
        });
    }

    /**
     * Investigate behavior - go to crime location
     */
    private handleInvestigate(time: number, delta: number) {
        if (!this.investigateTarget) {
            this.aiState = 'PATROL';
            return;
        }

        const distToTarget = Phaser.Math.Distance.Between(
            this.x, this.y,
            this.investigateTarget.x, this.investigateTarget.y
        );

        // Reached investigation target
        if (distToTarget < 50) {
            this.investigateTimer += delta;
            this.setVelocity(0, 0);
            
            // Look around, then return to patrol
            if (this.investigateTimer > 3000) {
                this.aiState = 'PATROL';
                this.investigateTarget = null;
                this.investigateTimer = 0;
            }
            return;
        }

        // Path to investigation point
        if (!this.currentPath || this.pathIndex >= this.currentPath.length) {
            if (time > this.lastPathRequestTime + this.PATH_RECALC_RATE) {
                this.requestPathTo(this.investigateTarget.x, this.investigateTarget.y);
            }
            return;
        }

        const node = this.currentPath[this.pathIndex];
        const distToNode = Phaser.Math.Distance.Between(this.x, this.y, node.x, node.y);

        if (distToNode < 15) {
            this.pathIndex++;
        } else {
            this.scene.physics.moveTo(this, node.x, node.y, this.patrolSpeed * 1.3);
        }
    }

    /**
     * Chase behavior - pursue player aggressively
     */
    private handleChase(time: number, _delta: number) {
        const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        // Close enough to arrest
        if (distToPlayer < 40) {
            this.aiState = 'ARREST';
            this.setVelocity(0, 0);
            return;
        }

        // Direct chase if visible
        if (this.visionCone.isPlayerVisible(this.target)) {
            this.scene.physics.moveToObject(this, this.target, this.chaseSpeed);
        } else {
            // Pathfind to last known location
            if (time > this.lastPathRequestTime + this.PATH_RECALC_RATE / 2) {
                this.requestPathTo(this.target.x, this.target.y);
            }

            if (this.currentPath && this.pathIndex < this.currentPath.length) {
                const node = this.currentPath[this.pathIndex];
                const distToNode = Phaser.Math.Distance.Between(this.x, this.y, node.x, node.y);

                if (distToNode < 15) {
                    this.pathIndex++;
                } else {
                    this.scene.physics.moveTo(this, node.x, node.y, this.chaseSpeed);
                }
            }
        }
    }

    /**
     * Arrest behavior - damage/stun player
     */
    private handleArrest(time: number) {
        const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        if (distToPlayer > 50) {
            this.aiState = 'CHASE';
            return;
        }

        if (time > this.lastAttackTime + 1000) {
            // Lunge attack animation
            const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
            this.scene.tweens.add({
                targets: this,
                x: this.x + Math.cos(angle) * 10,
                y: this.y + Math.sin(angle) * 10,
                duration: 100,
                yoyo: true,
                ease: 'Power1'
            });

            // Damage player and add heat
            this.scene.events.emit('player-damaged', 15);
            useEmpireStore.getState().addHeat(HEAT.SPOTTED_INCREASE);
            
            this.lastAttackTime = time;
        }
    }

    /**
     * Start chase mode
     */
    private startChase() {
        this.aiState = 'CHASE';
        this.visionCone.resetDetection();
        this.currentPath = null;
        this.investigateTimer = 0;
        
        // Alert nearby police
        EventBus.emit('police-chase-started', { x: this.target.x, y: this.target.y });
        
        // Add spotted heat
        useEmpireStore.getState().addHeat(HEAT.SPOTTED_INCREASE);
    }

    /**
     * Handle crime event - investigate location
     */
    private onCrimeCommitted(data: { type: string, heat: number }) {
        if (this.aiState === 'DEAD' || this.aiState === 'CHASE') return;

        // Only investigate if heat is high enough
        if (data.heat >= HEAT.INVESTIGATE_THRESHOLD) {
            const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
            
            // Only investigate if within reasonable range
            if (distToPlayer < 500) {
                this.investigateTarget = { x: this.target.x, y: this.target.y };
                this.aiState = 'INVESTIGATE';
                this.currentPath = null;
                this.investigateTimer = 0;
            }
        }
    }

    private requestPathTo(targetX: number, targetY: number) {
        if (!this.scene.sys.isActive()) return;
        this.lastPathRequestTime = this.scene.time.now;

        this.pathfinder.findPath(this.x, this.y, targetX, targetY, (path) => {
            if (!this.active) return;
            if (path && path.length > 0) {
                this.currentPath = path;
                this.pathIndex = 1;
            }
        });
    }

    /**
     * Take damage from player weapons
     */
    public takeDamage(amount: number): boolean {
        if (this.aiState === 'DEAD') return false;

        this.health -= amount;

        // Visual feedback
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            if (this.active && this.aiState !== 'DEAD') this.clearTint();
        });

        // Knockback
        if (this.body && this.target) {
            const angle = Phaser.Math.Angle.Between(this.target.x, this.target.y, this.x, this.y);
            const knockback = new Phaser.Math.Vector2();
            this.scene.physics.velocityFromRotation(angle, 150, knockback);
            this.body.velocity.add(knockback);
        }

        // Start chase if not already
        if (this.aiState !== 'CHASE' && this.aiState !== 'ARREST') {
            this.startChase();
        }

        if (this.health <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    private die() {
        this.aiState = 'DEAD';
        this.setVelocity(0, 0);
        this.setTint(0x333333);
        if (this.body) this.body.enable = false;

        // Add significant heat for killing police
        useEmpireStore.getState().addHeat(HEAT.KILL_POLICE_INCREASE);
        
        // Money bonus for killing police
        useEmpireStore.getState().addCash(150);

        // Remove event listener
        this.scene.events.off('crime-committed', this.onCrimeCommitted, this);

        // Death animation
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            angle: 90,
            scale: 0.8,
            duration: 400,
            onComplete: () => {
                this.visionCone.destroy();
                this.destroy();
            }
        });
    }

    /**
     * Get current AI state
     */
    public getState(): PoliceState {
        return this.aiState;
    }

    /**
     * Apply slow effect
     */
    public applySlow() {
        // Reduce speed temporarily
        this.patrolSpeed = POLICE_VISION.PATROL_SPEED * 0.7;
        this.chaseSpeed = POLICE_VISION.CHASE_SPEED * 0.7;
        
        this.scene.time.delayedCall(100, () => {
            this.patrolSpeed = POLICE_VISION.PATROL_SPEED;
            this.chaseSpeed = POLICE_VISION.CHASE_SPEED;
        });
    }

    /**
     * Handle collision with barricade (for legacy compatibility)
     */
    public handleCollisionWithBarricade(_barricade: any): void {
        // In the new drug empire system, police don't attack barricades
        // Just stop momentarily
        this.setVelocity(0, 0);
    }

    /**
     * Cleanup on destroy
     */
    destroy(fromScene?: boolean) {
        this.scene.events.off('crime-committed', this.onCrimeCommitted, this);
        this.visionCone.destroy();
        super.destroy(fromScene);
    }
}