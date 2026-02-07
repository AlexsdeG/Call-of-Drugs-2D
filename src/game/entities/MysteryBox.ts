import * as Phaser from 'phaser';

import { IInteractable } from '../interfaces/IInteractable';
import { Player } from './Player';
import { WEAPON_DEFS, POWERUP } from '../../config/constants';
import { SoundManager } from '../systems/SoundManager';

export class MysteryBox extends Phaser.Physics.Arcade.Sprite implements IInteractable {
    private static allBoxes: MysteryBox[] = [];
    private static activeBoxIndex: number = -1;

    private isActiveBox: boolean = false;
    private isRolling: boolean = false;
    private isPresenting: boolean = false; // "Ready to pickup" state
    
    // Config
    private cost: number = 950;
    private isFirst: boolean = false; 
    
    // Roll Logic
    private rollEvent?: Phaser.Time.TimerEvent;
    private weaponSprite: Phaser.GameObjects.Sprite;
    private lidSprite: Phaser.GameObjects.Sprite;
    
    private selectedWeaponKey: string | null = null;
    
    // Timer for pickup
    private pickupTimer?: Phaser.Time.TimerEvent;

    constructor(scene: Phaser.Scene, x: number, y: number, rotationDeg: number = 0, isFirst: boolean = false) {
        super(scene, x, y, 'mysterybox');
        
        scene.add.existing(this);
        scene.physics.add.existing(this, true); 
        
        this.isFirst = isFirst;
        
        // Static tracking
        MysteryBox.allBoxes.push(this);

        // Rotation
        this.setAngle(rotationDeg);
        
        // Fix Physics Body Size for Rotation (90 or 270 degrees)
        // Note: setAngle/setRotation does NOT rotate the arcade body. We must swap dimensions.
        if (Math.abs(rotationDeg) % 180 === 90) {
             this.body!.setSize(this.height, this.width);
             // Center offset adjustment if needed, but usually default origin (0.5) handles it if square.
             // If not square, we might need offset. Assuming 32x32 for now so no change needed?
             // Actually MysteryBox sprite might be non-square? Default 'mysterybox' logic.
        }

        // Calculate offsets based on rotation for "Top" items (Lid/Weapon)
        // 0 deg: Top is y-10
        // 90 deg: Top is x+10
        // 180 deg: Top is y+10
        // 270 deg: Top is x-10
        
        // Calculate offsets based on rotation for "Top" direction (Hinge)
        // Adjusting for 90 degree rotation to ensuring hinge is on the correct side (Left)
        // If rotation is 90 (Facing Right), Top/Back is Left (-X).
        // If rotation is 0 (Facing Down), Top/Back is Up (-Y).
        
        // We will compute vectors explicitly
        const rad = Phaser.Math.DegToRad(rotationDeg);
        
        const lidOffset = new Phaser.Math.Vector2(0, -10).rotate(rad);
        const weaponOffset = new Phaser.Math.Vector2(0, -20).rotate(rad);
        
        // Lid
        this.lidSprite = scene.add.sprite(x + lidOffset.x, y + lidOffset.y, 'mysterybox_lid');
        this.lidSprite.setDepth(this.depth + 1);
        this.lidSprite.setAngle(rotationDeg);
        
        // Weapon Preview Sprite (Hidden initially)
        this.weaponSprite = scene.add.sprite(x + weaponOffset.x, y + weaponOffset.y, 'pixel'); 
        this.weaponSprite.setTexture('wallbuy_texture');
        this.weaponSprite.setVisible(false);
        this.weaponSprite.setDepth(this.depth + 100); 
        this.weaponSprite.setAngle(rotationDeg);
        
        // Init State
        this.isActiveBox = false;
        this.updateVisuals();
    }
    
    public static initSystem() {
        if (MysteryBox.allBoxes.length > 0) {
            // Check for Priority Box
            const firstIndex = MysteryBox.allBoxes.findIndex(b => b.isFirst);
            
            if (firstIndex !== -1) {
                 MysteryBox.setActiveBox(firstIndex);
            } else {
                 if (MysteryBox.activeBoxIndex === -1) {
                    MysteryBox.setActiveBox(Phaser.Math.Between(0, MysteryBox.allBoxes.length - 1));
                 } else {
                     MysteryBox.updateAllBoxes();
                 }
            }
        }
    }
    
    public static reset() {
        MysteryBox.allBoxes = [];
        MysteryBox.activeBoxIndex = -1;
        
        MysteryBox.isFireSale = false;
        if (MysteryBox.fireSaleTimer) {
            MysteryBox.fireSaleTimer.remove(false);
            MysteryBox.fireSaleTimer = undefined;
        }
    }

    private static setActiveBox(index: number) {
        MysteryBox.activeBoxIndex = index;
        MysteryBox.updateAllBoxes();
    }

    private static updateAllBoxes() {
        MysteryBox.allBoxes.forEach((box, index) => {
            box.setActivity(index === MysteryBox.activeBoxIndex);
        });
    }

    public setActivity(active: boolean) {
        this.isActiveBox = active;
        this.updateVisuals();
    }

    private static isFireSale: boolean = false;
    private static fireSaleTimer?: Phaser.Time.TimerEvent;

    public static startFireSale(scene: Phaser.Scene) {
        if (MysteryBox.isFireSale) {
            // Reset existing timer if active
            if (MysteryBox.fireSaleTimer) {
                MysteryBox.fireSaleTimer.remove(false);
                // We will create a new one below
            }
        }

        MysteryBox.isFireSale = true;
        
        // Activate ALL boxes
        MysteryBox.allBoxes.forEach(box => box.setActivity(true));
        
        // 60s Timer
        MysteryBox.fireSaleTimer = scene.time.delayedCall(POWERUP.DURATION, () => {
             MysteryBox.endFireSale();
        });
    }

    public static endFireSale() {
        MysteryBox.isFireSale = false;
        // Revert to single active box
        // We need to keep the logic consistent: only one box should be active.
        MysteryBox.updateAllBoxes();
    }

    private updateVisuals() {
        // Base Tint
        const color = (this.isActiveBox || MysteryBox.isFireSale) ? 0xffffff : 0x555555;
        this.setTint(color);
        if (this.lidSprite) this.lidSprite.setTint(color);
        
        if (this.isActiveBox || MysteryBox.isFireSale) {
            // Reset position to closed state
            this.resetLidPosition();
        } 
    }
    
    private resetLidPosition() {
        // Ensure lid sprite exists before setting position
        if (!this.lidSprite) return;
        
        const rad = Phaser.Math.DegToRad(this.angle);
        const closedOffset = new Phaser.Math.Vector2(0, -10).rotate(rad);
        this.lidSprite.setPosition(this.x + closedOffset.x, this.y + closedOffset.y);
    }
    
    private getCost(): number {
        return MysteryBox.isFireSale ? 10 : this.cost; 
    }
    
    // ...



    public interact(player: Player, delta?: number) {
        // Enforce Single Press for Buy (Prevent accidental hold-to-buy)
        // For interactions that cost money or change state drastically, single press is safer.
        if (!player.isInteractJustDown()) return;

        // Allow interaction if active box OR fire sale is on
        const canUse = this.isActiveBox || MysteryBox.isFireSale;
        
        if (!canUse) return; // "Teddy bear moved" or inactive
        
        if (this.isRolling) return; // Busy
        
        if (this.isPresenting) {
            // PICK UP PHASE
            this.equipReward(player);
            return;
        }

        // BUY PHASE
        const currentCost = this.getCost();
        if (player.spendPoints(currentCost)) {
            this.startRoll(player);
        } else {
            SoundManager.play(this.scene, 'click', { volume: 0.5 });
        }
    }
    
    private startRoll(player: Player) {
        this.isRolling = true;
        
        // Calculate Open Position relative to rotation
        // "Open" means moving the lid further "up" (local Y) aka Backwards
        const rad = Phaser.Math.DegToRad(this.angle);
        const openOffset = new Phaser.Math.Vector2(0, -40).rotate(rad);
        
        // Open Lid
        this.scene.tweens.add({
            targets: this.lidSprite,
            x: this.x + openOffset.x,
            y: this.y + openOffset.y,
            duration: 500,
            ease: 'Back.out'
        });
        
        // Mock Roll Visualization: Flash generic sprite weapon
        this.weaponSprite.setVisible(true);
        this.weaponSprite.setAlpha(1);
        
        let switchCount = 0;
        const maxSwitches = 20; // 2 seconds approx
        
        this.rollEvent = this.scene.time.addEvent({
            delay: 100,
            repeat: maxSwitches,
            callback: () => {
                switchCount++;
                SoundManager.play(this.scene, 'click', { volume: 0.3, rate: 1.0 + (switchCount/10) });
                this.weaponSprite.setFlipX(!this.weaponSprite.flipX);
                
                if (switchCount >= maxSwitches) {
                    this.finishRoll(player);
                }
            }
        });
    }

    private finishRoll(player: Player) {
        this.isRolling = false;
        
        // Teddy Bear Check (If multiple boxes exist)
        // In Fire Sale, typically Teddy Bear is disabled or behaves differently? 
        // For simplicity, let's keep normal logic but maybe reduce chance in Fire Sale?
        // User didn't specify, so normal logic.
        // Teddy Bear Check (If multiple boxes exist)
        // No Teddy Bear during Fire Sale
        if (!MysteryBox.isFireSale && MysteryBox.allBoxes.length > 1 && Math.random() < 0.2) {
             // MOVE BOX
             this.handleTeddyBear(player);
             return;
        }

        // Select Weapon
        const keys = Object.keys(WEAPON_DEFS) as (keyof typeof WEAPON_DEFS)[];
        const randomKey = Phaser.Utils.Array.GetRandom(keys);
        
        this.selectedWeaponKey = randomKey;
        const def = WEAPON_DEFS[randomKey];
        
        // Present
        this.isPresenting = true;
        
        // Set distinct visual for weapon
        this.weaponSprite.setTint(0x00ff00); // Green glow?
        
        // Slow Close Animation (Timer Visual)
        // Lid slowly closes over 5 seconds
        const rad = Phaser.Math.DegToRad(this.angle);
        const closedOffset = new Phaser.Math.Vector2(0, -10).rotate(rad);
        
        this.scene.tweens.add({
            targets: this.lidSprite,
            x: this.x + closedOffset.x,
            y: this.y + closedOffset.y,
            duration: 5000,
            ease: 'Linear'
        });

        // Start Pickup Timer (5s)
        this.pickupTimer = this.scene.time.delayedCall(5000, () => {
             this.resetToIdle();
        });
    }
    
    private isTeddyBear: boolean = false;

    private handleTeddyBear(player: Player) {
        // Visuals...
        this.weaponSprite.setTint(0xff0000); // Red
        SoundManager.play(this.scene, 'click'); // Replace with laugh?
        
        // Refund Cost
        player.addPoints(this.cost); // Actually in CoD you usually lose the money, but keep refund for now or remove if requested. User didn't specify refund change.
        
        this.isTeddyBear = true;
        
        // Faster sequence
        this.scene.time.delayedCall(800, () => {
             // Pass turn to next box logic
             
             // Ensure we pick a DIFFERENT box
             const currentIndex = MysteryBox.activeBoxIndex;
             let newIndex = currentIndex;
             
             // Safety loop
             const available = MysteryBox.allBoxes.map((_, i) => i).filter(i => i !== currentIndex);
             if (available.length > 0) {
                 newIndex = Phaser.Utils.Array.GetRandom(available);
             }
             
             MysteryBox.setActiveBox(newIndex);
             
             // Instant Close / Hide
             this.resetToIdle(true);
        });
    }
    
    private equipReward(player: Player) {
        if (this.selectedWeaponKey) {
            // Max Ammo Check
            if (player.weaponSystem.hasWeapon(this.selectedWeaponKey)) {
                player.weaponSystem.refillAmmo(this.selectedWeaponKey);
                SoundManager.play(this.scene, 'weapon_pickup'); 
            } else {
                player.equipWeapon(this.selectedWeaponKey);
                SoundManager.play(this.scene, 'weapon_pistol_reload'); 
            }
        }
        // INSTANTLY CLOSE
        this.resetToIdle(true);
    }
    
    private resetToIdle(instant: boolean = false) {
        this.isPresenting = false;
        this.isTeddyBear = false;
        this.selectedWeaponKey = null;
        this.weaponSprite.setVisible(false);
        this.weaponSprite.clearTint();
        
        // Close Lid (Return to base offset)
        const rad = Phaser.Math.DegToRad(this.angle);
        const closedOffset = new Phaser.Math.Vector2(0, -10).rotate(rad);
        
        const targetX = this.x + closedOffset.x;
        const targetY = this.y + closedOffset.y;

        if (instant) {
            this.lidSprite.setPosition(targetX, targetY);
            // Ensure no lingering tween
            this.scene.tweens.killTweensOf(this.lidSprite);
        } else {
            this.scene.tweens.add({
                targets: this.lidSprite,
                x: targetX,
                y: targetY,
                duration: 500,
                ease: 'Bounce.out'
            });
        }
        
        if (this.pickupTimer) this.pickupTimer.remove(false);
    }

    public getInteractionPrompt(player: Player): { text: string; enabled: boolean } | string {
        const canUse = this.isActiveBox || MysteryBox.isFireSale;
        
        if (!canUse) {
            // Technically shouldn't be called if not closest/canInteract, but for robust UI
            return { text: 'Box Moved', enabled: false };
        }
        
        if (this.isTeddyBear) {
             return { text: 'Teddy Bear', enabled: false };
        }
        
        if (this.isRolling) {
             return { text: 'Rolling...', enabled: false };
        }
        
        if (this.isPresenting && this.selectedWeaponKey) {
            const def = WEAPON_DEFS[this.selectedWeaponKey as keyof typeof WEAPON_DEFS];
            return { text: `Press F to take ${def.name}`, enabled: true };
        }
        
        const currentCost = this.getCost();
        const canAfford = player.points >= currentCost;
        return { 
            text: `Press F for Mystery Box [${currentCost}]`, 
            enabled: canAfford 
        };
    }

    public canInteract(player: Player): boolean {
        // Check activity or fire sale
        const canUse = this.isActiveBox || MysteryBox.isFireSale;
        
        if (!canUse) return false;
        
        if (this.isRolling) return false; // Hide prompt while rolling
        if (this.isTeddyBear) return false; // Check comments above
        if (this.isTeddyBear) return true;
        
        return true; 
    }

    destroy(fromScene?: boolean): void {
        if (this.lidSprite) this.lidSprite.destroy();
        if (this.weaponSprite) this.weaponSprite.destroy();
        if (this.rollEvent) this.rollEvent.remove(false);
        if (this.pickupTimer) this.pickupTimer.remove(false);
        
        // Remove from static list
        const index = MysteryBox.allBoxes.indexOf(this);
        if (index > -1) {
            MysteryBox.allBoxes.splice(index, 1);
        }
        
        super.destroy(fromScene);
    }

    public setDepth(value: number): this {
        super.setDepth(value);
        if (this.lidSprite) this.lidSprite.setDepth(value + 1);
        if (this.weaponSprite) this.weaponSprite.setDepth(value + 5); 
        return this;
    }
}
