import { GameTest, TestRunner } from './testRunner';
import Phaser from 'phaser';
import { ProductionUnit } from '../game/entities/ProductionUnit';
import { Player } from '../game/entities/Player';
import { InventoryManager } from '../game/systems/InventoryManager';
import { useEmpireStore } from '../store/useEmpireStore';

const ProductionUnitLogicTest: GameTest = {
    name: 'Production Unit Logic',
    run: async (scene: Phaser.Scene) => {
        useEmpireStore.getState().resetSession();
        
        const unit = new ProductionUnit(scene, 100, 100);
        const player = new Player(scene, 0, 0, scene.physics.add.group());

        // 1. Initial State
        if ((unit as any).machineState !== 'IDLE') {
            console.error("Unit not IDLE on spawn");
            return false;
        }

        // 2. Start Processing (Hold F)
        // Simulate HOLDING F for 1100ms (threshold is 1000ms)
        unit.interact(player, 1100);

        if ((unit as any).machineState !== 'PROCESSING') {
             console.error("Unit did not switch to PROCESSING after interaction");
             return false;
        }

        // 3. Process Timer
        // Simulate 3500ms passing (processing time is 3000ms)
        unit.update(0, 3500);

        if ((unit as any).machineState !== 'READY') {
             console.error("Unit did not switch to READY after time passed");
             return false;
        }

        // 4. Collect
        unit.interact(player); // Instant click

        if ((unit as any).machineState !== 'IDLE') {
             console.error("Unit did not reset to IDLE after collection");
             return false;
        }

        if (!InventoryManager.hasItem('weed_packet')) {
             console.error("Inventory did not receive item");
             return false;
        }

        unit.destroy();
        player.destroy();
        return true;
    }
};

TestRunner.register(ProductionUnitLogicTest);
