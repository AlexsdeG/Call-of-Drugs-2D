import { GameTest, TestRunner } from './testRunner';
import Phaser from 'phaser';

const VisionSystemTest: GameTest = {
    name: 'Vision System Initialization',
    run: async (scene: Phaser.Scene) => {
        // 1. Check if Raycaster Plugin is mapped
        if (!(scene as any).raycasterPlugin) {
            console.error('PhaserRaycaster plugin is not attached to the scene.');
            return false;
        }

        // 2. Check if VisionManager created the graphics layer
        // We look for a Graphics object with high depth (100)
        const children = scene.children.list;
        const fogLayer = children.find(child => 
            child.type === 'Graphics' && (child as any).depth === 100
        ) as Phaser.GameObjects.Graphics | undefined;

        if (!fogLayer) {
            console.error('VisionManager Fog Graphics layer not found.');
            return false;
        }

        // 3. Verify it is visible
        if (!fogLayer.visible) {
            console.error('Fog layer exists but is hidden.');
            return false;
        }

        return true;
    }
};

const ObstacleMappingTest: GameTest = {
    name: 'Obstacle Mapping',
    run: async (scene: Phaser.Scene) => {
        // Access internal vision manager from scene if possible, or infer from scene state
        // Since we didn't make visionManager public in MainGameScene, we check if sprites exist
        // This checks if the Crates were generated
        const sprites = scene.children.list.filter(c => c.type === 'Sprite');
        
        if (sprites.length === 0) {
            console.warn('No sprites found. Crates might not be generated?');
            return false;
        }

        // We assume at least some are crates with 'crate' texture
        const crates = sprites.filter(s => (s as Phaser.GameObjects.Sprite).texture.key === 'crate');
        
        if (crates.length === 0) {
             console.error('No Crate obstacles found in scene.');
             return false;
        }

        console.log(`Found ${crates.length} crates.`);
        return true;
    }
};

// Register Tests
TestRunner.register(VisionSystemTest);
TestRunner.register(ObstacleMappingTest);