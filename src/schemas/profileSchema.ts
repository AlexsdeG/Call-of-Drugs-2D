import { z } from 'zod';
import { ATTACHMENT_SLOTS } from '../config/attachmentDefs';

// --- SUB-SCHEMAS ---

export const WeaponStatsSchema = z.object({
  kills: z.number().default(0),
  headshots: z.number().default(0),
  xp: z.number().default(0),
  level: z.number().default(1),
  playTime: z.number().default(0), // Seconds
  unlockedAttachments: z.array(z.string()).default([]),
  unlockedSkins: z.array(z.string()).default([]),
  // Map of Slot (SCOPE) -> AttachmentID (red_dot)
  equippedAttachments: z.record(z.enum(['SCOPE', 'MUZZLE', 'GRIP', 'MAGAZINE']), z.string()).default({}),
});

export const PlayerStatsSchema = z.object({
  totalKills: z.number().default(0),
  totalDeaths: z.number().default(0),
  gamesPlayed: z.number().default(0),
  highestRound: z.number().default(0),
  totalPlayTime: z.number().default(0), // in seconds
  headshotPercentage: z.number().default(0),
});

export const GameSettingsSchema = z.object({
  volumeMaster: z.number().min(0).max(1).default(0.5),
  volumeSfx: z.number().min(0).max(1).default(0.5),
  volumeMusic: z.number().min(0).max(1).default(0.5),
  fov: z.number().min(60).max(120).default(90),
  showFps: z.boolean().default(false),
  autoSaveInterval: z.number().default(60), // seconds
});

// --- MAIN PROFILE SCHEMA ---

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(20),
  createdAt: z.number(), // timestamp
  lastPlayed: z.number(),
  
  level: z.number().default(1),
  xp: z.number().default(0),
  rankIcon: z.string().optional(), // Asset key
  avatar: z.string().optional(), // Base64 Data URI

  stats: PlayerStatsSchema,
  
  // Map of WeaponID -> WeaponStats
  weaponStats: z.record(z.string(), WeaponStatsSchema).default({}),
  
  unlocks: z.array(z.string()).default([]), // IDs of unlocked items (Perks, Weapons)
  
  settings: GameSettingsSchema,
});

export type Profile = z.infer<typeof ProfileSchema>;
export type WeaponStats = z.infer<typeof WeaponStatsSchema>;
export type PlayerStats = z.infer<typeof PlayerStatsSchema>;
export type GameSettings = z.infer<typeof GameSettingsSchema>;

export const DEFAULT_PROFILE: Profile = {
    id: 'default-id-000', // Should be generated
    name: 'Soldier',
    createdAt: Date.now(),
    lastPlayed: Date.now(),
    level: 1,
    xp: 0,
    stats: {
        totalKills: 0,
        totalDeaths: 0,
        gamesPlayed: 0,
        highestRound: 0,
        totalPlayTime: 0,
        headshotPercentage: 0
    },
    weaponStats: {}, // Loadouts will be initialized lazily or be empty by default
    unlocks: [],
    settings: {
        volumeMaster: 0.5,
        volumeSfx: 0.5,
        volumeMusic: 0.5,
        fov: 90,
        showFps: false,
        autoSaveInterval: 60
    }
};
