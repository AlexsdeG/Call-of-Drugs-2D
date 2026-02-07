import Phaser from 'phaser';
import EasyStar from 'easystarjs';
import { WORLD } from '../../config/constants';

export class PathfindingManager {
    private scene: Phaser.Scene;
    private finder: EasyStar.js;
    private grid: number[][] = [];
    
    // Config
    private readonly TILE_SIZE = WORLD.TILE_SIZE;
    private readonly ACCEPTABLE_TILES = [0]; // 0 = Floor
    
    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.finder = new EasyStar.js();
        this.finder.setIterationsPerCalculation(1000); // Async slice
    }

    /**
     * Build the grid from the Tilemap and Obstacles
     */
    public buildGrid(tilemap: Phaser.Tilemaps.Tilemap, obstacles: Phaser.GameObjects.Sprite[]) {
        const width = tilemap.width;
        const height = tilemap.height;
        
        // 1. Initialize Grid with Walls
        this.grid = [];
        
        const wallLayer = tilemap.getLayer('Walls');
        const floorLayer = tilemap.getLayer('Floor');

        if (!wallLayer) {
            console.error("PathfindingManager: Wall layer not found!");
            return;
        }

        for (let y = 0; y < height; y++) {
            const row: number[] = [];
            for (let x = 0; x < width; x++) {
                const wallTile = wallLayer.data[y][x];
                const floorTile = floorLayer ? floorLayer.data[y][x] : null;
                
                // Block if Wall (index 1) OR Water (index 2 on floor)
                const isWall = wallTile && wallTile.index !== -1 && wallTile.index !== 0;
                const isWater = floorTile && floorTile.index === 2;
                
                if (isWall || isWater) {
                     row.push(1); 
                } else {
                     row.push(0);
                }
            }
            this.grid.push(row);
        }

        // 2. Bake Dynamic Obstacles
        obstacles.forEach(obs => {
            if (!obs.active) return; // Skip inactive
            const gridX = Math.floor(obs.x / this.TILE_SIZE);
            const gridY = Math.floor(obs.y / this.TILE_SIZE);
            
            if (this.isValidTile(gridX, gridY)) {
                this.grid[gridY][gridX] = 1; // Mark as Blocked
            }
        });

        // 3. Configure EasyStar
        this.finder.setGrid(this.grid);
        this.finder.setAcceptableTiles(this.ACCEPTABLE_TILES);
        this.finder.enableDiagonals();
        this.finder.disableCornerCutting();
        
        console.log("Pathfinding Grid Built:", width, "x", height);
    }

    /**
     * Dynamically update a specific tile's walkability.
     */
    public setTileWalkable(worldX: number, worldY: number, walkable: boolean) {
        const gridX = Math.floor(worldX / this.TILE_SIZE);
        const gridY = Math.floor(worldY / this.TILE_SIZE);

        if (this.isValidTile(gridX, gridY)) {
            this.grid[gridY][gridX] = walkable ? 0 : 1;
            this.finder.setGrid(this.grid); 
        }
    }

    /**
     * Request a path
     */
    public findPath(
        startX: number, startY: number, 
        endX: number, endY: number, 
        callback: (path: {x: number, y: number}[] | null) => void
    ) {
        const sx = Math.floor(startX / this.TILE_SIZE);
        const sy = Math.floor(startY / this.TILE_SIZE);
        const ex = Math.floor(endX / this.TILE_SIZE);
        const ey = Math.floor(endY / this.TILE_SIZE);

        if (!this.isValidTile(sx, sy) || !this.isValidTile(ex, ey)) {
            callback(null);
            return;
        }

        this.finder.findPath(sx, sy, ex, ey, (path) => {
            if (path === null) {
                callback(null);
            } else {
                const worldPath = path.map(p => ({
                    x: p.x * this.TILE_SIZE + (this.TILE_SIZE / 2),
                    y: p.y * this.TILE_SIZE + (this.TILE_SIZE / 2)
                }));
                callback(worldPath);
            }
        });
        
        this.finder.calculate();
    }

    /**
     * Finds path to a tile ADJACENT to the target.
     * Useful when targeting obstacles like Barricades which are marked as 'Blocked' in grid.
     */
    public findPathToNeighbor(
        startX: number, startY: number,
        targetX: number, targetY: number,
        callback: (path: {x: number, y: number}[] | null) => void
    ) {
        const sx = Math.floor(startX / this.TILE_SIZE);
        const sy = Math.floor(startY / this.TILE_SIZE);
        const tx = Math.floor(targetX / this.TILE_SIZE);
        const ty = Math.floor(targetY / this.TILE_SIZE);

        // Check neighbors (Up, Down, Left, Right)
        const neighbors = [
            {x: tx, y: ty - 1},
            {x: tx, y: ty + 1},
            {x: tx - 1, y: ty},
            {x: tx + 1, y: ty}
        ];
        
        // Filter walkable neighbors and sort by distance
        const validNeighbors = neighbors.filter(n => 
            this.isValidTile(n.x, n.y) && this.grid[n.y][n.x] === 0
        ).sort((a, b) => {
            const distA = Phaser.Math.Distance.Between(sx, sy, a.x, a.y);
            const distB = Phaser.Math.Distance.Between(sx, sy, b.x, b.y);
            return distA - distB;
        });

        // Try paths sequentially
        const tryNextNeighbor = (index: number) => {
            if (index >= validNeighbors.length) {
                callback(null); // All failed
                return;
            }

            const n = validNeighbors[index];
            const worldEX = n.x * this.TILE_SIZE;
            const worldEY = n.y * this.TILE_SIZE;

            this.findPath(startX, startY, worldEX, worldEY, (path) => {
                if (path) {
                    callback(path);
                } else {
                    tryNextNeighbor(index + 1);
                }
            });
        };

        tryNextNeighbor(0);
    }

    private isValidTile(x: number, y: number): boolean {
        if (!this.grid || this.grid.length === 0) return false;
        return y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length;
    }
}