// Polyfill window and document for Node.js environment
if (typeof window === 'undefined') {
    (global as any).window = {
        addEventListener: () => {},
        removeEventListener: () => {},
        navigator: { userAgent: 'node' },
        innerWidth: 1024,
        innerHeight: 768,
        location: { href: '' },
        performance: { now: () => Date.now() },
        cordova: undefined
    };
}
if (typeof document === 'undefined') {
    (global as any).document = {
        createElement: () => ({ style: {}, getContext: () => ({}) }),
        body: { appendChild: () => {} },
        addEventListener: () => {},
        removeEventListener: () => {},
        documentElement: { style: {} }
    };
}
if (typeof navigator === 'undefined') {
    (global as any).navigator = { userAgent: 'node' };
}
// Generic Image mock
if (typeof Image === 'undefined') {
    (global as any).Image = class {
        onload: any;
        src: any;
    };
}

import { MapManager } from '../game/systems/MapManager';
import { DEBUG_MAP } from '../config/defaultMap';

// Mock Phaser Scene
const mockScene = {
    make: {
        tilemap: () => ({
            addTilesetImage: () => {},
            createLayer: () => ({ setCollisionByProperty: () => {} }),
        })
    },
    add: {
        group: () => ({}),
    },
    gridEngine: {
        create: () => {},
    }
} as any;

// Mock PathfindingManager
const mockPathfindingManager = {
    buildGrid: () => {},
} as any;

async function testMapValidation() {
    console.log('Testing Map Validation...');
    const mapManager = new MapManager(mockScene, mockPathfindingManager);
    
    // Test Valid Map
    const validResult = mapManager.validate(DEBUG_MAP);
    if (!validResult.success) {
        console.error('❌ Default Map Validation Failed:', validResult.error);
        process.exit(1);
    }
    console.log('✅ Default Map Validation Passed');

    // Test Invalid Map (Schema Violation)
    const invalidMap = { ...DEBUG_MAP, layers: [] }; // Missing layers or wrong structure
    const invalidResult = mapManager.validate(invalidMap as any); // Cast to any to force check
    
    if (!invalidResult.success) {
        console.log('✅ Invalid Map correctly rejected');
    } else {
        console.error('❌ Invalid Map was wrongly accepted');
        process.exit(1);
    }
}

async function runTests() {
    try {
        await testMapValidation();
        console.log('\nAll Map Tests Passed! 🎉');
    } catch (error) {
        console.error('Test Suite Failed:', error);
        process.exit(1);
    }
}

runTests();
