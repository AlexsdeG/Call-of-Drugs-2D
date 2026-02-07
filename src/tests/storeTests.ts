import { useEmpireStore } from '../store/useEmpireStore';
import { GameTest } from './testRunner';

export const storeTests: GameTest[] = [
    {
        name: 'Store: Initial State',
        run: async () => {
             // Reset first to ensure clean state
            useEmpireStore.getState().resetSession();
            
            const state = useEmpireStore.getState();
            if (state.cash !== 100) throw new Error(`Initial cash should be 100, got ${state.cash}`);
            if (state.bank !== 0) throw new Error(`Initial bank should be 0, got ${state.bank}`);
            if (state.heat !== 0) throw new Error(`Initial heat should be 0, got ${state.heat}`);
            if (state.day !== 1) throw new Error(`Initial day should be 1, got ${state.day}`);
            if (state.inventory.length !== 0) throw new Error(`Initial inventory should be empty`);
            return true;
        }
    },
    {
        name: 'Store: Cash Transactions',
        run: async () => {
            const get = () => useEmpireStore.getState();
            get().resetSession();
            
            get().addCash(50);
            if (get().cash !== 150) throw new Error(`Cash add failed. Expected 150, got ${get().cash}`);
            
            const success = get().removeCash(100);
            if (!success || get().cash !== 50) throw new Error(`Cash remove failed. Expected 50, got ${get().cash}`);
            
            const fail = get().removeCash(100);
            if (fail || get().cash !== 50) throw new Error(`Cash remove allowed below zero. Expected fail.`);
            
            return true;
        }
    },
    {
        name: 'Store: Bank Transactions',
        run: async () => {
            const get = () => useEmpireStore.getState();
            get().resetSession();
            get().addCash(1000); // 1100 total
            
            get().depositToBank(500);
            if (get().cash !== 600 || get().bank !== 500) throw new Error(`Deposit failed. Cash: ${get().cash}, Bank: ${get().bank}`);
            
            get().withdrawFromBank(200);
            if (get().cash !== 800 || get().bank !== 300) throw new Error(`Withdraw failed. Cash: ${get().cash}, Bank: ${get().bank}`);
            
            return true;
        }
    },
    {
        name: 'Store: Heat Management',
        run: async () => {
            const get = () => useEmpireStore.getState();
            get().resetSession();
            
            get().addHeat(50);
            if (get().heat !== 50) throw new Error(`Heat add failed. Got ${get().heat}`);
            
            get().addHeat(60); // Should cap at 100
            if (get().heat !== 100) throw new Error(`Heat cap failed. Got ${get().heat}`);
            
            get().decayHeat(30);
            if (get().heat !== 70) throw new Error(`Heat decay failed. Got ${get().heat}`);
            
            return true;
        }
    },
    {
        name: 'Store: Inventory Management',
        run: async () => {
             const get = () => useEmpireStore.getState();
             get().resetSession();
             
             const item = { id: 'drug_coke', name: 'Coke', type: 'drug', illegal: true, weight: 1, quantity: 5, stackable: true };
             
             const added = get().addItem(item as any);
             if (!added) throw new Error('AddItem failed');
             if (get().inventory.length !== 1 || get().inventory[0].quantity !== 5) throw new Error('Inventory state incorrect after add');
             
             const item2 = { id: 'drug_coke', name: 'Coke', type: 'drug', illegal: true, weight: 1, quantity: 3, stackable: true };
             get().addItem(item2 as any); // Stack
             if (get().inventory[0].quantity !== 8) throw new Error('Inventory stack failed');
             
             get().removeItem('drug_coke', 4);
             if (get().inventory[0].quantity !== 4) throw new Error('RemoveItem failed');
             
             get().removeItem('drug_coke', 4);
             if (get().inventory.length !== 0) throw new Error('RemoveItem cleanup failed');
             
             return true;
        }
    }
];
