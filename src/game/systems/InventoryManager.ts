import { Item, useEmpireStore } from '../../store/useEmpireStore';

export interface ItemType extends Item {
  // Aliasing Item type from store for now to match Plan
}

export class InventoryManager {
  
  static addItem(item: Item): boolean {
    return useEmpireStore.getState().addItem(item);
  }

  static removeItem(itemId: string, amount: number = 1): void {
    useEmpireStore.getState().removeItem(itemId, amount);
  }

  static hasItem(itemId: string, minAmount: number = 1): boolean {
    const item = useEmpireStore.getState().inventory.find(i => i.id === itemId);
    if (!item) return false;
    return item.quantity >= minAmount;
  }

  static getTotalWeight(): number {
    const inventory = useEmpireStore.getState().inventory;
    return inventory.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
  }

  static isOverWeight(): boolean {
    const currentWeight = this.getTotalWeight();
    const maxWeight = useEmpireStore.getState().maxWeight;
    return currentWeight > maxWeight;
  }
  
  static getWeightLeft(): number {
    const currentWeight = this.getTotalWeight();
    const maxWeight = useEmpireStore.getState().maxWeight;
    return Math.max(0, maxWeight - currentWeight);
  }
}
