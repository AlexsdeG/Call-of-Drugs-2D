import React from 'react';
import { Play, Map, Settings, Backpack, FileDown } from 'lucide-react';
import { useEmpireStore } from '../../../store/useEmpireStore';
import { GameState } from '../../../types';

interface Props {
    onDeploy: () => void;
    onOpenLoadout: () => void;
    onOpenSettings: () => void;
    onOpenSaveLoad: () => void;
}

export const MainMenuButtons: React.FC<Props> = ({ onDeploy, onOpenLoadout, onOpenSettings, onOpenSaveLoad }) => {
    const setGameState = useEmpireStore(state => state.setGameState);
    const resetPlayerStats = useEmpireStore(state => state.resetPlayerStats);

    const handlePlay = () => {
        resetPlayerStats();
        // setGameState(GameState.GAME); // Moved to GameSetupScreen
        onDeploy();
    };

    const handleEditor = () => {
        setGameState(GameState.EDITOR);
    };

    return (
        <div className="flex flex-col gap-3 w-80">
            <MenuButton 
                label="DEPLOY" 
                sublabel="SURVIVAL MODE"
                icon={<Play className="w-6 h-6 fill-current" />} 
                onClick={handlePlay} 
                primary 
            />
            
            <div className="h-px bg-gray-700 w-full my-2 opacity-50" />
            
            <MenuButton 
                label="MAP EDITOR" 
                sublabel="CREATE & SHARE"
                icon={<Map className="w-5 h-5" />} 
                onClick={handleEditor} 
            />

            <MenuButton 
                label="LOADOUT" 
                sublabel="CUSTOMIZE WEAPONS" // Coming Soon
                icon={<Backpack className="w-5 h-5" />} 
                onClick={onOpenLoadout}
                // Phase 5.2 - Enabled
            />
            
            <MenuButton
                 label="PROFILE & SAVES"
                 sublabel="MANAGE DATA"
                 icon={<FileDown className="w-5 h-5"/>}
                 onClick={onOpenSaveLoad}
            />

            <MenuButton 
                label="SETTINGS" 
                sublabel="AUDIO & VIDEO" // Coming Soon
                icon={<Settings className="w-5 h-5" />} 
                onClick={onOpenSettings}
                disabled // Later step
            />
        </div>
    );
};

const MenuButton = ({ 
    label, 
    sublabel, 
    icon, 
    onClick, 
    primary = false,
    disabled = false
}: { 
    label: string, 
    sublabel?: string, 
    icon: React.ReactNode, 
    onClick: () => void, 
    primary?: boolean,
    disabled?: boolean
}) => {
    return (
        <button 
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={`
                group relative flex items-center gap-4 px-6 py-4 w-full text-left transition-all duration-200
                ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:translate-x-2 cursor-pointer'}
                ${primary 
                    ? 'bg-gradient-to-r from-red-900/80 to-transparent hover:from-red-800/90 border-l-4 border-red-600' 
                    : 'bg-gradient-to-r from-gray-900/50 to-transparent hover:from-gray-800/60 border-l-4 border-transparent hover:border-gray-500'}
            `}
        >
            <div className={`p-2 rounded bg-black/20 ${primary ? 'text-red-400 group-hover:text-white' : 'text-gray-400 group-hover:text-white'} transition-colors`}>
                {icon}
            </div>
            <div>
                <div className={`text-xl font-black tracking-wider ${primary ? 'text-white' : 'text-gray-200'} group-hover:text-white`}>
                    {label}
                </div>
                {sublabel && (
                    <div className="text-[10px] font-mono text-gray-500 group-hover:text-red-400 tracking-widest uppercase">
                        {sublabel}
                    </div>
                )}
            </div>
            
            {/* Hover Glitch Effect Line */}
            <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-white/20 group-hover:w-full transition-all duration-500" />
        </button>
    );
};
