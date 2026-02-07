import React, { useState, useEffect } from 'react';
import { ProfileService } from '../../services/ProfileService';
import { useEmpireStore } from '../../../store/useEmpireStore';
import { ProfileSection } from './ProfileSection';
import { MainMenuButtons } from './MainMenuButtons';
import { SaveLoadProfileModal } from './SaveLoadProfileModal';
import { LoadoutScreen } from './LoadoutScreen';
import { GameSetupScreen } from './GameSetupScreen';
import { EventBus } from '../../EventBus';
import { VERSION } from '../../../config/constants';

type MenuView = 'MAIN' | 'LOADOUT' | 'SETUP';

export const MenuOverlay = () => {
    const [showSaveLoad, setShowSaveLoad] = useState(false);
    const [currentView, setCurrentView] = useState<MenuView>('MAIN');

    // Init Profile Service on mount if not already loaded
    useEffect(() => {
        // Just sync current profile state, don't force reload from disk
        const p = ProfileService.getProfile();
        useEmpireStore.getState().setProfile(p);
        
        // Listen for profile updates
        const handleProfileLoaded = (p: any) => {
            useEmpireStore.getState().setProfile(p);
        };
        
        EventBus.on('profile-loaded', handleProfileLoaded);
        EventBus.on('profile-saved', () => { /* maybe show toast */ });
        
        return () => {
            EventBus.off('profile-loaded', handleProfileLoaded);
        };
    }, []);

    if (currentView === 'LOADOUT') {
        return <LoadoutScreen onBack={() => setCurrentView('MAIN')} />;
    }

    if (currentView === 'SETUP') {
        return <GameSetupScreen onBack={() => setCurrentView('MAIN')} />;
    }

    return (
        <div className="absolute inset-0 bg-black text-white z-50 pointer-events-auto flex font-sans overflow-hidden">
            {/* Background Image / Video Placeholder */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-80" />
            <div className="absolute inset-0 bg-[url('/assets/bg_pattern.png')] opacity-5 mix-blend-overlay" />
            
            {/* Content Container */}
            <div className="relative z-10 w-full h-full flex flex-col">
                
                {/* Top Bar: Profile Section */}
                <ProfileSection />

                <div className="flex-1 flex p-12 gap-12">
                     {/* Left Column: Navigation */}
                     <div className="flex flex-col gap-8">
                         <div className="mb-4">
                            <h1 className="text-6xl font-black text-white tracking-tighter italic drop-shadow-2xl">
                                CALL OF <span className="text-red-600">2D</span> ZOMBIES
                            </h1>
                            <div className="text-gray-500 font-mono tracking-[0.5em] text-sm ml-1 mt-2">TACTICAL SURVIVAL</div>
                         </div>
                         
                         <MainMenuButtons 
                            onDeploy={() => setCurrentView('SETUP')}
                            onOpenLoadout={() => setCurrentView('LOADOUT')} 
                            onOpenSettings={() => console.log("Settings")}
                            onOpenSaveLoad={() => setShowSaveLoad(true)}
                         />
                     </div>
                     
                     {/* Right Column: Dynamic Content / Character Preview */}
                     <div className="flex-1 border border-gray-800 bg-black/20 rounded-lg relative overflow-hidden flex items-center justify-center group">
                         {/* Placeholder for Character Model Renderer */}
                         <div className="text-gray-700 font-black text-9xl tracking-tighter opacity-20 group-hover:opacity-30 transition-opacity select-none rotate-12">
                             OPERATOR
                         </div>
                         
                         <div className="absolute bottom-4 right-4 text-xs font-mono text-gray-500">
                             PREVIEW MODE
                         </div>
                     </div>
                </div>

                {/* Footer */}
                <div className="h-12 border-t border-gray-800 bg-black/80 flex items-center justify-between px-6 text-xs text-gray-500 font-mono uppercase tracking-wider">
                    <div className="flex items-center gap-4">
                        <span className="text-green-500 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            ONLINE SERVICE: ACTIVE
                        </span>
                        <span>|</span>
                        <span>REGION: EUROPE</span>
                    </div>
                    <div>
                        VER {VERSION} // ID: 8842-ALPHA
                    </div>
                </div>
            </div>
            
            {/* Modals */}
            {showSaveLoad && <SaveLoadProfileModal onClose={() => setShowSaveLoad(false)} />}
        </div>
    );
};
