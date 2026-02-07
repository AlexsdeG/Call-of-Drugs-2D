import { GameTest, TestRunner } from './testRunner';
import Phaser from 'phaser';
import { Player } from '../game/entities/Player';
import { WEAPON_DEFS } from '../config/constants';

const AmmoDepletionTest: GameTest = {
    name: 'Ammo Depletion',
    run: async (scene: Phaser.Scene) => {
        // Find player
        const player = scene.children.list.find(c => c instanceof Player) as Player;
        if (!player) {
            console.error('Player not found');
            return false;
        }

        const startAmmo = (player.weaponSystem as any).state.currentAmmo;
        
        // Reset lastFired to 0 to ensure fire logic passes
        (player.weaponSystem as any).state.lastFired = 0;
        
        // Trigger ONE fire event
        player.weaponSystem.trigger(10000);

        const endAmmo = (player.weaponSystem as any).state.currentAmmo;

        if (endAmmo !== startAmmo - 1) {
            console.error(`Ammo did not decrease. Start: ${startAmmo}, End: ${endAmmo}`);
            return false;
        }

        return true;
    }
};

const ReloadTest: GameTest = {
    name: 'Reload Logic',
    run: async (scene: Phaser.Scene) => {
        const player = scene.children.list.find(c => c instanceof Player) as Player;
        const system = player.weaponSystem as any;

        // Empty mag
        system.state.currentAmmo = 0;
        system.state.totalAmmo = 50;

        // Trigger Reload
        player.weaponSystem.reload(scene.time.now);

        if (!system.state.isReloading) {
            console.error('Reload state not set');
            return false;
        }

        // Simulate time passing (Hack internals)
        system.finishReload();

        if (system.state.currentAmmo !== WEAPON_DEFS.PISTOL.magSize) {
             console.error(`Mag not filled. Current: ${system.state.currentAmmo}`);
             return false;
        }

        return true;
    }
};

TestRunner.register(AmmoDepletionTest);
TestRunner.register(ReloadTest);