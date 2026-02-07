import Phaser from 'phaser';
import { Player } from '../entities/Player';

export interface IInteractable extends Phaser.GameObjects.GameObject {
    x: number;
    y: number;
    
    /**
     * Called when the player presses the Interaction Key (F) while in range.
     * @param player The player entity initiating the interaction
     * @param delta The time in ms since last frame (for hold interactions)
     */
    interact(player: Player, delta?: number): void;

    /**
     * Returns a text prompt to display on UI (e.g., "Press F to Buy [500]")
     */
    getInteractionPrompt(player: Player): { text: string; enabled: boolean } | string;
    
    /**
     * Can this currently be interacted with?
     */
    canInteract(player: Player): boolean;
}