import Phaser from 'phaser';

/**
 * Handles sound playback with fallback categories.
 * Usage: SoundManager.play(scene, 'fire', 'weapons/pistol');
 */
export class SoundManager {
    
    /**
     * Attempts to play a sound.
     * Safely ignores calls if the audio key is missing in the cache.
     */
    static play(scene: Phaser.Scene, key: string, config?: Phaser.Types.Sound.SoundConfig) {
        if (!scene || !scene.sound) return;

        // Check if the sound exists in the cache
        if (scene.cache.audio.exists(key)) {
            try {
                scene.sound.play(key, config);
            } catch (e) {
                console.warn(`SoundManager: Error playing ${key}`, e);
            }
        } else {
            // Silently ignore missing sounds in dev to prevent console spam
            // console.debug(`SoundManager: Audio key '${key}' missing.`);
        }
    }
}