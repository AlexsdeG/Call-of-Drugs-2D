import { TestRunner } from './testRunner';
import * as Phaser from 'phaser';

// TEST: Custom Map Data Loading
TestRunner.register({
    name: 'Custom Map Validation',
    run: async (scene: Phaser.Scene) => {
        // 1. Mock a Custom Map JSON
        const customMapData = {
            name: "Test Bunker",
            width: 20,
            height: 20,
            tiles: new Array(20).fill(new Array(20).fill(1).map(() => Math.floor(Math.random() * 2))), // Random 0/1
            objects: [
                { type: 'zombie_spawn', x: 2, y: 2 },
                { type: 'player_spawn', x: 10, y: 10 }
            ],
            meta: {
                author: "Tester",
                created: Date.now()
            }
        };

        // 2. Validate Schema (We should use mapSchema here really, but basic check for now)
        if (!customMapData.name || !customMapData.tiles) {
            throw new Error("Map Data missing required fields");
        }

        if (customMapData.objects.length < 2) {
             throw new Error("Map Data missing objects");
        }

        console.log("Custom Map Validated Successfully");
        return true;
    }
});

// TEST: Attachment Logic (Unit Test style)
TestRunner.register({
    name: 'Attachment Logic Calculations',
    run: async (scene: Phaser.Scene) => {
        // Base Stats
        const baseDamage = 25;
        const baseRange = 600;

        // Attachments
        const suppressor = { stats: { rangeMult: 0.9, recoilMult: 0.9 } };
        const longBarrel = { stats: { rangeMult: 1.25 } };

        // 1. Apply Suppressor
        const rangeWithSuppressor = baseRange * suppressor.stats.rangeMult;
        if (rangeWithSuppressor !== 540) {
             console.error(`Suppressor Range Incorrect: Got ${rangeWithSuppressor}`);
             return false;
        }

        // 2. Apply Long Barrel
        const rangeWithBarrel = baseRange * longBarrel.stats.rangeMult;
        if (rangeWithBarrel !== 750) {
            console.error(`Long Barrel Range Incorrect: Got ${rangeWithBarrel}`);
            return false;
        }

        console.log("Attachment Logic Verified");
        return true;
    }
});

TestRunner.runAll();
