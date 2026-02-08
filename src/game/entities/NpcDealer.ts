import Phaser from 'phaser';
import { IInteractable } from '../interfaces/IInteractable';
import { Player } from './Player';
import { InventoryManager } from '../systems/InventoryManager';
import { useEmpireStore } from '../../store/useEmpireStore';
import { EventBus } from '../EventBus';

export class NpcDealer extends Phaser.Physics.Arcade.Sprite implements IInteractable {
    
    // Config
    private interactionCooldown: number = 0;
    
    // Visuals
    private label: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        // Placeholder texture 'player' (tinted) or new 'dealer' logic if assets existed
        // For now, reusing 'police' tinted or 'zombie' tinted as placeholder if needed,
        // but let's assume 'player' sprite is safe or use a rect if no asset.
        // Actually, let's use 'player' and tint it purple.
        super(scene, x, y, 'police'); 

        scene.add.existing(this);
        scene.add.existing(this);
        scene.physics.add.existing(this); // Dynamic body (default)
        
        this.setBodySize(32, 32);
        this.setOrigin(0.5, 0.5);
        this.setImmovable(true);
        this.setPushable(false); // Fix: Prevent player from pushing dealer
        this.setDepth(6);
        this.setTint(0x9900ff); // Purple Dealer
        
        this.label = scene.add.text(x, y - 30, 'DEALER', { 
            fontSize: '10px', color: '#d8b4fe', stroke: '#000000', strokeThickness: 2 
        }).setOrigin(0.5);
        this.label.setDepth(25);
    }

    update(_time: number, delta: number) {
        if (this.interactionCooldown > 0) {
            this.interactionCooldown -= delta;
        }
    }

    public interact(_player: Player, delta: number = 16): void {
        if (this.interactionCooldown > 0) {
            this.interactionCooldown -= delta;
            return;
        }
        
        // Simple distinct click interaction, ignore hold delta for now
        this.sellIllegalItems();
        this.interactionCooldown = 1500; // Debounce 1.5s
    }

    private sellIllegalItems() {
        const inventory = useEmpireStore.getState().inventory;
        const illegalItems = inventory.filter(i => i.illegal);
        
        if (illegalItems.length === 0) {
            this.showFeedback("No Product!");
            return;
        }

        let totalValue = 0;
        let totalCount = 0;

        // Process all illegal items
        illegalItems.forEach(item => {
            // Mock Price: $100 per unit
            const price = 100; 
            const value = item.quantity * price;
            totalValue += value;
            totalCount += item.quantity;
            
            // Remove from inventory
            InventoryManager.removeItem(item.id, item.quantity);
        });

        if (totalCount > 0) {
            useEmpireStore.getState().addCash(totalValue);
            // fix: Emit event so HeatManager handles logic (and verifies it works)
            EventBus.emit('report-crime', { type: 'deal_drugs' });

            this.showFeedback(`Sold ${totalCount}! +$${totalValue}`);
            
            // FX
            this.scene.tweens.add({
                targets: this,
                scale: { from: 1.2, to: 1 },
                duration: 200,
                yoyo: true
            });
        }
    }

    private showFeedback(text: string) {
        this.label.setText(text);
        this.scene.time.delayedCall(2000, () => {
            if (this.active) this.label.setText('DEALER');
        });
    }

    getInteractionPrompt(_player: Player): string {
        return "Press F to Sell";
    }

    canInteract(_player: Player): boolean {
        return true;
    }

    destroy(fromScene?: boolean) {
        if (this.label) this.label.destroy();
        super.destroy(fromScene);
    }
}
