import { create } from 'zustand';
import { PlayerStats, GameState } from '../types';
import { PLAYER } from '../config/constants';

export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'drug' | 'material' | 'furniture';
  illegal: boolean;
  weight: number;
  quantity: number;
  stackable?: boolean;
  props?: any;
}

interface EmpireState {
  gameState: GameState;
  
  // Economic Stats
  cash: number;
  bank: number;
  heat: number; // 0-100
  day: number;
  
  // Inventory
  inventory: Item[];
  maxWeight: number;

  // Player Vitals
  playerStats: PlayerStats;

  // Session Report
  sessionReport: import('../types').SessionReport | null;
  
  // UI States
  isReloading: boolean;
  interactionText: string | null;
  isPreviewing: boolean;
  isInventoryOpen: boolean; 

  // Actions
  setGameState: (state: GameState) => void;
  updatePlayerStats: (stats: Partial<PlayerStats>) => void;
  resetPlayerStats: () => void;
  setReloading: (isReloading: boolean) => void;
  setInteractionText: (text: string | null) => void;
  setIsPreviewing: (val: boolean) => void;
  setSessionReport: (report: import('../types').SessionReport | null) => void;

  // Economic Actions
  addCash: (amount: number) => void;
  removeCash: (amount: number) => boolean;
  depositToBank: (amount: number) => void;
  withdrawFromBank: (amount: number) => void;
  addHeat: (amount: number) => void;
  decayHeat: (amount: number) => void;
  
  // Inventory Actions
  addItem: (item: Item) => boolean;
  removeItem: (itemId: string, amount: number) => void;
  toggleInventory: () => void;
  setInventoryOpen: (isOpen: boolean) => void;
  
  // System Actions
  resetSession: () => void;
  
  // Legacy / Compatibility (To be phased out or adapted)
  gameOverStats: { roundsSurvived: number; message: string };
  setGameOverStats: (stats: { roundsSurvived: number; message: string }) => void;
  
  // Profile (kept for now to avoid breaking App.tsx)
  profile: import('../schemas/profileSchema').Profile | null;
  setProfile: (profile: import('../schemas/profileSchema').Profile) => void;
}

const INITIAL_PLAYER_STATS: PlayerStats = {
  health: PLAYER.MAX_HEALTH,
  maxHealth: PLAYER.MAX_HEALTH,
  stamina: PLAYER.MAX_STAMINA,
  maxStamina: PLAYER.MAX_STAMINA,
  ammo: 0,
  maxAmmo: 0,
  kills: 0,
  headshots: 0
};

export const useEmpireStore = create<EmpireState>((set, get) => ({
  gameState: GameState.MENU,
  
  cash: 100, 
  bank: 0,
  heat: 0,
  day: 1,
  
  inventory: [],
  maxWeight: 20,
  isInventoryOpen: false,

  playerStats: INITIAL_PLAYER_STATS,
  
  // Session Report
  sessionReport: null,
  
  isReloading: false,
  interactionText: null,
  isPreviewing: false,
  
  gameOverStats: { roundsSurvived: 0, message: '' },
  
  profile: null,

  setGameState: (gameState) => set({ gameState }),
  setIsPreviewing: (val) => set({ isPreviewing: val }),
  
  updatePlayerStats: (stats) => set((state) => ({
    playerStats: { ...state.playerStats, ...stats }
  })),

  resetPlayerStats: () => set({ playerStats: INITIAL_PLAYER_STATS }),

  setReloading: (isReloading) => set({ isReloading }),
  setInteractionText: (interactionText) => set({ interactionText }),
  setSessionReport: (sessionReport) => set({ sessionReport }),

  // Economic Actions
  addCash: (amount) => set((state) => ({ cash: state.cash + amount })),
  
  removeCash: (amount) => {
    const { cash } = get();
    if (cash >= amount) {
      set({ cash: cash - amount });
      return true;
    }
    return false;
  },

  depositToBank: (amount) => {
      const { cash, bank } = get();
      if (cash >= amount) {
          set({ cash: cash - amount, bank: bank + amount });
      }
  },

  withdrawFromBank: (amount) => {
      const { cash, bank } = get();
      if (bank >= amount) {
          set({ bank: bank - amount, cash: cash + amount });
      }
  },

  addHeat: (amount) => set((state) => ({ heat: Math.min(100, state.heat + amount) })),
  decayHeat: (amount) => set((state) => ({ heat: Math.max(0, state.heat - amount) })),

  // Inventory Actions
  addItem: (item) => {
                const state = get();
                const currentWeight = state.inventory.reduce((sum, i) => sum + (i.weight * i.quantity), 0);
                const itemTotalWeight = item.weight * item.quantity;
                
                if (currentWeight + itemTotalWeight > state.maxWeight) {
                    return false;
                }

                // Check stackable
                if (item.stackable) {
                    const existing = state.inventory.find(i => i.id === item.id);
                    if (existing) {
                        set((s) => ({
                            inventory: s.inventory.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i)
                        }));
                        return true;
                    }
                }

                set((s) => ({ inventory: [...s.inventory, item] }));
                return true;
            },
            removeItem: (itemId, quantity = 1) => {
                 set((s) => {
                    const existing = s.inventory.find(i => i.id === itemId);
                    if (!existing) return s;

                    if (existing.quantity <= quantity) {
                        return { inventory: s.inventory.filter(i => i.id !== itemId) };
                    } else {
                         return { 
                             inventory: s.inventory.map(i => i.id === itemId ? { ...i, quantity: i.quantity - quantity } : i)
                         };
                    }
                 });
            },
            toggleInventory: () => set((s) => ({ isInventoryOpen: !s.isInventoryOpen })),
            setInventoryOpen: (isOpen) => set({ isInventoryOpen: isOpen }),

  resetSession: () => set({
      cash: 100,
      bank: 0,
      heat: 0,
      day: 1,
      inventory: [],
      playerStats: INITIAL_PLAYER_STATS,
      isReloading: false,
      gameState: GameState.GAME,
      gameOverStats: { roundsSurvived: 0, message: '' }
  }),
  
  setGameOverStats: (stats) => set({ gameOverStats: stats }),
  
  setProfile: (profile) => set({ profile }),
}));
