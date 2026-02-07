import { GameTest, TestRunner } from './testRunner';
import Phaser from 'phaser';
import { PathfindingManager } from '../game/systems/PathfindingManager';
import { Police } from '../game/entities/Police';
import { Player } from '../game/entities/Player';

const PathfindingGridTest: GameTest = {
    name: 'Pathfinding Grid Generation',
    run: async (scene: Phaser.Scene) => {
        // Mock a simple Tilemap and Manager
        const map = scene.make.tilemap({ tileWidth: 32, tileHeight: 32, width: 10, height: 10 });
        const tileset = map.addTilesetImage('tileset');
        if (!tileset) {
            console.error("Failed to load tileset for test");
            return false;
        }
        
        // Create wall layer with one wall at (5,5)
        const wallLayer = map.createBlankLayer('Walls', tileset);
        if (wallLayer) {
            wallLayer.putTileAt(1, 5, 5); // ID 1 = Wall
        }

        const pf = new PathfindingManager(scene);
        pf.buildGrid(map, []); // No extra obstacles

        // Verify grid value
        // Accessing private grid via casting (for testing only)
        const grid = (pf as any).grid;
        if (grid[5][5] !== 1) {
            console.error("Wall at 5,5 not marked in grid.");
            return false;
        }
        if (grid[0][0] !== 0) {
            console.error("Floor at 0,0 marked as wall.");
            return false;
        }

        return true;
    }
};

const PoliceStateTest: GameTest = {
    name: 'Police State Machine',
    run: async (scene: Phaser.Scene) => {
        // Need a player for target
        const player = new Player(scene, 0, 0, scene.physics.add.group());
        const pf = new PathfindingManager(scene);
        
        // New signature requires barricade group and wall layer (optional)
        // We pass undefined/null for test
        const police = new Police(scene, 100, 100, player, pf);

        // Initial State should be SPAWN
        if ((police as any).aiState !== 'SPAWN') {
            console.error(`Initial state was ${(police as any).aiState}, expected SPAWN`);
            return false;
        }

        // Simulate Update
        if (!scene.tweens.isTweening(police)) {
             console.error("Police spawn tween not active.");
             return false;
        }

        police.destroy();
        player.destroy();
        return true;
    }
};

TestRunner.register(PathfindingGridTest);
TestRunner.register(PoliceStateTest);