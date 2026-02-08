import Phaser from 'phaser';
import { HEAT } from '../../config/constants';
import { useEmpireStore } from '../../store/useEmpireStore';

/**
 * HeatManager - Manages the global heat/wanted level
 * Heat increases from crimes and decays over time
 */
export class HeatManager {
    private scene: Phaser.Scene;
    private isChaseActive: boolean = false;
    
    // Crime event tracking
    private recentCrimes: number[] = []; // timestamps
    
    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Update heat decay (call every frame)
     */
    public update(time: number, delta: number): void {
        const store = useEmpireStore.getState();
        const deltaSeconds = delta / 1000;

        // Decay heat over time (slower decay when chase is active)
        if (store.heat > 0) {
            const decayRate = this.isChaseActive 
                ? HEAT.DECAY_RATE * 0.3  // Slower decay during chase
                : HEAT.DECAY_RATE;
            
            store.decayHeat(decayRate * deltaSeconds);
        }

        // Update chase state based on heat threshold
        const previousChaseState = this.isChaseActive;
        this.isChaseActive = store.heat >= HEAT.CHASE_THRESHOLD;
        
        // Emit event when chase state changes
        if (previousChaseState !== this.isChaseActive) {
            this.scene.events.emit('chase-state-changed', this.isChaseActive);
        }

        // Clean up old crime timestamps (older than 60 seconds)
        const currentTime = time;
        this.recentCrimes = this.recentCrimes.filter(t => currentTime - t < 60000);
    }

    /**
     * Add heat for selling drugs
     */
    public onDrugSale(): void {
        this.addHeat(HEAT.SELL_INCREASE, 'sale');
    }

    /**
     * Add heat for being spotted with illegal items
     */
    public onSpottedWithDrugs(): void {
        // Only add heat once per 2 seconds for being spotted
        const now = this.scene.time.now;
        const recentSpotted = this.recentCrimes.filter(t => now - t < 2000).length;
        
        if (recentSpotted === 0) {
            this.addHeat(HEAT.SPOTTED_INCREASE, 'spotted');
        }
    }

    /**
     * Add heat for killing police
     */
    public onPoliceKilled(): void {
        this.addHeat(HEAT.KILL_POLICE_INCREASE, 'kill');
    }

    /**
     * Add heat with crime tracking
     */
    private addHeat(amount: number, type: string): void {
        useEmpireStore.getState().addHeat(amount);
        this.recentCrimes.push(this.scene.time.now);
        
        // Emit crime event for Police AI to respond
        this.scene.events.emit('crime-committed', {
            type,
            amount,
            heat: useEmpireStore.getState().heat
        });
    }

    /**
     * Get current heat level (0-5 stars)
     */
    public getHeatLevel(): number {
        const heat = useEmpireStore.getState().heat;
        
        if (heat >= HEAT.THRESHOLDS.STAR_5) return 5;
        if (heat >= HEAT.THRESHOLDS.STAR_4) return 4;
        if (heat >= HEAT.THRESHOLDS.STAR_3) return 3;
        if (heat >= HEAT.THRESHOLDS.STAR_2) return 2;
        if (heat >= HEAT.THRESHOLDS.STAR_1) return 1;
        return 0;
    }

    /**
     * Check if police should actively chase
     */
    public shouldChase(): boolean {
        return this.isChaseActive;
    }

    /**
     * Check if police should investigate suspicious activity
     */
    public shouldInvestigate(): boolean {
        const heat = useEmpireStore.getState().heat;
        return heat >= HEAT.INVESTIGATE_THRESHOLD && heat < HEAT.CHASE_THRESHOLD;
    }

    /**
     * Check if police should ignore player
     */
    public shouldIgnore(): boolean {
        return useEmpireStore.getState().heat < HEAT.IGNORE_THRESHOLD;
    }

    /**
     * Get raw heat value
     */
    public getHeat(): number {
        return useEmpireStore.getState().heat;
    }

    /**
     * Reset heat (for game restart)
     */
    public reset(): void {
        this.isChaseActive = false;
        this.recentCrimes = [];
    }
}
