import Phaser from 'phaser';
import { WeaponAttributes, WeaponState } from '../types/WeaponTypes';
import { EventBus } from '../EventBus';
import { WEAPON_DEFS } from '../../config/constants';
import { SoundManager } from './SoundManager';
import { Projectile } from '../entities/Projectile';
import { PerkType } from '../types/PerkTypes'; 
import { PERK } from '../../config/constants';
import { ProfileService } from '../services/ProfileService';
import { ATTACHMENTS } from '../../config/attachmentDefs';

interface WeaponEntry {
    key: keyof typeof WEAPON_DEFS;
    attributes: WeaponAttributes;
    state: WeaponState;
}

export class WeaponSystem {
    private scene: Phaser.Scene;
    private owner: Phaser.Physics.Arcade.Sprite; 
    
    // Inventory
    private inventory: (WeaponEntry | null)[] = [null, null, null]; // Slot 0, 1, 2
    private activeSlot: number = 0;
    
    // Perks
    private perks: Set<PerkType> = new Set();

    // Visuals
    private recoilOffset: number = 0;
    private swayOffset: number = 0;
    
    // Components
    private bulletGroup: Phaser.Physics.Arcade.Group;
    private muzzleFlash: Phaser.GameObjects.Sprite;
    
    // Environment
    private wallLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    private checkLine: Phaser.Geom.Line = new Phaser.Geom.Line(); 

    constructor(scene: Phaser.Scene, owner: Phaser.Physics.Arcade.Sprite, bulletGroup: Phaser.Physics.Arcade.Group) {
        this.scene = scene;
        this.owner = owner;
        this.bulletGroup = bulletGroup;
        
        // Initialize Muzzle Flash
        this.muzzleFlash = this.scene.add.sprite(0, 0, 'muzzleflash');
        this.muzzleFlash.setVisible(false);
        this.muzzleFlash.setDepth(15);
        this.muzzleFlash.setOrigin(0, 0.5);
        this.muzzleFlash.setScale(0.5);
    }
    
    public initDefault(weaponKey: keyof typeof WEAPON_DEFS) {
        // Default pistol goes to Slot 3 (Index 2)
        this.equip(weaponKey, 2); 
    }

    public equip(weaponKey: keyof typeof WEAPON_DEFS, forcedSlot?: number) {
        const def = WEAPON_DEFS[weaponKey];
        if (!def) {
             console.warn(`Weapon key ${weaponKey} not found.`);
             return;
        }

        // Apply Attachments
        const profile = ProfileService.getProfile();
        const loadout = profile?.weaponStats[weaponKey]?.equippedAttachments || {};
        
        // Multipliers
        let damageMult = 1;
        let rangeMult = 1;
        let spreadMult = 1;
        let recoilMult = 1;
        let fireRateMult = 1;
        let magSizeMult = 1;
        let reloadTimeMult = 1;
        let speedMult = 1; // Movement speed not yet on weapon attributes but could be added

        Object.values(loadout).forEach(attId => {
            const attDef = ATTACHMENTS[attId];
            if (attDef && attDef.stats) {
                if (attDef.stats.damageMult) damageMult *= attDef.stats.damageMult;
                if (attDef.stats.rangeMult) rangeMult *= attDef.stats.rangeMult;
                if (attDef.stats.spreadMult) spreadMult *= attDef.stats.spreadMult;
                if (attDef.stats.recoilMult) recoilMult *= attDef.stats.recoilMult;
                if (attDef.stats.fireRateMult) fireRateMult *= attDef.stats.fireRateMult;
                if (attDef.stats.magSizeMult) magSizeMult *= attDef.stats.magSizeMult;
                if (attDef.stats.reloadTimeMult) reloadTimeMult *= attDef.stats.reloadTimeMult;
            }
        });

        // Apply to Base Attributes for this instance
        const modifiedAttributes = { ...def, key: weaponKey }; // Injecy Key
        modifiedAttributes.damage *= damageMult;
        modifiedAttributes.range *= rangeMult;
        modifiedAttributes.spread *= spreadMult;
        modifiedAttributes.recoil *= recoilMult;
        modifiedAttributes.fireRate /= fireRateMult; // Delay decreases as rate increases? No, fireRate is delay ms. higher rate = lower delay. 
                                                     // Wait, usually Rate is RPM. If fireRate is delay in ms, then Multiplier > 1 means FASTER fire, so DELAY should be LOWER.
                                                     // So fireRate (delay) /= mult. Correct.
        modifiedAttributes.magSize = Math.floor(modifiedAttributes.magSize * magSizeMult);
        modifiedAttributes.reloadTime *= reloadTimeMult; // Lower is better

        const newEntry: WeaponEntry = {
            key: weaponKey,
            attributes: modifiedAttributes,
            state: {
                currentAmmo: modifiedAttributes.magSize,
                totalAmmo: modifiedAttributes.magSize * 4,
                maxTotalAmmo: modifiedAttributes.magSize * 4,
                lastFired: 0,
                isReloading: false,
                reloadStartTime: 0
            }
        };

        let targetSlot = -1;

        // 1. Forced Slot (e.g. init)
        if (forcedSlot !== undefined) {
             targetSlot = forcedSlot;
        } 
        else {
            // 2. Auto-Logic
            // Rule: Slot 3 (Index 2) is SMALL only.
            // Rule: Slot 1 & 2 (Index 0 & 1) are ANY.
            
            // 2a. Check if we already have it? (Simpler: Just Ammo refill? - Skipping for now as requested "equip")
            
            // 2b. Try to fill EMPTY slot first
            if (def.type === 'SMALL' && this.inventory[2] === null) targetSlot = 2; // Pref small slot
            else if (this.inventory[0] === null) targetSlot = 0;
            else if (this.inventory[1] === null) targetSlot = 1;
            
            // 2c. If no empty, replace ACTIVE if valid
            if (targetSlot === -1) {
                 const current = this.inventory[this.activeSlot];
                 
                 // Can we put it here?
                 // If active is Slot 3 (2), and new is LARGE, we CANNOT.
                 // Otherwise we can.
                 if (this.activeSlot === 2 && def.type === 'LARGE') {
                     // Fallback: Swap with Slot 1 (0) 
                     targetSlot = 0;
                 } else {
                     targetSlot = this.activeSlot;
                 }
            }
        }
        
        // Equip
        this.inventory[targetSlot] = newEntry;
        
        // Switch to it immediately
        this.switchWeapon(targetSlot);
        
        // UI Feedback
        EventBus.emit('weapon-switch', def.name);
    }

    public switchWeapon(slotIndex: number) {
        if (slotIndex < 0 || slotIndex > 2) return;
        
        const entry = this.inventory[slotIndex];
        if (!entry) return; // Cannot switch to empty hand
        
        // Cancel reload of previous if any?
        const prev = this.getActiveEntry();
        if (prev && prev.state.isReloading) {
            prev.state.isReloading = false; // Cancel reload
        }

        this.activeSlot = slotIndex;
        
        // Play Swap Sound?
        // SoundManager.play(this.scene, 'draw');
        
        // UI Feedback
        EventBus.emit('weapon-switch', entry.attributes.name);
        this.emitStats();
    }
    
    public cycleWeapon(delta: number) {
        // delta > 0 (Up) -> Next, delta < 0 (Down) -> Prev
        const direction = delta > 0 ? 1 : -1;
        
        // Find next non-null slot
        let nextSlot = this.activeSlot;
        let attempts = 0;
        
        do {
            nextSlot = (nextSlot + direction + 3) % 3; // +3 handles negative mod
            attempts++;
        } while (this.inventory[nextSlot] === null && attempts < 3);
        
        if (nextSlot !== this.activeSlot && this.inventory[nextSlot] !== null) {
            this.switchWeapon(nextSlot);
        }
    }

    private getActiveEntry(): WeaponEntry | null {
        return this.inventory[this.activeSlot];
    }
    
    public getActiveWeaponStats(): WeaponAttributes | null {
        return this.getActiveEntry()?.attributes || null;
    }

    public hasWeapon(key: string): boolean {
        return this.inventory.some(entry => entry && entry.key === key);
    }

    public isAmmoFull(key: string): boolean {
        const entry = this.inventory.find(e => e && e.key === key);
        if (!entry) return false;
        return entry.state.totalAmmo >= entry.state.maxTotalAmmo;
    }

    public refillAmmo(key: string) {
        const entry = this.inventory.find(e => e && e.key === key);
        if (entry) {
            // Refill Reserve Only (Stockpile)
            entry.state.totalAmmo = entry.state.maxTotalAmmo;
            
            // Do NOT touch currentAmmo (Mag) as per user request
            // entry.state.currentAmmo = entry.attributes.magSize; 
            
            entry.state.isReloading = false;
            this.emitStats();
        }
    }
    
    public refillAllAmmo() {
        this.inventory.forEach(entry => {
            if (entry) {
                // Refill Reserve Only to its specific Max (PaP aware)
                entry.state.totalAmmo = entry.state.maxTotalAmmo;
                
                // entry.state.currentAmmo = entry.attributes.magSize; 
                entry.state.isReloading = false;
            }
        });
        this.emitStats();
    }

    public onPerkAcquired(perk: PerkType) {
        this.perks.add(perk);
    }
    
    public setWalls(wallLayer: Phaser.Tilemaps.TilemapLayer) {
        this.wallLayer = wallLayer;
    }

    public update(time: number, delta: number) {
        const entry = this.getActiveEntry();
        if(!entry) return;

        // 1. Handle Reload
        if (entry.state.isReloading) {
            let reloadDuration = entry.attributes.reloadTime;
            if (this.perks.has(PerkType.SPEED_COLA)) {
                reloadDuration *= PERK.SPEED_COLA_RELOAD_MULTIPLIER;
            }

            if (time >= entry.state.reloadStartTime + reloadDuration) {
                this.finishReload(entry);
            }
        }

        // 2. Recover Recoil
        if (this.recoilOffset > 0) {
            this.recoilOffset = Phaser.Math.Linear(this.recoilOffset, 0, 0.1);
        }

        // 3. Calculate Sway
        const isMoving = this.owner.body?.velocity.length() ?? 0 > 0;
        const swaySpeed = isMoving ? 0.01 : 0.002;
        const swayAmount = isMoving ? 0.1 : 0.02; 
        this.swayOffset = Math.sin(time * swaySpeed) * swayAmount;

        // 4. Update Muzzle Flash Position
        const gunLength = entry.attributes.barrelLength - this.recoilOffset;
        const flashX = this.owner.x + Math.cos(this.owner.rotation) * gunLength;
        const flashY = this.owner.y + Math.sin(this.owner.rotation) * gunLength;
        
        this.muzzleFlash.setPosition(flashX, flashY);
        this.muzzleFlash.setRotation(this.owner.rotation);
    }

    public trigger(time: number) {
        const entry = this.getActiveEntry();
        if(!entry) return;

        if (entry.state.isReloading) return;
        
        let fireDelay = entry.attributes.fireRate;
        if (this.perks.has(PerkType.DOUBLE_TAP)) {
            fireDelay *= PERK.DOUBLE_TAP_FIRERATE_MULTIPLIER;
        }

        if (time < entry.state.lastFired + fireDelay) return;

        if (entry.state.currentAmmo <= 0) {
            SoundManager.play(this.scene, 'click', { volume: 0.5 }); 
            if (entry.state.totalAmmo > 0) this.reload(time);
            return;
        }

        this.fire(time, entry);
    }

    public reload(time: number) {
        const entry = this.getActiveEntry();
        if (!entry) return;

        if (entry.state.isReloading || entry.state.currentAmmo === entry.attributes.magSize) return;
        if (entry.state.totalAmmo <= 0) return;

        entry.state.isReloading = true;
        entry.state.reloadStartTime = time;
        
        // Dynamic sound based on category?
        let sound = 'weapon_pistol_reload';
        if (entry.attributes.category === 'RIFLE') sound = 'weapon_rifle_reload';
        // Add more...
        
        SoundManager.play(this.scene, sound, { volume: 0.6 });
        this.emitStats();
    }

    private finishReload(entry: WeaponEntry) {
        const needed = entry.attributes.magSize - entry.state.currentAmmo;
        const toTake = Math.min(needed, entry.state.totalAmmo);
        
        entry.state.currentAmmo += toTake;
        entry.state.totalAmmo -= toTake;
        entry.state.isReloading = false;
        
        this.emitStats();
    }

    private fire(time: number, entry: WeaponEntry) {
        entry.state.currentAmmo--;
        entry.state.lastFired = time;

        let sound = 'weapon_pistol_fire';
        if (entry.attributes.category === 'RIFLE') sound = 'weapon_rifle_fire';
         // Add more...
        SoundManager.play(this.scene, sound, { volume: 0.8 });

        // Recoil
        this.recoilOffset = entry.attributes.recoil;
        this.scene.cameras.main.shake(50, 0.002);

        // Muzzle Flash
        this.muzzleFlash.setVisible(true);
        this.muzzleFlash.setAlpha(1);
        this.muzzleFlash.setFlipY(Math.random() > 0.5);
        this.scene.time.delayedCall(50, () => {
            this.muzzleFlash.setVisible(false);
        });

        // Ballistics Loop
        const count = entry.attributes.bulletCount || 1;
        
        // Reuse physics checks
        const baseAngle = this.owner.rotation;
        
        for (let i = 0; i < count; i++) {
             const spreadRad = Phaser.Math.DegToRad((Math.random() - 0.5) * entry.attributes.spread);
             const finalAngle = baseAngle + this.swayOffset + spreadRad;
             
             let gunTipX = this.owner.x + Math.cos(baseAngle) * entry.attributes.barrelLength;
             let gunTipY = this.owner.y + Math.sin(baseAngle) * entry.attributes.barrelLength;

             // Wall check (simplified)
              if (this.wallLayer) {
                const tile = this.wallLayer.getTileAtWorldXY(gunTipX, gunTipY);
                if (tile && (tile.canCollide || tile.index > 0)) {
                    gunTipX = this.owner.x;
                    gunTipY = this.owner.y;
                }
             }

             const bullet = this.bulletGroup.get(gunTipX, gunTipY) as Projectile;
             if (bullet) {
                bullet.fire(gunTipX, gunTipY, finalAngle, entry.attributes.bulletSpeed, entry.attributes, this.wallLayer);
             }
        }

        this.emitStats();
    }

    public emitStats() {
        const entry = this.getActiveEntry();
        if (!entry) {
             EventBus.emit('weapon-update', {
                ammo: 0, maxAmmo: 0, isReloading: false
             });
             return;
        }
        
        EventBus.emit('weapon-update', {
            ammo: entry.state.currentAmmo,
            maxAmmo: entry.state.totalAmmo,
            isReloading: entry.state.isReloading
        });
    }

    public upgradeCurrentWeapon() {
        const entry = this.getActiveEntry();
        if (!entry) return;

        // Visual Change
        entry.attributes.name += ' (PaP)';
        
        // Stat Boosts
        entry.attributes.damage *= 2;
        entry.attributes.magSize = Math.floor(entry.attributes.magSize * 1.5);
        // Update State
        entry.state.maxTotalAmmo = entry.attributes.magSize * 6; // Limit increase
        entry.state.totalAmmo = entry.state.maxTotalAmmo; // Fill it up on upgrade
        
        // Fill ammo
        entry.state.currentAmmo = entry.attributes.magSize;
        
        // Emit update
        EventBus.emit('weapon-switch', entry.attributes.name);
        this.emitStats();
    }
}