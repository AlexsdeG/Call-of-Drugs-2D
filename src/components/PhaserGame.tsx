import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '../config/gameConfig';
import { EventBus } from '../game/EventBus';

export const PhaserGame: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Ensure strict mode doesn't create duplicate games
    if (gameRef.current === null) {
      gameRef.current = new Phaser.Game(gameConfig);
      
      // Store globally for quick access (dev only usually)
      (window as any).phaserGame = gameRef.current;
      
      EventBus.emit('game-ready', gameRef.current);

      // Listen for Global Pause/Resume events triggered by React state changes
      EventBus.on('pause-game', () => {
         const game = gameRef.current;
         if (game) {
             const scene = game.scene.getScene('CityScene');
             if (scene && scene.scene.isActive()) {
                 scene.physics.pause();
                 scene.scene.pause();
             }
         }
      });

      EventBus.on('resume-game', () => {
        const game = gameRef.current;
        if (game) {
            const scene = game.scene.getScene('CityScene');
            if (scene && scene.scene.isPaused()) {
                scene.physics.resume();
                scene.scene.resume();
            }
        }
     });
    }

    return () => {
      // Cleanup on unmount
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      EventBus.off('pause-game');
      EventBus.off('resume-game');
    };
  }, []);

  return (
    <div id="phaser-container" className="absolute inset-0 z-0 bg-black" />
  );
};