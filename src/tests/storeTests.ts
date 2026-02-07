import { useEmpireStore } from '../store/useEmpireStore';
import { GameTest } from './testRunner';

export const storeTests: GameTest[] = [
    {
        name: 'Store: Initial State',
        run: async () => {
            const state = useEmpireStore.getState();
            if (state.cash !== 100) throw new Error(`Initial cash should be 100, got ${state.cash}`);
            if (state.bank !== 0) throw new Error(`Initial bank should be 0, got ${state.bank}`);
            if (state.heat !== 0) throw new Error(`Initial heat should be 0, got ${state.heat}`);
            if (state.day !== 1) throw new Error(`Initial day should be 1, got ${state.day}`);
            if (state.inventory.length !== 0) throw new Error(`Initial inventory should be empty`);
        }
    },
    {
        name: 'Store: Cash Transactions',
        run: async () => {
            const store = useEmpireStore.getState();
            store.resetSession();
            
            store.addCash(50);
            if (store.cash !== 150) throw new Error(`Cash add failed. Expected 150, got ${store.cash}`);
            
            const success = store.removeCash(100);
            if (!success || store.cash !== 50) throw new Error(`Cash remove failed. Expected 50, got ${store.cash}`);
            
            const fail = store.removeCash(100);
            if (fail || store.cash !== 50) throw new Error(`Cash remove allowed below zero. Expected fail.`);
        }
    },
    {
        name: 'Store: Bank Transactions',
        run: async () => {
            const store = useEmpireStore.getState();
            store.resetSession();
            store.addCash(1000); // 1100 total
            
            store.depositToBank(500);
            if (store.cash !== 600 || store.bank !== 500) throw new Error(`Deposit failed. Cash: ${store.cash}, Bank: ${store.bank}`);
            
            store.withdrawFromBank(200);
            if (store.cash !== 800 || store.bank !== 300) throw new Error(`Withdraw failed. Cash: ${store.cash}, Bank: ${store.bank}`);
        }
    },
    {
        name: 'Store: Heat Management',
        run: async () => {
            const store = useEmpireStore.getState();
            store.resetSession();
            
            store.addHeat(50);
            if (store.heat !== 50) throw new Error(`Heat add failed. Got ${store.heat}`);
            
            store.addHeat(60); // Should cap at 100
            if (store.heat !== 100) throw new Error(`Heat cap failed. Got ${store.heat}`);
            
            store.decayHeat(30);
            if (store.heat !== 70) throw new Error(`Heat decay failed. Got ${store.heat}`);
        }
    },
    {
        name: 'Store: Inventory Management',
        run: async () => {
             const store = useEmpireStore.getState();
             store.resetSession();
             
             const item = { id: 'drug_coke', name: 'Coke', type: 'drug', illegal: true, weight: 1, quantity: 5 };
             
             const added = store.addItem(item as any);
             if (!added) throw new Error('AddItem failed');
             if (store.inventory.length !== 1 || store.inventory[0].quantity !== 5) throw new Error('Inventory state incorrect after add');
             
             const item2 = { id: 'drug_coke', name: 'Coke', type: 'drug', illegal: true, weight: 1, quantity: 3 };
             store.addItem(item2 as any); // Stack
             if (store.inventory[0].quantity !== 8) throw new Error('Inventory stack failed');
             
             store.removeItem('drug_coke', 4);
             if (store.inventory[0].quantity !== 4) throw new Error('RemoveItem failed');
             
             store.removeItem('drug_coke', 4);
             if (store.inventory.length !== 0) throw new Error('RemoveItem cleanup failed');
        }
    }
];
