import { GameTest, TestRunner } from './testRunner';
import Phaser from 'phaser';
import { InventoryManager } from '../game/systems/InventoryManager';
import { useEmpireStore, Item } from '../store/useEmpireStore';

const InventoryLogicTest: GameTest = {
    name: 'Inventory System Logic',
    run: async (_scene: Phaser.Scene) => {
        // Reset Store
        useEmpireStore.getState().resetSession();
        
        const testItem: Item = {
            id: 'test_drug',
            name: 'Test Drug',
            type: 'drug',
            illegal: true,
            weight: 5,
            quantity: 1,
            stackable: true
        };

        // 1. Add Item
        const added = InventoryManager.addItem(testItem);
        if (!added) {
            console.error("Failed to add valid item");
            return false;
        }

        if (!InventoryManager.hasItem(testItem.id)) {
            console.error("Inventory does not contain added item");
            return false;
        }

        // 2. Check Weight
        if (InventoryManager.getTotalWeight() !== 5) {
             console.error(`Weight Mismatch. Expected 5, Got ${InventoryManager.getTotalWeight()}`);
             return false;
        }

        // 3. Add Item exceding limit
        // Default max weight is 20 (from useEmpireStore). 
        // Add 4 more (Total 5 * 5 = 25 > 20)
        const heavyItem: Item = { ...testItem, id: 'heavy', weight: 16 };
        const addedHeavy = InventoryManager.addItem(heavyItem);
        
        if (addedHeavy) {
             console.error("Allowed adding item beyond max weight");
             return false;
        }

        // 4. Remove Item
        InventoryManager.removeItem(testItem.id, 1);
        if (InventoryManager.hasItem(testItem.id)) {
            console.error("Item still exists after removal");
            return false;
        }

        return true;
    }
};

TestRunner.register(InventoryLogicTest);
