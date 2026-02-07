import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Vehicle } from '../Vehicle';
import { Player } from '../Player';
import Phaser from 'phaser';

// Mock Phaser Physics
vi.mock('phaser', () => {
    return {
        default: {
            Physics: {
                Arcade: {
                    Sprite: class MockSprite {
                        scene: any;
                        x: number;
                        y: number;
                        body: any;
                        drivable: boolean;
                        constructor(scene: any, x: number, y: number) {
                            this.scene = scene;
                            this.x = x;
                            this.y = y;
                            this.body = {
                                velocity: { x: 0, y: 0 },
                                setDrag: vi.fn(),
                                setAngularDrag: vi.fn(),
                                setMaxVelocity: vi.fn(),
                                offset: { set: vi.fn() },
                                setSize: vi.fn()
                            };
                        }
                        setCollideWorldBounds() {}
                        setDepth() {}
                        setDisplaySize() {}
                        setVelocity() {}
                        setVelocityX() {}
                        setVelocityY() {}
                        setDrag() {}
                    }
                }
            },
            Math: {
                Vector2: class MockVector2 {
                    x: number = 0;
                    y: number = 0;
                    constructor(x?: number, y?: number) { this.x = x || 0; this.y = y || 0; }
                    project() { return this; }
                    length() { return 0; }
                }
            }
        }
    };
});

describe('Vehicle Entity', () => {
    let scene: any;
    let vehicle: Vehicle;
    let player: Player;

    beforeEach(() => {
        scene = {
            physics: {
                velocityFromRotation: vi.fn()
            },
            input: {
                keyboard: {
                    addKeys: vi.fn().mockReturnValue({
                        up: { isDown: false },
                        down: { isDown: false },
                        left: { isDown: false },
                        right: { isDown: false }
                    })
                }
            }
        };
        
        vehicle = new Vehicle(scene, 100, 100);
        player = {
            enterVehicle: vi.fn()
        } as unknown as Player;
    });

    it('should initialize with default values', () => {
        expect(vehicle.maxSpeed).toBe(600);
        expect(vehicle.speed).toBe(0);
        expect(vehicle.isDriven).toBe(false);
    });

    it('should implement IInteractable interface prompt', () => {
        const prompt = vehicle.getInteractionPrompt(player);
        expect(prompt).toBe("Press F to Drive");
    });

    it('should not show prompt if already driven', () => {
        vehicle.setDriver(player);
        const prompt = vehicle.getInteractionPrompt(player);
        expect(prompt).toBe(null);
    });

    it('should enter vehicle on interaction', () => {
        vehicle.interact(player);
        expect(player.enterVehicle).toHaveBeenCalledWith(vehicle);
    });

    it('should set driver correctly', () => {
        vehicle.setDriver(player);
        expect(vehicle.isDriven).toBe(true);
        expect(vehicle['driver']).toBe(player);
        expect(scene.input.keyboard.addKeys).toHaveBeenCalled();
    });

    it('should remove driver correctly', () => {
        vehicle.setDriver(player);
        vehicle.removeDriver();
        expect(vehicle.isDriven).toBe(false);
        expect(vehicle['driver']).toBe(null);
        expect(vehicle.body.setDrag).toHaveBeenCalledWith(800); // Parking brake
    });

    it('should accelerate when up key is pressed', () => {
        vehicle.setDriver(player);
        const keys = vehicle['keys'];
        keys.up.isDown = true;
        
        vehicle.update(0, 1000); // 1 second delta
        expect(vehicle.speed).toBeGreaterThan(0);
    });
});
