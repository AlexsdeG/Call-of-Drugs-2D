import { GameTest } from './testRunner';
import { NpcDealer } from '../game/entities/NpcDealer';
import { useEmpireStore } from '../store/useEmpireStore';
import { Player } from '../game/entities/Player';

export const dealerTests: GameTest[] = [
    {
        name: "Dealer: Sell Illegal Items",
        run: async (scene) => {
            const dealer = new NpcDealer(scene, 100, 100);
            const player = new Player(scene, 100, 100);
            
            // Setup Inventory
            useEmpireStore.getState().resetSession();
            useEmpireStore.getState().addItem({
                id: 'weed', name: 'Weed', type: 'drug', illegal: true, weight: 1, quantity: 5
            });
            useEmpireStore.getState().addItem({
                id: 'wood', name: 'Wood', type: 'material', illegal: false, weight: 1, quantity: 10
            });

            const initialCash = useEmpireStore.getState().cash;
            
            // Interact
            dealer.interact(player);

            const afterCash = useEmpireStore.getState().cash;
            const inventory = useEmpireStore.getState().inventory;
            
            const weed = inventory.find(i => i.id === 'weed');
            const wood = inventory.find(i => i.id === 'wood');

            dealer.destroy();
            player.destroy();

            if (weed) {
                console.error("Illegal item 'weed' was not removed.");
                return false;
            }
            if (!wood || wood.quantity !== 10) {
                 console.error("Legal item 'wood' was affected.");
                 return false;
            }
            if (afterCash <= initialCash) {
                 console.error("Cash did not increase.");
                 return false;
            }

            return true;
        }
    },
    {
        name: "Dealer: No Product",
        run: async (scene) => {
            const dealer = new NpcDealer(scene, 200, 200);
            const player = new Player(scene, 200, 200);
            
            useEmpireStore.getState().resetSession();
            const initialCash = useEmpireStore.getState().cash;

            dealer.interact(player);

            const afterCash = useEmpireStore.getState().cash;
            
            dealer.destroy();
            player.destroy();

            if (afterCash !== initialCash) {
                 console.error("Cash changed without product.");
                 return false;
            }
            
            return true;
        }
    }
];

import { TestRunner } from './testRunner';
TestRunner.registerTests(dealerTests);
