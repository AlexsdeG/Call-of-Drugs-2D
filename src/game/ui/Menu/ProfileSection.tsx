import React from 'react';
import { User, Trophy } from 'lucide-react';
import { useEmpireStore } from '../../../store/useEmpireStore';

export const ProfileSection = () => {
    const profile = useEmpireStore(state => state.profile);
    
    if (!profile) return (
        <div className="flex items-center gap-4 p-4 bg-gray-900/80 border-b border-gray-700">
            <div className="w-12 h-12 bg-gray-800 rounded-full animate-pulse" />
            <div className="h-4 w-32 bg-gray-800 rounded animate-pulse" />
        </div>
    );

    // Calculate XP Progress
    const prevLevelThreshold = Math.pow(profile.level - 1, 2) * 500;
    const nextLevelThreshold = Math.pow(profile.level, 2) * 500;
    const levelXp = profile.xp - prevLevelThreshold;
    const levelMax = nextLevelThreshold - prevLevelThreshold;
    const progress = Math.min(100, Math.max(0, (levelXp / levelMax) * 100));

    return (
        <div className="flex flex-col w-full p-6 bg-gradient-to-r from-gray-900 via-gray-900/90 to-transparent border-b border-gray-800 backdrop-blur-md">
            <div className="flex items-center gap-6">
                {/* Avatar / Rank Icon */}
                <div className="relative">
                    <div className="w-20 h-20 bg-gray-800 rounded-lg border-2 border-gray-600 flex items-center justify-center shadow-lg overflow-hidden">
                        {profile.avatar ? (
                             <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : profile.rankIcon ? (
                            <img src={profile.rankIcon} alt="Rank" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-10 h-10 text-gray-500" />
                        )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-yellow-600 text-white text-xs font-bold px-2 py-0.5 rounded border border-yellow-500 shadow-md">
                        LVL {profile.level}
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1">
                    <div className="flex justify-between items-baseline mb-1">
                        <h2 className="text-3xl font-black text-white tracking-wide uppercase drop-shadow-md">
                            {profile.name}
                        </h2>
                        <div className="text-xs font-mono text-gray-400">
                            {profile.xp.toLocaleString()} XP
                        </div>
                    </div>
                    
                    {/* XP Bar */}
                    <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                        <div 
                            className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-gray-500 font-mono">
                        <span>Rank {profile.level}</span>
                        <span>{Math.round(levelMax - levelXp)} XP TO NEXT LEVEL</span>
                    </div>
                </div>
            </div>
            
            {/* Quick Stats Ribbon */}
            <div className="flex gap-8 mt-6 text-gray-400 text-sm font-bold tracking-wider">
                <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span>HIGHEST ROUND: <span className="text-white">{profile.stats.highestRound}</span></span>
                </div>
                <div>
                    KILLS: <span className="text-white">{profile.stats.totalKills.toLocaleString()}</span>
                </div>
                <div>
                     TIME PLAYED: <span className="text-white">{Math.round(profile.stats.totalPlayTime / 60)}m</span>
                </div>
            </div>
        </div>
    );
};
