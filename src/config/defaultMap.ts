import { MapData } from "../schemas/mapSchema";

// 50x50 Grid (Large enough for garden buffer)
const W = 50;
const H = 50;

const floorLayer = Array(H).fill(0).map(() => Array(W).fill(0));
const wallLayer = Array(H).fill(0).map(() => Array(W).fill(0));

// --- MAP GENERATION ---

// 1. Fill everything with Grass/Floor
// 2. Build the House Structure in the middle (20,20 to 35,35)

const houseX = 10;
const houseY = 10;
const houseW = 30;
const houseH = 30;

for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        // Map Boundaries (The edge of the garden)
        if (x === 0 || x === W - 1 || y === 0 || y === H - 1) {
            wallLayer[y][x] = 1; 
        }

        // House Outer Walls
        if (x >= houseX && x <= houseX + houseW && y >= houseY && y <= houseY + houseH) {
            // Edges of the house rectangle
            if (x === houseX || x === houseX + houseW || y === houseY || y === houseY + houseH) {
                wallLayer[y][x] = 1;
            }
        }
        
        // Internal Walls (Dividing the house into rooms)
        // Vertical split at x = 25
        if (x === 25 && y >= houseY && y <= houseY + houseH) {
            wallLayer[y][x] = 1;
        }
        // Horizontal split in the right section at y = 25
        if (y === 25 && x >= 25 && x <= houseX + houseW) {
            wallLayer[y][x] = 1;
        }
    }
}

// --- CUTOUTS & OBJECTS ---

// Helper to clear a wall for an object
const clearWall = (x: number, y: number) => { wallLayer[y][x] = 0; };

// 1. Spawn Room (Left side)
const spawnX = 20;
const spawnY = 25;

// 2. Door connecting Spawn Room (Left) to Top-Right Room
clearWall(25, 20); // Door Slot
const door1 = { type: "door", x: 25 * 32 + 16, y: 20 * 32 + 16, properties: { cost: 750, zone: 1 } };

// 3. Door connecting Top-Right to Bottom-Right
clearWall(30, 25); // Door Slot
const door2 = { type: "door", x: 30 * 32 + 16, y: 25 * 32 + 16, properties: { cost: 1000, zone: 2 } };

// 4. Barricades (Windows) - Located on outer walls
// Left Wall Window
clearWall(houseX, 25);
const bar1 = { type: "barricade", x: houseX * 32 + 16, y: 25 * 32 + 16 };

// Top Wall Window
clearWall(20, houseY);
const bar2 = { type: "barricade", x: 20 * 32 + 16, y: houseY * 32 + 16 };

// Bottom Wall Window
clearWall(20, houseY + houseH);
const bar3 = { type: "barricade", x: 20 * 32 + 16, y: (houseY + houseH) * 32 + 16 };

// Right Wall Window (Top Room)
clearWall(houseX + houseW, 20);
const bar4 = { type: "barricade", x: (houseX + houseW) * 32 + 16, y: 20 * 32 + 16 };

// Right Wall Window (Bottom Room)
clearWall(houseX + houseW, 30);
const bar5 = { type: "barricade", x: (houseX + houseW) * 32 + 16, y: 30 * 32 + 16 };


export const DEBUG_MAP: MapData = {
    app: "call-of-2d-zombies",
    name: "Garden House",
    version: "1.2.0",
    width: W,
    height: H,
    tileSize: 32,
    layers: {
        floor: floorLayer,
        walls: wallLayer
    },
    objects: [
        { type: "spawn", x: spawnX * 32, y: spawnY * 32 },
        
        door1, door2,
        bar1, bar2, bar3, bar4, bar5,

        // Spawners (Located in the Garden, outside the house walls)
        // Zone 0 (Active at start) - Left side
        { type: "spawner", x: 5 * 32, y: 25 * 32, properties: { zone: 0 } },
        { type: "spawner", x: 25 * 32, y: 5 * 32, properties: { zone: 1 } }, // Top garden
        { type: "spawner", x: 25 * 32, y: 45 * 32, properties: { zone: 2 } }, // Bottom garden
        
        // Zone 1/2 Spawners (Right side garden)
        { type: "spawner", x: 45 * 32, y: 25 * 32, properties: { zone: 2 } },

        // --- ECONOMY ---
        // WallBuy (Spawn Room - Left Wall)
        { type: "wall_buy", x: 10 * 32 + 16, y: 22 * 32 + 16, properties: { weapon: "SHOTGUN", cost: 500 } },
        { type: "wall_buy", x: 25 * 32 + 16, y: 22 * 32 + 16, properties: { weapon: "RIFLE", cost: 1000 } },
        
        // Mystery Boxes (One in each room)
        // Spawn Room
        { type: "mystery_box", x: 22 * 32, y: 25 * 32, properties: { rotation: 90, first: true } },
        // Top-Right Room
        { type: "mystery_box", x: 30 * 32, y: 20 * 32 },
        // Bottom-Right Room
        { type: "mystery_box", x: 30 * 32, y: 30 * 32 },

        // --- PERKS ---
        // Spawn Room: Quick Revive? No, let's put Speed Cola
        { type: "perk_machine", x: 18 * 32, y: 25 * 32, properties: { perk: "SPEED_COLA" } },
        // Top-Right Room: Juggernog
        { type: "perk_machine", x: 34 * 32, y: 16 * 32, properties: { perk: "JUGGERNOG" } },
        // Bottom-Right Room: Double Tap
        { type: "perk_machine", x: 34 * 32, y: 34 * 32, properties: { perk: "DOUBLE_TAP" } },
        // Garden (Outside): Stamin-Up
        { type: "perk_machine", x: 11 * 32, y: 11 * 32, properties: { perk: "STAMIN_UP" } },

        // --- PACK-A-PUNCH ---
        // Garden (Bottom Right)
        { type: "pack_a_punch", x: 38 * 32, y: 38 * 32 },
    ]
};