import React, { useState } from 'react';
import { useEmpireStore } from '../../../store/useEmpireStore';
import { GameState } from '../../../types';

interface GameSetupScreenProps {
    onBack: () => void;
}

export const GameSetupScreen: React.FC<GameSetupScreenProps> = ({ onBack }) => {
    const setGameState = useEmpireStore(state => state.setGameState);
    
    // Setup State
    const [difficulty, setDifficulty] = useState<'EASY' | 'NORMAL' | 'HARD'>('NORMAL');
    const [mapName, setMapName] = useState<string>('Default Map');
    const [fogDensity, setFogDensity] = useState<number>(0.65);
    
    const handleStartGame = () => {
        // Here we could inject these settings into a GameSettings store or pass them via query params/context
        // For now, we assume global config or future dynamic settings injection
        // TODO: Pass these settings to the Game Scene
        console.log("Starting Game with:", { difficulty, mapName, fogDensity });
        
        // Reset Session before starting
        useEmpireStore.getState().resetSession();

        // Transition
        setGameState(GameState.GAME);
    };

    return (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 font-mono text-white pointer-events-auto">
            <div className="w-[600px] bg-gray-900 border border-gray-700 rounded-lg p-8 shadow-2xl">
                <h1 className="text-3xl font-bold mb-2 text-yellow-500">MISSION BRIEFING</h1>
                <div className="text-gray-400 mb-8 border-b border-gray-700 pb-4">Configure your operation parameters.</div>

                {/* Map Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-400 mb-2">OPERATIONAL AREA</label>
                    <div className="flex gap-2">
                        {['Default Map', 'Bunker', 'Forest'].map(m => (
                            <button
                                key={m}
                                onClick={() => setMapName(m)}
                                className={`flex-1 p-3 border rounded transition-colors ${
                                    mapName === m 
                                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' 
                                    : 'bg-black/40 border-gray-700 hover:border-gray-500 text-gray-500'
                                }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Difficulty */}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-400 mb-2">THREAT LEVEL</label>
                    <div className="flex gap-2">
                        {['EASY', 'NORMAL', 'HARD'].map(d => (
                            <button
                                key={d}
                                onClick={() => setDifficulty(d as any)}
                                className={`flex-1 p-3 border rounded transition-colors ${
                                    difficulty === d 
                                    ? 'bg-red-500/20 border-red-500 text-red-500' 
                                    : 'bg-black/40 border-gray-700 hover:border-gray-500 text-gray-500'
                                }`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 h-4">
                        {difficulty === 'EASY' && "For recruits. Zombies are slower and weaker."}
                        {difficulty === 'NORMAL' && "Standard engagement protocols."}
                        {difficulty === 'HARD' && "You will not survive."}
                    </div>
                </div>

                {/* Fog Density (Atmosphere) */}
                <div className="mb-8">
                     <label className="block text-sm font-bold text-gray-400 mb-2">VISIBILITY CONDITIONS</label>
                     <input 
                        type="range" 
                        min="0" max="1" step="0.05"
                        value={fogDensity}
                        onChange={(e) => setFogDensity(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                     />
                     <div className="flex justify-between text-xs text-gray-500 mt-1">
                         <span>Clear</span>
                         <span>Pitch Black</span>
                     </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t border-gray-700">
                    <button 
                        onClick={onBack}
                        className="flex-1 p-4 border border-gray-600 hover:bg-gray-800 rounded font-bold text-gray-400"
                    >
                        ABORT
                    </button>
                    <button 
                        onClick={handleStartGame}
                        className="flex-[2] p-4 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded shadow-lg shadow-yellow-900/20"
                    >
                        DEPLOY
                    </button>
                </div>
            </div>
        </div>
    );
};
