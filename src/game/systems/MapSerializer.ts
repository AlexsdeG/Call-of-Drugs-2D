import { EditorScene } from '../scenes/EditorScene';
import { MapData, MapDataSchema, MapObject } from '../../schemas/mapSchema';
import { VERSION } from '../../config/constants';
import { z } from 'zod';

export class MapSerializer {
    
    public static serialize(scene: EditorScene, name: string = "Untitled Project"): MapData {
        const dims = scene.getMapDimensions();
        
        // 1. Serialize Tiles
        const floorGrid: number[][] = Array(dims.height).fill(0).map(() => Array(dims.width).fill(0));
        const wallGrid: number[][] = Array(dims.height).fill(0).map(() => Array(dims.width).fill(0));
        
        const tiles = scene.getTiles();
        tiles.forEach(({ x, y, index }) => {
             const gx = Math.floor(x / dims.tileSize);
             const gy = Math.floor(y / dims.tileSize);
             
             if (gx >= 0 && gx < dims.width && gy >= 0 && gy < dims.height) {
                 if (index === 1) {
                     wallGrid[gy][gx] = 1;
                 } else {
                     floorGrid[gy][gx] = index;
                 }
             }
        });
        
        // 2. Serialize Objects (Keep Editor Format)
        const editorObjects = scene.getEditorObjects();
        const mapObjects = editorObjects.map(obj => {
             return {
                 id: obj.id,
                 type: obj.type,
                 x: obj.x,
                 y: obj.y,
                 width: obj.width,
                 height: obj.height,
                 properties: obj.properties,
                 scripts: obj.scripts 
             };
        });
        
        return {
            app: "call-of-2d-zombies",
            name: name,
            version: VERSION,
            width: dims.width,
            height: dims.height,
            tileSize: dims.tileSize,
            layers: {
                floor: floorGrid,
                walls: wallGrid
            },
            objects: mapObjects,
            scripts: [], 
            globalVariables: [],
            // @ts-ignore
            format: "editor" 
        };
    }
    
    public static get APP_TAG() { return "call-of-2d-zombies"; }
    public static get CURRENT_VERSION() { return VERSION; }
    
    public static deserialize(scene: EditorScene, data: MapData) {
        scene.clearEditor();
        scene.handleMapResize({ width: data.width, height: data.height }); // Resize grid

        // 2. Restore Tiles
        data.layers.floor.forEach((row, y) => {
            row.forEach((idx, x) => {
                if (idx > 0) scene.paintTileAtGrid(x, y, idx);
            });
        });
        
        data.layers.walls.forEach((row, y) => {
            row.forEach((idx, x) => {
                 if (idx > 0) scene.paintTileAtGrid(x, y, idx);
            });
        });
        
        // 3. Restore Objects
        data.objects?.forEach(obj => {
             scene.restoreObject({
                 id: obj.id || crypto.randomUUID(),
                 type: obj.type, // Assumes Editor Format if coming from Load
                 x: obj.x,
                 y: obj.y,
                 width: obj.width,
                 height: obj.height,
                 properties: obj.properties || {},
                 scripts: obj.scripts || []
             });
        });
    }

    public static validate(json: unknown) {
        return MapDataSchema.safeParse(json);
    }

    public static validateHeader(json: any): { valid: boolean, error?: string } {
        if (!json || typeof json !== 'object') return { valid: false, error: "Invalid JSON" };
        if (json.app !== this.APP_TAG) return { valid: false, error: "Invalid File Format: Missing or wrong 'app' tag" };
        return { valid: true };
    }

    public static checkVersion(jsonVersion: string): { status: 'ok' | 'warning' | 'error', message?: string } {
        // Simple string comparison for now, or semver if needed.
        // Assuming strict equality for "latest" and simple check for older.
        if (jsonVersion === this.CURRENT_VERSION) return { status: 'ok' };
        
        // If version is strictly older (e.g. 0.2.0 vs 0.2.1) -> Warning
        // If version is newer -> Warning (might break)
        // For this task user asked: "info prompt... if version number is lower than yours"
        
        // Very basic semantic check
        const currentParts = this.CURRENT_VERSION.split('.').map(Number);
        const jsonParts = jsonVersion.split('.').map(Number);
        
        for (let i = 0; i < 3; i++) {
            if (jsonParts[i] > currentParts[i]) return { status: 'warning', message: `Map version (${jsonVersion}) is newer than Editor (${this.CURRENT_VERSION}). Some features may not work.` };
            if (jsonParts[i] < currentParts[i]) return { status: 'warning', message: `Map version (${jsonVersion}) is older than Editor (${this.CURRENT_VERSION}). It will be upgraded upon save.` };
        }
        
        return { status: 'ok' };
    }

    // --- TRANSLATION LOGIC ---

    public static translateToGameFormat(data: MapData): MapData {
        // Deep copy to avoid mutating original
        const gameData: MapData = JSON.parse(JSON.stringify(data));
        
        // Add Header
        (gameData as any).app = "call-of-2d-zombies";
        (gameData as any).format = "game";
        (gameData as any).exportedAt = Date.now();
        
        if (gameData.objects) {
            gameData.objects = gameData.objects.map(obj => {
                const newObj = { ...obj };
                
                // Map Editor Types (PascalCase) to Game Types (snake_case)
                switch(obj.type) {
                    case 'SpawnPoint': newObj.type = 'spawn'; break;
                    case 'Spawner': newObj.type = 'spawner'; break;
                    case 'MysteryBox': newObj.type = 'mystery_box'; break;
                    case 'PackAPunch': newObj.type = 'pack_a_punch'; break;
                    case 'PerkMachine': newObj.type = 'perk_machine'; break;
                    case 'WallBuy': newObj.type = 'wall_buy'; break;
                    case 'Door': newObj.type = 'door'; break;
                    case 'Barricade': newObj.type = 'barricade'; break;
                    // CustomObject, TriggerZone might stay same or need specific mapping?
                    // Assuming they need snake_case if Game expects it, but for now strict mapping based on defaultMap
                }
                
                // Clean up Editor specific properties if needed?
                // For now pass everything through.
                return newObj;
            });
        }
        
        return gameData;
    }

    public static translateToEditorFormat(data: MapData): MapData {
        const editorData: MapData = JSON.parse(JSON.stringify(data));
        
        if (editorData.objects) {
            editorData.objects = editorData.objects.map(obj => {
                const newObj = { ...obj };
                
                switch(obj.type) {
                    case 'spawn': newObj.type = 'SpawnPoint'; break;
                    case 'spawner': newObj.type = 'Spawner'; break;
                    case 'mystery_box': newObj.type = 'MysteryBox'; break;
                    case 'pack_a_punch': newObj.type = 'PackAPunch'; break;
                    case 'perk_machine': newObj.type = 'PerkMachine'; break;
                    case 'wall_buy': newObj.type = 'WallBuy'; break;
                    case 'door': newObj.type = 'Door'; break;
                    case 'barricade': newObj.type = 'Barricade'; break;
                }
                
                return newObj;
            });
        }
        
        return editorData;
    }
}
