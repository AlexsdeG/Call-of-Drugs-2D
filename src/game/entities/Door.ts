import Phaser from 'phaser';
import { IInteractable } from '../interfaces/IInteractable';
import { Player } from './Player';
// import { useEmpireStore } from '../../store/useEmpireStore'; // Not needed if cost removed
import { PathfindingManager } from '../systems/PathfindingManager';
import { EventBus } from '../EventBus';

export class Door extends Phaser.Physics.Arcade.Sprite implements IInteractable {
    private locked: boolean;
    private zoneToActivate: number;
    private pathfindingManager: PathfindingManager;

    constructor(scene: Phaser.Scene, x: number, y: number, locked: boolean, zoneToActivate: number, pathfindingManager: PathfindingManager) {
        super(scene, x, y, 'door');
        this.locked = locked;
        this.zoneToActivate = zoneToActivate;
        this.pathfindingManager = pathfindingManager;

        scene.add.existing(this);
        scene.physics.add.existing(this, true); // Static body
        this.setImmovable(true);
    }

    interact(player: Player): void {
        if (!player.isInteractJustDown()) return;
        
        if (!this.locked) {
            this.open();
        } else {
            // Check if player has key (Phase 2) or just fail for now
            // TODO: Play "Locked" sound
        }
    }

    private open() {
        this.disableBody(true, true);
        this.pathfindingManager.setTileWalkable(this.x, this.y, true);
        
        // Emit activation event for Spawners
        if (this.zoneToActivate !== -1) {
            EventBus.emit('activate-zone', this.zoneToActivate);
            // console.log(`Door opened. Activating Zone ${this.zoneToActivate}`);
        }

        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                this.destroy();
            }
        });
    }

    getInteractionPrompt(): string {
        return this.locked ? "Locked" : "Press F to Open";
    }

    canInteract(_player: Player): boolean {
        return this.active && this.visible;
    }
}