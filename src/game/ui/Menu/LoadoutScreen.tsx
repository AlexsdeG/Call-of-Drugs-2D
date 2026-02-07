import React, { useState, useEffect } from 'react';
import { WEAPON_DEFS } from '../../../config/constants';
import { ATTACHMENT_SLOTS, ATTACHMENTS, AttachmentType } from '../../../config/attachmentDefs';
import { ProfileService } from '../../services/ProfileService';
import { AttachmentSelector } from './AttachmentSelector';
import { EventBus } from '../../EventBus';
import { Profile } from '../../../schemas/profileSchema';

interface LoadoutScreenProps {
    onBack: () => void;
}

export const LoadoutScreen: React.FC<LoadoutScreenProps> = ({ onBack }) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [selectedWeaponKey, setSelectedWeaponKey] = useState<string>('PISTOL'); // Default
    const [activeSlot, setActiveSlot] = useState<AttachmentType | null>(null);
    const [hoveredAttachmentId, setHoveredAttachmentId] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('ALL');

    const categories = ['ALL', ...Array.from(new Set(Object.values(WEAPON_DEFS).map(d => d.category)))];

    const filteredWeapons = Object.entries(WEAPON_DEFS).filter(([_, def]) => 
        activeCategory === 'ALL' || def.category === activeCategory
    ).sort((a, b) => a[1].name.localeCompare(b[1].name));

    useEffect(() => {
        setProfile(ProfileService.getProfile());
        
        const handleProfileUpdate = (p: Profile) => setProfile(p);
        EventBus.on('profile-loaded', handleProfileUpdate);
        return () => {
            EventBus.off('profile-loaded', handleProfileUpdate);
        };
    }, []);

    const selectedWeaponDef = WEAPON_DEFS[selectedWeaponKey as keyof typeof WEAPON_DEFS];
    const weaponStats = profile?.weaponStats[selectedWeaponKey] || { 
        level: 1, xp: 0, kills: 0, headshots: 0, playTime: 0, 
        unlockedAttachments: [], unlockedSkins: [], equippedAttachments: {} as Record<string, string> 
    };
    const equippedAttachments = weaponStats.equippedAttachments || {} as Record<string, string>;

    const handleEquip = (attachmentId: string | undefined) => {
        if (!activeSlot || !profile) return;

        const updatedAttachments = { ...equippedAttachments };
        if (attachmentId) {
            updatedAttachments[activeSlot] = attachmentId;
        } else {
            delete updatedAttachments[activeSlot];
        }

        // Optimistic Update
        const updatedProfile = { ...profile };
        if (!updatedProfile.weaponStats[selectedWeaponKey]) {
            updatedProfile.weaponStats[selectedWeaponKey] = {
                kills: 0,
                headshots: 0,
                playTime: 0,
                xp: 0,
                level: 1,
                unlockedAttachments: [],
                unlockedSkins: [],
                equippedAttachments: {}
            }; 
        }
        updatedProfile.weaponStats[selectedWeaponKey].equippedAttachments = updatedAttachments;
        setProfile(updatedProfile);

        // Save
        ProfileService.updateProfile({ weaponStats: updatedProfile.weaponStats });
    };

    // Calculate Stats
    const getStat = (base: number, statKey: 'damageMult' | 'rangeMult' | 'spreadMult' | 'recoilMult') => {
        let val = base;
        
        // Apply Equipped
        Object.values(equippedAttachments).forEach(attId => {
            const def = ATTACHMENTS[attId];
            if (def && def.stats[statKey]) {
                val *= def.stats[statKey]!;
            }
        });

        // Apply Hovered (Difference)
        if (hoveredAttachmentId && activeSlot) {
            // Remove currently equipped in this slot from calc if any
             // If we are hovering a new item, we simulate swapping
             // First revert the current slot item effect efficiently? 
             // Simpler: recalculate from base excluding current slot, then add hovered
             
             val = base;
             Object.entries(equippedAttachments).forEach(([slot, attId]) => {
                 if (slot === activeSlot) return; // Skip current slot
                 const def = ATTACHMENTS[attId];
                 if (def && def.stats[statKey]) val *= def.stats[statKey]!;
             });
             
             const hoverDef = ATTACHMENTS[hoveredAttachmentId];
             if (hoverDef && hoverDef.stats[statKey]) val *= hoverDef.stats[statKey]!;
        }

        return val;
    };
    
    const baseDamage = selectedWeaponDef.damage;
    const finalDamage = getStat(baseDamage, 'damageMult');
    
    const baseRange = selectedWeaponDef.range;
    const finalRange = getStat(baseRange, 'rangeMult');
    
    const baseSpread = selectedWeaponDef.spread;
    const finalSpread = getStat(baseSpread, 'spreadMult'); // Lower is better
    
    const baseRecoil = selectedWeaponDef.recoil;
    const finalRecoil = getStat(baseRecoil, 'recoilMult'); // Lower is better

    const StatBar = ({ label, base, current, inverse = false }: { label: string, base: number, current: number, inverse?: boolean }) => {
        // Simple visualizer: Base is 50%. 
        // If current > base, show green add. If current < base, show red sub.
        // Inverse for Spread/Recoil: Lower is Green.
        
        const isImprovement = inverse ? current < base : current > base;
        const diff = Math.abs(current - base);
        const percentChange = (diff / base) * 100; // Just for display width scaling roughly
        
        return (
            <div className="mb-2">
                <div className="flex justify-between text-sm text-gray-400">
                    <span>{label}</span>
                    <span className={isImprovement ? 'text-green-400' : (diff < 0.01 ? 'text-gray-400' : 'text-red-400')}>
                        {current.toFixed(1)} {diff > 0.01 && `(${isImprovement ? '+' : ''}${(current-base).toFixed(1)})`}
                    </span>
                </div>
                <div className="h-2 bg-gray-700 rounded overflow-hidden flex">
                   <div className="h-full bg-white" style={{ width: '50%' }}></div>
                   {/* This is a very rough visualization, just showing if it goes up or down from 50% mark */}
                    {diff > 0.01 && (
                        <div 
                            className={`h-full ${isImprovement ? 'bg-green-500' : 'bg-red-500'}`} 
                            style={{ 
                                width: `${Math.min(percentChange, 50)}%` 
                                // Direction? HTML flow makes this append. 
                                // Ideally we need absolute positioning to show +/- from center.
                                // For now, just appending a colored bar to show "Change"
                            }} 
                        />
                    )}
                </div>
            </div>
        );
    };


    return (
        <div className="fixed inset-0 bg-black/95 flex text-white font-mono p-8 z-50 pointer-events-auto">
            {/* LEFT: Weapon List */}
            <div className="w-1/4 pr-4 border-r border-gray-800 flex flex-col">
                <h2 className="text-2xl font-bold mb-4 text-yellow-500">WEAPONS</h2>
                
                {/* Category Tabs */}
                <div className="flex gap-1 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-3 py-1 text-xs font-bold rounded transition-colors whitespace-nowrap ${
                                activeCategory === cat 
                                ? 'bg-yellow-500 text-black' 
                                : 'bg-gray-800 text-gray-400 hover:text-white'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="space-y-2 overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-gray-700">
                    {filteredWeapons.map(([key, def]) => (
                        <button
                            key={key}
                            className={`w-full text-left p-4 rounded border transition-all ${
                                selectedWeaponKey === key 
                                ? 'bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400' 
                                : 'bg-gray-900 border-gray-800 hover:bg-gray-800 text-gray-300'
                            }`}
                            onClick={() => { setSelectedWeaponKey(key); setActiveSlot(null); }}
                        >
                            <div className="font-bold">{def.name}</div>
                            <div className="flex justify-between items-center text-xs opacity-70">
                                <span>{def.category}</span>
                                {profile?.weaponStats[key] ? (
                                    <span className={selectedWeaponKey === key ? 'text-black/70' : 'text-yellow-500'}>
                                        Lvl {profile.weaponStats[key].level}
                                    </span>
                                ) : (
                                    <span className={selectedWeaponKey === key ? 'text-black/50' : 'text-gray-600'}>
                                        Lvl 1
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                    {filteredWeapons.length === 0 && (
                        <div className="text-gray-500 text-sm text-center py-4">No weapons found</div>
                    )}
                </div>
                <button onClick={onBack} className="mt-4 w-full p-4 border border-white/20 hover:bg-white/10 rounded shrink-0">
                    BACK
                </button>
            </div>

            <div className="w-2/4 px-8 flex flex-col items-center">
                <div className="flex items-baseline gap-4 mb-2">
                    <h1 className="text-4xl font-bold">{selectedWeaponDef.name}</h1>
                    <span className="text-2xl text-yellow-500 font-bold">LEVEL {weaponStats.level || 1}</span>
                </div>
                
                {/* XP Bar */}
                <div className="w-full mb-6">
                    {(() => {
                        const lvl = weaponStats.level || 1;
                        const currXp = weaponStats.xp || 0;
                        const prevReq = lvl === 1 ? 0 : Math.pow(lvl - 1, 2) * 250;
                        const nextReq = Math.pow(lvl, 2) * 250;
                        const progress = Math.min(100, Math.max(0, ((currXp - prevReq) / (nextReq - prevReq)) * 100));
                        
                        return (
                            <div className="relative w-full h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                                <div className="absolute top-0 left-0 h-full bg-yellow-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tracking-wider z-10 text-white/80">
                                    {Math.floor(currXp)} / {nextReq} XP
                                </div>
                            </div>
                        );
                    })()}
                </div>

                <div className="flex gap-8 text-sm text-gray-400 mb-8 border-b border-gray-800 pb-4 w-full justify-center">
                    <div className="flex flex-col items-center">
                        <span className="font-bold text-white text-lg">{(weaponStats.kills || 0).toLocaleString()}</span>
                        <span className="text-xs tracking-wider">KILLS</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="font-bold text-white text-lg">{(weaponStats.headshots || 0).toLocaleString()}</span>
                        <span className="text-xs tracking-wider">HEADSHOTS</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="font-bold text-white text-lg">
                            {(() => {
                                const sec = weaponStats.playTime || 0;
                                const hrs = Math.floor(sec / 3600);
                                const mins = Math.floor((sec % 3600) / 60);
                                return `${hrs}h ${mins}m`;
                            })()}
                        </span>
                        <span className="text-xs tracking-wider">PLAY TIME</span>
                    </div>
                </div>

                <div className="text-gray-500 mb-2">{selectedWeaponDef.category}</div>

                {/* Gun Visualization (Placeholder) */}
                <div className="w-full h-64 bg-gray-900 rounded mb-8 flex items-center justify-center border border-gray-800 relative">
                     <span className="text-4xl text-gray-700">NO PREVIEW</span>
                     {/* Slots overlaying the gun area */}
                     <div className="absolute top-4 right-4 flex gap-2">
                         {ATTACHMENT_SLOTS.map(slot => (
                             <button
                                key={slot}
                                onClick={() => setActiveSlot(slot === activeSlot ? null : slot)}
                                className={`w-12 h-12 rounded border flex items-center justify-center text-xs ${
                                    activeSlot === slot 
                                    ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' 
                                    : (equippedAttachments[slot] ? 'border-green-500 text-green-500' : 'border-gray-700 text-gray-700 hover:border-gray-500')
                                }`}
                             >
                                 {slot[0]}
                             </button>
                         ))}
                     </div>
                </div>

                {/* Attachment Selection Area */}
                <div className="w-full h-64">
                    {activeSlot ? (
                        <AttachmentSelector 
                            slot={activeSlot}
                            selectedId={equippedAttachments[activeSlot]}
                            onSelect={handleEquip} 
                            onHover={setHoveredAttachmentId}
                            weaponLevel={weaponStats.level || 1}
                        />
                    ) : (
                        <div className="text-center text-gray-500 mt-10">Select an attachment slot to customize</div>
                    )}
                </div>
            </div>

            {/* RIGHT: Stats */}
            <div className="w-1/4 pl-4 border-l border-gray-800">
                 <h2 className="text-xl font-bold mb-6 text-gray-300">STATS</h2>
                 <div className="space-y-6">
                     <StatBar label="DAMAGE" base={baseDamage} current={finalDamage} />
                     <StatBar label="RANGE" base={baseRange} current={finalRange} />
                     <StatBar label="ACCURACY" base={baseSpread} current={finalSpread} inverse />
                     <StatBar label="RECOIL" base={baseRecoil} current={finalRecoil} inverse />
                 </div>
                 
                 <div className="mt-8 p-4 bg-gray-900 rounded border border-gray-800">
                     <h3 className="text-sm font-bold text-gray-400 mb-2">EQUIPPED</h3>
                     {Object.entries(equippedAttachments).map(([slot, id]) => (
                         <div key={slot} className="flex justify-between text-xs py-1 border-b border-gray-800 last:border-0">
                             <span className="text-gray-500">{slot}</span>
                             <span className="text-yellow-500">{ATTACHMENTS[id]?.name || id}</span>
                         </div>
                     ))}
                     {Object.keys(equippedAttachments).length === 0 && <span className="text-xs text-gray-600">No attachments</span>}
                 </div>
            </div>
        </div>
    );
};
