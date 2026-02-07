import { MapManager } from '../game/systems/MapManager';
import { DEBUG_MAP } from '../config/defaultMap';

// Mock Scene
const mockScene = {
    make: {
        tilemap: () => ({
            addTilesetImage: () => ({}),
            createBlankLayer: () => ({
                 layer: { data: [], name: 'floor' },
                 putTileAt: () => {},
                 setDepth: () => {},
                 setCollision: () => {}
            })
        })
    },
    add: {
        existing: () => {},
        text: () => ({ setOrigin: () => {} }),
        sprite: () => ({ setDepth: () => {}, setVisible: () => {} })
    },
    physics: {
        add: {
            existing: () => {}
        }
    }
} as any;

const mockStaticGroup = {
    add: (obj: any) => { 
        console.log(`Added ${obj.constructor.name}`); 
    }
} as any;

// Simple test to verify parser handles new types
// Run with: npx ts-node src/tests/economyMapTest.ts (if env setup, or just manual verify via this code)

console.log("Testing Economy Map Parsing...");

const mapManager = new MapManager(mockScene);
const valid = mapManager.validate(DEBUG_MAP);

if (valid.success && valid.data) {
    console.log("Map Validated.");
    
    let wallBuyCount = 0;
    let mysteryBoxCount = 0;

    valid.data.objects?.forEach(obj => {
        if (obj.type === 'wall_buy') wallBuyCount++;
        if (obj.type === 'mystery_box') mysteryBoxCount++;
    });

    console.log(`Found ${wallBuyCount} Wall Buys.`);
    console.log(`Found ${mysteryBoxCount} Mystery Boxes.`);

    if (wallBuyCount >= 1 && mysteryBoxCount >= 3) {
        console.log("SUCCESS: Economy items found in map data.");
    } else {
        console.error("FAILURE: Missing economy items.");
        process.exit(1);
    }
} else {
    console.error("Map Validation Failed");
    process.exit(1);
}
