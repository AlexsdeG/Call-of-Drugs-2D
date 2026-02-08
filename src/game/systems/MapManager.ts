import Phaser from 'phaser';
import { MapDataSchema, MapData } from '../../schemas/mapSchema';
import { WORLD } from '../../config/constants';
import { PathfindingManager } from './PathfindingManager';
import { Police } from '../entities/Police';
import { Door } from '../entities/Door';
import { Barricade } from '../entities/Barricade';
import { Spawner } from '../entities/Spawner';
import { Player } from '../entities/Player';
import { WallBuy } from '../entities/WallBuy';
import { MysteryBox } from '../entities/MysteryBox';
import { PerkType } from '../types/PerkTypes';
import { Vehicle } from '../entities/Vehicle';
import { NpcDealer } from '../entities/NpcDealer';

export class MapManager {
    private scene: Phaser.Scene;
    private currentMap: MapData | null = null;
    private pathfindingManager?: PathfindingManager;
    
    // Phaser Tilemap components
    private map?: Phaser.Tilemaps.Tilemap;
    private tileset?: Phaser.Tilemaps.Tileset;
    private floorLayer?: Phaser.Tilemaps.TilemapLayer;
    private wallLayer?: Phaser.Tilemaps.TilemapLayer;

    constructor(scene: Phaser.Scene, pathfindingManager?: PathfindingManager) {
        this.scene = scene;
        this.pathfindingManager = pathfindingManager;
    }

    public validate(json: unknown): { success: boolean; data?: MapData; error?: any } {
        const result = MapDataSchema.safeParse(json);
        if (result.success) {
            return { success: true, data: result.data };
        } else {
            console.error("Map Validation Failed:", result.error);
            return { success: false, error: result.error };
        }
    }

    public createLevel(mapData: MapData): { floor?: Phaser.Tilemaps.TilemapLayer, walls?: Phaser.Tilemaps.TilemapLayer } {
        this.currentMap = mapData;
        this.map = this.scene.make.tilemap({
            tileWidth: mapData.tileSize,
            tileHeight: mapData.tileSize,
            width: mapData.width,
            height: mapData.height,
        });

        // Use procedural_tileset as the texture key
        this.tileset = this.map.addTilesetImage('tileset', 'procedural_tileset', 32, 32, 0, 0)!;

        // Fallback for debugging
        if (!this.tileset) {
            console.error("Failed to load tileset 'procedural_tileset'");
            // Try loading default just in case
            this.tileset = this.map.addTilesetImage('tileset', undefined, 32, 32, 0, 0)!;
        }

        if (!this.tileset) {
            console.error("Failed to load tileset 'tileset'");
            return {};
        }

        this.floorLayer = this.map.createBlankLayer('Floor', this.tileset)!;
        if (this.floorLayer) {
             this.populateLayer(this.floorLayer, mapData.layers.floor);
             this.floorLayer.setDepth(-10); 
             // Enable Collision for Water (Index 2)
             this.floorLayer.setCollision(2);
        }

        this.wallLayer = this.map.createBlankLayer('Walls', this.tileset)!;
        if (this.wallLayer) {
            console.log("MapManager: WallLayer created", { 
                layer: !!this.wallLayer.layer, 
                data: this.wallLayer.layer ? !!this.wallLayer.layer.data : false 
            });
            this.populateLayer(this.wallLayer, mapData.layers.walls);
            this.wallLayer.setDepth(1); 
            this.wallLayer.setCollision(1);
        } else {
            console.error("MapManager: Failed to create WallLayer");
        }

        return {
            floor: this.floorLayer || undefined,
            walls: this.wallLayer || undefined
        };
    }
    
    public createObjects(
        mapData: MapData, 
        doorGroup: Phaser.Physics.Arcade.StaticGroup, 
        barricadeGroup: Phaser.Physics.Arcade.StaticGroup,
        spawners: Spawner[],
        policeGroup: Phaser.Physics.Arcade.Group,
        player: Player,
        targetLayer?: Phaser.GameObjects.Layer,
        wallBuyGroup?: Phaser.Physics.Arcade.StaticGroup,
        mysteryBoxGroup?: Phaser.Physics.Arcade.StaticGroup,
        perkMachineGroup?: Phaser.Physics.Arcade.StaticGroup,
        packAPunchGroup?: Phaser.Physics.Arcade.StaticGroup,
        customWallGroup?: Phaser.Physics.Arcade.StaticGroup,
        vehicleGroup?: Phaser.Physics.Arcade.Group,
        npcGroup?: Phaser.Physics.Arcade.Group
    ) {
        if (!mapData.objects || !this.pathfindingManager) return;
        
        // Ensure groups exist if passed as optional
        if (wallBuyGroup && mysteryBoxGroup && perkMachineGroup && packAPunchGroup) {
             // Logic proceeds
        } else {
            console.warn("Missing groups for items");
        }
        
        mapData.objects.forEach(obj => {
             if (obj.type === 'door') {
                const cost = obj.properties?.cost || 1000;
                const zone = obj.properties?.zone !== undefined ? obj.properties.zone : -1;
                const door = new Door(this.scene, obj.x, obj.y, cost, zone, this.pathfindingManager!);
                door.setDepth(10);
                doorGroup.add(door);
             } else if (obj.type === 'barricade') {
                // Tiled Objects seem to be already centered or correctly positioned for the sprite origin.
                // Using obj.x / obj.y directly.
                const cx = obj.x;
                const cy = obj.y;
                
                const bar = new Barricade(this.scene, cx, cy, this.pathfindingManager);
                
                // Rotation Logic: Check neighbors to determine orientation
                // Default is Horizontal (Left-to-Right)
                if (this.wallLayer) {
                    const isWall = (x: number, y: number) => {
                        const tile = this.wallLayer?.getTileAtWorldXY(x, y);
                        // Check for index !== -1 (Wall tiles are 1)
                        // With the new fix, walls are strictly 1.
                        return tile && tile.index !== -1;
                    };

                    const top = isWall(cx, cy - 32);
                    const bottom = isWall(cx, cy + 32);
                    const left = isWall(cx - 32, cy);
                    const right = isWall(cx + 32, cy);
                    
                    // Rotate vertical ONLY if walls are Top & Bottom AND NOT Left & Right
                    if (top && bottom && !left && !right) {
                        bar.setAngle(90);
                        // Do NOT call updateFromGameObject() here. 
                        // It causes the AABB to misalign for rotated static bodies in some Phaser versions/configs.
                        // The body is already 32x32 and centered from constructor.
                    }
                }
                
                bar.setDepth(10);
                barricadeGroup.add(bar);

                // Add to interactable group so player can interact
                // Note: The loop in MainGameScene does this, but if we want to be safe...
                // MainGameScene.ts lines 137-140 iterates the group. So we are good.
             } else if (obj.type === 'spawner') {
                 const zone = obj.properties?.zone || 0;
                 const spawner = new Spawner(
                     this.scene, 
                     obj.x, 
                     obj.y, 
                     zone, 
                     policeGroup, 
                     barricadeGroup, 
                     player, 
                     this.pathfindingManager!,
                     this.wallLayer,
                     targetLayer
                 );
                 // Spawner is logic only, no setDepth needed
                 spawners.push(spawner);
             } else if (obj.type === 'spawn') {
                 // Move player to spawn
                 player.setPosition(obj.x, obj.y);
             } else if (obj.type === 'wall_buy') {
                 if (wallBuyGroup) {
                     const weapon = this.getProperty(obj, 'weapon', 'PISTOL');
                     const cost = this.getProperty(obj, 'cost', 500);
                     
                     const w = obj.width || 32;
                     const h = obj.height || 32;
                     
                     const wb = new WallBuy(this.scene, obj.x, obj.y, w, h, weapon, cost);
                     wb.setDepth(10);
                     wallBuyGroup.add(wb);
                 }
             } else if (obj.type === 'mystery_box') {
                 if (mysteryBoxGroup) {
                    const rotation = this.getProperty(obj, 'rotation', 0);
                    const isFirst = this.getProperty(obj, 'first', false);

                    const box = new MysteryBox(this.scene, obj.x, obj.y, rotation, isFirst);
                    box.setDepth(10);
                    mysteryBoxGroup.add(box);
                 }
             } else if (obj.type === 'perk_machine') {
                 // Perk machines removed
             } else if (obj.type === 'pack_a_punch') {
                 // Pack-a-punch removed
             } else if (obj.type === 'CustomObject') {
                 if (customWallGroup) {
                     const w = this.getProperty(obj, 'width', 32);
                     const h = this.getProperty(obj, 'height', 32);
                     const texKey = `custom-tex-${obj.id}`; 
                     const hasTex = obj.properties?.texture && this.scene.textures.exists(texKey);
                     
                     let entity: Phaser.GameObjects.GameObject;
                     
                     if (hasTex) {
                         const sprite = this.scene.add.sprite(obj.x, obj.y, texKey);
                         sprite.setDisplaySize(w, h);
                         entity = sprite;
                     } else {
                         // Graphic fallback
                         const color = parseInt((this.getProperty(obj, 'color', '#888888')).replace('#', '0x'));
                         const s = this.scene.add.sprite(obj.x, obj.y, 'wall_custom');
                         s.setDisplaySize(w, h);
                         s.setTint(color);
                         entity = s;
                     }
                     
                     if (entity instanceof Phaser.GameObjects.Sprite || entity instanceof Phaser.GameObjects.Image) {
                        entity.setDepth(10);
                     }
                     customWallGroup.add(entity);
                     // Add static body manually via existing physics group
                     const body = (entity as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.StaticBody;
                     if (body) {
                        body.updateFromGameObject();
                     }
                 }
             } else if (obj.type === 'vehicle') {
                 if (vehicleGroup) {
                    const vehicle = new Vehicle(this.scene, obj.x, obj.y);
                    vehicleGroup.add(vehicle);
                 }
             } else if (obj.type === 'dealer') {
                 if (npcGroup) {
                     const dealer = new NpcDealer(this.scene, obj.x, obj.y);
                     npcGroup.add(dealer);
                 }
             } else if (obj.type === 'police_spawn') {
                 if (policeGroup) {
                    // Create Police at this location
                    const police = new Police(
                        this.scene,
                        obj.x,
                        obj.y,
                        player,
                        this.pathfindingManager!,
                        this.wallLayer,
                        targetLayer
                    );
                    policeGroup.add(police);
                 }
             }
        });
        
        // Init MysteryBox system (ensure one is active)
        MysteryBox.initSystem();
    }
    
    // Helper to safely extract properties from Tiled Objects (Array or Dictionary)
    private getProperty(obj: any, key: string, defaultValue: any): any {
        if (!obj.properties) return defaultValue;
        
        // Case 1: Array of objects (Tiled JSON standard) -> [{name: "key", value: "val"}, ...]
        if (Array.isArray(obj.properties)) {
            const prop = obj.properties.find((p: any) => p.name === key);
            return prop ? prop.value : defaultValue;
        } 
        
        // Case 2: Dictionary/Object (Phaser often converts to this, or manual map data) -> { key: "val" }
        if (obj.properties.hasOwnProperty(key)) {
            return obj.properties[key];
        }
        
        return defaultValue;
    }
    
    private populateLayer(layer: Phaser.Tilemaps.TilemapLayer, data: number[][]) {
        for (let y = 0; y < data.length; y++) {
            for (let x = 0; x < data[0].length; x++) {
                if (layer.layer.data[y] && layer.layer.data[y][x]) {
                     const tileId = data[y][x];
                     
                     // Improve: Only skip 0 for 'Walls' layer to prevent invisible collisions.
                     if (tileId !== 0 || layer.layer.name !== 'Walls') {
                         try {
                            layer.putTileAt(tileId, x, y);
                         } catch (e) {
                            console.error(`MapManager: Tile Put Error at ${x},${y} with ID ${tileId}. Tileset Total: ${this.tileset?.total}`, e);
                         }
                     }
                }
            }
        }
    }
    public destroy() {
        if (this.floorLayer) this.floorLayer.destroy();
        if (this.wallLayer) this.wallLayer.destroy();
        if (this.map) this.map.destroy();
        
        this.floorLayer = undefined;
        this.wallLayer = undefined;
        this.map = undefined;
        this.tileset = undefined;
        this.currentMap = null;
        console.log("MapManager: Destroyed");
    }
}