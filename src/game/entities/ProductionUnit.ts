import Phaser from 'phaser';
import { IInteractable } from '../interfaces/IInteractable';
import { Player } from './Player';
import { InventoryManager } from '../systems/InventoryManager';
import { Item } from '../../store/useEmpireStore';

type ProductionState = 'IDLE' | 'PROCESSING' | 'READY';

export class ProductionUnit extends Phaser.Physics.Arcade.Sprite implements IInteractable {
    private machineState: ProductionState = 'IDLE';
    
    // Config
    private processingTime: number = 3000; // 3 seconds to process
    private processingTimer: number = 0;
    
    private startInteractionDuration: number = 1000; // Hold F for 1s to start
    private interactionAccumulator: number = 0;
    private lastInteractionTime: number = 0; // Track when last interacted to prevent immediate decay
    
    private outputItem: Item = {
        id: 'weed_packet',
        name: 'Bag of Weed',
        type: 'drug',
        illegal: true,
        weight: 1,
        quantity: 1,
        stackable: true
    };

    // Visuals
    private statusText: Phaser.GameObjects.Text;
    private progressBar: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        // Placeholder texture 'barricade' for now, or 'crate'
        super(scene, x, y, 'barricade'); 

        scene.add.existing(this);
        scene.physics.add.existing(this, true); // Static body
        
        this.setBodySize(32, 32);
        this.setOrigin(0.5, 0.5);
        this.setImmovable(true);
        this.setDepth(5);
        
        this.statusText = scene.add.text(x, y - 25, 'IDLE', { 
            fontSize: '12px', color: '#ffffff', stroke: '#000000', strokeThickness: 2 
        }).setOrigin(0.5);
        this.statusText.setDepth(25);

        this.progressBar = scene.add.graphics();
        this.progressBar.setDepth(25);

        this.updateVisuals();
    }

    update(time: number, delta: number) {
        if (this.machineState === 'PROCESSING') {
            this.processingTimer += delta;
            this.updateProgressBar(this.processingTimer, this.processingTime);
            
            if (this.processingTimer >= this.processingTime) {
                this.completeProcessing();
            }
        } else {
            // Decay only if not interacted recently (e.g., within last 100ms)
             if (this.interactionAccumulator > 0 && time > this.lastInteractionTime + 100) {
                 this.interactionAccumulator -= delta * 2; // Decay
                 if (this.interactionAccumulator < 0) this.interactionAccumulator = 0;
                 // this.updateProgressBar(this.interactionAccumulator, this.startInteractionDuration); // Optional feedback
                 // Force clear if decayed fully
                 if (this.interactionAccumulator === 0) this.progressBar.clear();
             }
        }
    }

    public interact(_player: Player, delta: number = 16): void {
        this.lastInteractionTime = this.scene.time.now; // Record interaction
        
        if (this.machineState === 'IDLE') {
            // Hold to Start
            this.interactionAccumulator += delta;
            
            // Show progress of starting
            this.updateProgressBar(this.interactionAccumulator, this.startInteractionDuration);
            
            if (this.interactionAccumulator >= this.startInteractionDuration) {
                this.startProcessing();
            }
        } else if (this.machineState === 'READY') {
            // Instant Collect
            this.collectItem();
        }
    }

    private startProcessing() {
        this.machineState = 'PROCESSING';
        this.processingTimer = 0;
        this.interactionAccumulator = 0;
        this.statusText.setText('COOKING...');
        this.setTint(0xffff00); // Yellow
    }

    private completeProcessing() {
        this.machineState = 'READY';
        this.processingTimer = 0;
        this.progressBar.clear();
        this.statusText.setText('READY');
        this.setTint(0x00ff00); // Green
    }

    private collectItem() {
        const success = InventoryManager.addItem(this.outputItem);
        if (success) {
            this.machineState = 'IDLE';
            this.statusText.setText('IDLE');
            this.setTint(0xffffff); // White
            
            // FX
            this.scene.tweens.add({
                targets: this,
                scale: { from: 1.2, to: 1 },
                duration: 100,
                yoyo: true
            });
        } else {
            // Inventory Full feedback
            this.statusText.setText('FULL!');
            this.scene.time.delayedCall(1000, () => {
                if (this.machineState === 'READY') this.statusText.setText('READY');
            });
        }
    }

    private updateProgressBar(current: number, max: number) {
        this.progressBar.clear();
        const width = 32;
        const height = 4;
        const x = this.x - width / 2;
        const y = this.y + 20;

        const percent = Phaser.Math.Clamp(current / max, 0, 1);
        
        // bg
        this.progressBar.fillStyle(0x000000, 0.5);
        this.progressBar.fillRect(x, y, width, height);
        
        // fg
        this.progressBar.fillStyle(0x00ff00, 1);
        this.progressBar.fillRect(x, y, width * percent, height);
    }
    
    private updateVisuals() {
        // Initial setup if needed
    }

    getInteractionPrompt(_player: Player): string {
        if (this.machineState === 'IDLE') return "Hold F to Cook";
        if (this.machineState === 'PROCESSING') return "Cooking..."; 
        if (this.machineState === 'READY') return "Press F to Collect";
        return "";
    }

    canInteract(_player: Player): boolean {
        return this.machineState === 'IDLE' || this.machineState === 'READY';
    }

    destroy(fromScene?: boolean) {
        if (this.statusText) this.statusText.destroy();
        if (this.progressBar) this.progressBar.destroy();
        super.destroy(fromScene);
    }
}
