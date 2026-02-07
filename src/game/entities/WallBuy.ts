import * as Phaser from 'phaser';

import { IInteractable } from '../interfaces/IInteractable';
import { Player } from '../entities/Player';
import { WEAPON_DEFS } from '../../config/constants';
import { SoundManager } from '../systems/SoundManager';
import { EventBus } from '../EventBus';

export class WallBuy extends Phaser.GameObjects.Sprite implements IInteractable {
    private weaponKey: string;
    private baseCost: number;
    
    private isAmmoRefill: boolean = false;
    private currentCost: number = 0;
    
    // UI
    private promptText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, weaponKey: string, cost: number) {
        // Handle MapManager calling construction vs partial
        super(scene, x, y, 'wallbuy_texture');
        
        scene.add.existing(this);
        // Note: MapManager usually adds to Physics Group, which handles body creation.
        // But if we want standalone, we can add it here. MainGameScene handles it via Group.
        
        this.setAlpha(0.6);
        this.setDisplaySize(width, height);
        this.setDepth(1); // Wall decal depth
        
        this.weaponKey = weaponKey;
        this.baseCost = cost;
        this.currentCost = cost;
        
        // We create text here but manage visibility via Interaction Prompt system mostly
        // But the user requested "Text Z Index" fix, implying it might be obscured.
        
        this.promptText = scene.add.text(x, y - 50, '', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#000000aa',
            padding: { x: 4, y: 2 }
        });
        this.promptText.setOrigin(0.5);
        this.promptText.setDepth(1000); // High Z-Index
        this.promptText.setVisible(false);
    }

    public interact(player: Player, delta?: number) {
        if (!player.isInteractJustDown()) return;

        // Pre-check for Ammo Full to avoid spending points
        if (this.isAmmoRefill && player.weaponSystem.isAmmoFull(this.weaponKey)) {
            EventBus.emit('show-notification', "Max Ammo!");
            return;
        }

        if (player.spendPoints(this.currentCost)) {
            if (this.isAmmoRefill) {
                player.weaponSystem.refillAmmo(this.weaponKey);
                SoundManager.play(this.scene, 'weapon_pickup'); 
                this.showFeedback("Ammo Refilled");
            } else {
                player.equipWeapon(this.weaponKey);
                SoundManager.play(this.scene, 'weapon_pickup'); 
                this.showFeedback("Weapon Purchased");
            }
        } else {
             SoundManager.play(this.scene, 'click', { volume: 0.5 });
        }
    }
    
    private showFeedback(text: string) {
        const floatTxt = this.scene.add.text(this.x, this.y - 60, text, {
             fontFamily: "monospace", fontSize: "14px", color: "#ffff00", 
             stroke: "#000000", strokeThickness: 2
        }).setOrigin(0.5).setDepth(2000);
        
        this.scene.tweens.add({ 
            targets: floatTxt, 
            y: this.y - 100, 
            alpha: 0, 
            duration: 1000, 
            onComplete: () => floatTxt.destroy() 
        });
    }

    public getInteractionPrompt(player: Player): { text: string; enabled: boolean } | string {
       const weaponName = WEAPON_DEFS[this.weaponKey as keyof typeof WEAPON_DEFS]?.name || this.weaponKey;
       const canAfford = player.points >= this.currentCost;
       
       if (this.isAmmoRefill) {
           if (player.weaponSystem.isAmmoFull(this.weaponKey)) {
               return { text: "Max Ammo", enabled: false };
           }
           return { 
               text: `Press F for Ammo [${this.currentCost}]`,
               enabled: canAfford
           };
       }
       return {
           text: `Press F for ${weaponName} [${this.currentCost}]`,
           enabled: canAfford
       };
    }

    public canInteract(player: Player): boolean {
        // Dynamic Check
        const has = player.weaponSystem.hasWeapon(this.weaponKey);
        
        if (has) {
             this.isAmmoRefill = true;
             this.currentCost = Math.floor(this.baseCost / 2);
        } else {
             this.isAmmoRefill = false;
             this.currentCost = this.baseCost;
        }

        return true; 
    }
}
