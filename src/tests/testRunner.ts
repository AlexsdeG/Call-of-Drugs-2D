import Phaser from 'phaser';

/**
 * Interface for a runnable test suite
 */
export interface GameTest {
    name: string;
    run: (scene: Phaser.Scene) => Promise<boolean>;
}

export class TestRunner {
    private static tests: GameTest[] = [];
    private static activeScene: Phaser.Scene | null = null;

    static register(test: GameTest) {
        this.tests.push(test);
    }

    static registerTests(tests: GameTest[]) {
        this.tests.push(...tests);
    }

    static setScene(scene: Phaser.Scene) {
        this.activeScene = scene;
    }

    static async runAll() {
        console.log(`%c[TestRunner] Starting ${this.tests.length} tests...`, 'color: cyan; font-weight: bold;');
        
        if (!this.activeScene) {
            console.error('[TestRunner] No active scene found to run tests against.');
            return;
        }

        let passed = 0;
        let failed = 0;

        for (const test of this.tests) {
            console.groupCollapsed(`Running: ${test.name}`);
            try {
                const result = await test.run(this.activeScene);
                if (result) {
                    console.log(`%c PASS`, 'color: green');
                    passed++;
                } else {
                    console.error(`%c FAIL`, 'color: red');
                    failed++;
                }
            } catch (e) {
                console.error(`%c ERROR: ${e}`, 'color: red');
                failed++;
            }
            console.groupEnd();
        }

        console.log(`%c[TestRunner] Finished. Passed: ${passed}, Failed: ${failed}`, 'color: cyan; font-weight: bold;');
    }
}