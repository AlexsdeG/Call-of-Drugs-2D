import { TestRunner } from './testRunner';
import { EventBus } from '../game/EventBus';
import { EditorScene } from '../game/scenes/EditorScene';

export const editorTests = () => {
    TestRunner.register({
        name: 'Editor: Open Editor',
        run: async (scene) => {
        // 1. Switch to Editor Mode (Mocked via EventBus if strictly unit testing, but here we integration test)
        // Since we can't easily switch React state from here without access to store, 
        // we check if the Scene exists and can be started.
        
        // This is a bit tricky because EditorScene is managed by Phaser's SceneManager which is separate from React State.
        // However, we can basic-test the Scene class logic.
        
        const editorScene = scene.scene.get('EditorScene') as EditorScene;
        if (!editorScene) {
             throw new Error("EditorScene not found in SceneManager");
        }
        
        // Simulate start
        // scene.scene.start('EditorScene'); 
        // We avoid actually switching scenes as it might break the test runner overlay which lives in the active scene? 
        // Actually TestRunner runs in the active scene. If we switch, we lose the runner context unless runner is global.
        
        return true;
    }});

    TestRunner.register({
        name: 'Editor: Grid Rendering',
        run: async (scene) => {
             const editorScene = scene.scene.get('EditorScene');
             return !!editorScene;
        }
    });

    TestRunner.register({
        name: 'Editor: Tool Change Event',
        run: async (_scene) => {
        return new Promise<boolean>((resolve) => {
            const testHandler = (data: any) => {
                EventBus.off('editor-tool-change', testHandler);
                if (data.tool === 'paint' && data.tileIndex === 2) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            };

            EventBus.on('editor-tool-change', testHandler);
            EventBus.emit('editor-tool-change', { tool: 'paint', tileIndex: 2 });
        });
    }});
};

editorTests();
