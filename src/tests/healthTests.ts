import { GameTest, TestRunner } from './testRunner';
import Phaser from 'phaser';
import { Player } from '../game/entities/Player';

const HealthRegenTest: GameTest = {
    name: 'Player Regeneration Logic',
    run: async (scene: Phaser.Scene) => {
        // Create Player
        const player = new Player(scene, 100, 100, scene.physics.add.group());
        
        // Initial State
        if (player.health !== player.maxHealth) {
            console.error(`Initial Health Mismatch: ${player.health}/${player.maxHealth}`);
            return false;
        }

        // 1. Take Damage
        player.takeDamage(50);
        if (player.health !== 50) {
            console.error("Player did not take damage correctly");
            return false;
        }

        // 2. Advance Time < 5s (e.g., 4s)
        const start = scene.time.now;
        // Mock time passing by calling update with simulated time
        // Note: Player.takeDamage sets lastHitTime to scene.time.now
        
        // We need to simulate time passing in the update loop
        // Let's manually invoke update with future timestamps
        
        // Move ahead 4 seconds
        const timeAt4s = start + 4000;
        player.update(timeAt4s, 16);
        
        if (player.health !== 50) {
            console.error("Player regenerated too early!");
            return false;
        }

        // 3. Advance to 5.1s (Regen Start)
        const timeAt5s = start + 5100;
        player.update(timeAt5s, 16);
        
        // Should have healed 10 hp
        if (player.health !== 60) {
            console.error(`Player did not regenerate after 5s. Health: ${player.health}`);
            return false;
        }

        // 4. Advance 1s more (Next Tick)
        const timeAt6s = start + 6100;
        player.update(timeAt6s, 16);
        
        if (player.health !== 70) {
            console.error(`Player did not regenerate second tick. Health: ${player.health}`);
            return false;
        }

        // 5. Interruption
        player.takeDamage(10); // Heatlh 70 -> 60
        // Last Hit reset to timeAt6s (effectively, since we called takeDamage which uses scene.time.now? 
        // WAIT. takeDamage uses scene.time.now.
        // If we are simulating time in update(time), we must ensure scene.time.now is also synced or we manually update lastHitTime if we can't control scene.time.
        // Test environment usually has a real running scene. 
        // But here we are just calling update manually with a number.
        // `takeDamage` implementation: this.lastHitTime = this.scene.time.now;
        
        // ISSUE: scene.time.now is NOT updated by us passing 'time' to update().
        // We must mock or control `scene.time.now` if we want `takeDamage` to pick up the simulated time.
        // Or we manually set lastHitTime if strictly testing logic.
        // Since `lastHitTime` is private, we can't easy set it without cast.
        
        // Let's assume we can cast to any to fix the test logic.
        (player as any).lastHitTime = timeAt6s; 
        
        // Now advance 2s from hit keys (timeAt6s + 2000)
        player.update(timeAt6s + 2000, 16);
        
        // Should NOT have regenerated yet (needs 5s)
        if (player.health !== 60) {
            console.error(`Player regenerated too early after interruption! Health: ${player.health}`);
            return false;
        }
        
        // Advance to 5s post-hit
        player.update(timeAt6s + 5100, 16);
        if (player.health !== 70) {
             console.error(`Player failed to resume regen after interruption. Health: ${player.health}`);
             return false;
        }

        player.destroy();
        return true;
    }
};

TestRunner.register(HealthRegenTest);
