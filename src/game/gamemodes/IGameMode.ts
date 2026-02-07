import Phaser from 'phaser';

export interface IGameMode {
    init(): void;
    update(time: number, delta: number): void;
    shutdown(): void;
    
    // Optional hooks
    onPlayerDamage?(amount: number): void;
    onZombieKilled?(zombie: any): void;
    
    // Stats
    getCurrentRound(): number;
    getGameOverMessage?(): string;
}
