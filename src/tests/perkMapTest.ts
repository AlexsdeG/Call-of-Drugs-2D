import { MapData } from "../schemas/mapSchema";

const W = 20;
const H = 20;
const floorLayer = Array(H).fill(0).map(() => Array(W).fill(0));
const wallLayer = Array(H).fill(0).map(() => Array(W).fill(0));

// Enclosed room
for(let y=0; y<H; y++) {
    for(let x=0; x<W; x++) {
        if(x===0 || x===W-1 || y===0 || y===H-1) wallLayer[y][x] = 1;
    }
}

export const PERK_TEST_MAP: MapData = {
    name: "Perk Test Map",
    version: "1.0.0",
    width: W,
    height: H,
    tileSize: 32,
    layers: {
        floor: floorLayer,
        walls: wallLayer
    },
    objects: [
        { type: "spawn", x: 10 * 32, y: 10 * 32 },
        
        // Juggernog
        { type: "perk_machine", x: 5 * 32, y: 5 * 32, properties: { perk: "JUGGERNOG" } },
        // Speed Cola
        { type: "perk_machine", x: 15 * 32, y: 5 * 32, properties: { perk: "SPEED_COLA" } },
        // Double Tap
        { type: "perk_machine", x: 5 * 32, y: 15 * 32, properties: { perk: "DOUBLE_TAP" } },
        // Stamin-Up
        { type: "perk_machine", x: 15 * 32, y: 15 * 32, properties: { perk: "STAMIN_UP" } },
        
        // Pack-a-Punch (Center-ish)
        { type: "pack_a_punch", x: 12 * 32, y: 12 * 32 },
        
        // WallBuy (For getting a gun to upgrade)
        { type: "wall_buy", x: 10 * 32, y: 2 * 32, properties: { weapon: "RIFLE", cost: 10 } }
    ]
};
