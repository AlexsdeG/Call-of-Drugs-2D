import Phaser from 'phaser';
import { IInteractable } from '../interfaces/IInteractable';
import { Player } from './Player';
// import { useEmpireStore } from '../../store/useEmpireStore';
import { PathfindingManager } from '../systems/PathfindingManager';

export class Barricade extends Phaser.Physics.Arcade.Sprite implements IInteractable {
    private panels: number = 0;
    private readonly MAX_PANELS = 10;
    
    // Repair Logic
    private repairAccumulator: number = 0;
    private readonly REPAIR_TIME_PER_PANEL = 900; // 0.9s
    // private readonly REPAIR_POINTS = 10;

    // Pathfinding
    private pathfindingManager?: PathfindingManager;

    // Visuals
    private statusText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, pathfindingManager?: PathfindingManager) {
        super(scene, x, y, 'barricade');
        this.pathfindingManager = pathfindingManager;

        scene.add.existing(this);
        
        // STATIC BODY SETUP
        // Use physics.add.existing to create the body.
        scene.physics.add.existing(this, true); 
        
        // Ensure body dimensions match the texture (32x32) and are centered
        this.setBodySize(32, 32);
        this.setOrigin(0.5, 0.5);
        
        // Force update to ensure physics world acknowledges position immediately
        const body = this.body as Phaser.Physics.Arcade.StaticBody;
        body.updateFromGameObject();
        
        this.setImmovable(true);
        this.setDepth(5); 
        
        // Initial State: 10 Panels (Full)
        this.panels = 10;
        
        this.statusText = scene.add.text(x, y, '10', { 
            fontSize: '12px', color: '#ffffff', stroke: '#000000', strokeThickness: 2 
        }).setOrigin(0.5);
        this.statusText.setDepth(25);

        this.updateState();
    }

    public hasPanels(): boolean {
        return this.panels > 0;
    }

    public interact(player: Player, delta: number = 16): void {
        if (this.panels >= this.MAX_PANELS) return;

        this.repairAccumulator += delta;

        if (this.repairAccumulator >= this.REPAIR_TIME_PER_PANEL) {
            this.addPanel();
            this.repairAccumulator = 0;
        }
    }

    private addPanel() {
        if (this.panels >= this.MAX_PANELS) return;
        
        const wasZero = this.panels === 0;
        this.panels++;
        
        // Grant Points
        // Grant Points / Cash maybe? For now disable point gain to fix types.
        // const stats = useEmpireStore.getState().playerStats;
        // useEmpireStore.getState().addCash(1);
        
        // Update Grid: Block zombies
        if (wasZero && this.pathfindingManager) {
            this.pathfindingManager.setTileWalkable(this.x, this.y, false);
        }

        this.updateState();
        
        this.scene.tweens.add({
            targets: this,
            scale: { from: 1.2, to: 1 },
            duration: 100,
            yoyo: true
        });
    }

    public fullyRepair() {
        this.panels = this.MAX_PANELS;
        
        if (this.pathfindingManager) {
             this.pathfindingManager.setTileWalkable(this.x, this.y, false);
        }

        this.updateState();
    }

    public removePanel() {
        if (this.panels <= 0) return;

        const wasPositive = this.panels > 0;
        this.panels--;

        // Update Grid: Allow zombies
        if (this.panels === 0 && wasPositive && this.pathfindingManager) {
            this.pathfindingManager.setTileWalkable(this.x, this.y, true);
        }

        this.updateState();
    }

    private updateState() {
        this.statusText.setText(this.panels.toString());
        this.statusText.setVisible(this.panels < this.MAX_PANELS && this.panels > 0);

        if (this.panels > 0) {
            // Active: Light Brown (Wood)
            this.setTint(0xDEB887);
            this.setAlpha(1);
        } else {
            // Broken: Dark Brown (Broken Hole)
            this.setTint(0x5D2906);
            this.setAlpha(1); 
        }
    }

    getInteractionPrompt(_player: Player): string {
        return this.panels < this.MAX_PANELS ? "Hold F to Repair" : "";
    }

    canInteract(_player: Player): boolean {
        return this.panels < this.MAX_PANELS;
    }

    destroy(fromScene?: boolean) {
        if (this.statusText) this.statusText.destroy();
        super.destroy(fromScene);
    }
}