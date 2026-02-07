export type AttachmentType = 'SCOPE' | 'MUZZLE' | 'GRIP' | 'MAGAZINE';

export interface AttachmentStats {
    damageMult?: number;
    rangeMult?: number;
    spreadMult?: number;
    recoilMult?: number;
    fireRateMult?: number;
    magSizeMult?: number;
    reloadTimeMult?: number;
    speedMult?: number; // Movement speed
}

export interface AttachmentDef {
    id: string;
    name: string;
    type: AttachmentType;
    description: string;
    stats: AttachmentStats;
    cost: number; // Unlock cost (XP or Points, logic TBD)
    unlockLevel: number; // Weapon Level required
    icon?: string; // Asset key
}

export const ATTACHMENTS: Record<string, AttachmentDef> = {
    // --- SCOPES ---
    'red_dot': {
        id: 'red_dot',
        name: 'Red Dot Sight',
        type: 'SCOPE',
        description: 'Precision sight. Improves accuracy.',
        stats: { spreadMult: 0.8 },
        cost: 500,
        unlockLevel: 2
    },
    'holo': {
        id: 'holo',
        name: 'Holographic Sight',
        type: 'SCOPE',
        description: 'Better target acquisition.',
        stats: { spreadMult: 0.85, rangeMult: 1.1 },
        cost: 750,
        unlockLevel: 5
    },
    'sniper_scope': {
        id: 'sniper_scope',
        name: 'Sniper Scope',
        type: 'SCOPE',
        description: 'High magnification for long range.',
        stats: { spreadMult: 0.1, rangeMult: 2.0, speedMult: 0.9 },
        cost: 1500,
        unlockLevel: 10
    },

    // --- MUZZLES ---
    'suppressor': {
        id: 'suppressor',
        name: 'Suppressor',
        type: 'MUZZLE',
        description: 'Reduces noise and muzzle flash. Slightly reduces range.',
        stats: { rangeMult: 0.9, recoilMult: 0.9 },
        cost: 1000,
        unlockLevel: 8
    },
    'compensator': {
        id: 'compensator',
        name: 'Compensator',
        type: 'MUZZLE',
        description: 'Reduces vertical recoil.',
        stats: { recoilMult: 0.8, spreadMult: 0.95 },
        cost: 800,
        unlockLevel: 4
    },
    'long_barrel': {
        id: 'long_barrel',
        name: 'Long Barrel',
        type: 'MUZZLE',
        description: 'Increases range and bullet velocity.',
        stats: { rangeMult: 1.25, damageMult: 1.05 },
        cost: 1200,
        unlockLevel: 12
    },

    // --- GRIPS ---
    'foregrip': {
        id: 'foregrip',
        name: 'Vertical Foregrip',
        type: 'GRIP',
        description: 'Reduces recoil.',
        stats: { recoilMult: 0.75 },
        cost: 600,
        unlockLevel: 3
    },
    'angled_grip': {
        id: 'angled_grip',
        name: 'Angled Grip',
        type: 'GRIP',
        description: 'Improves handling and aim speed.',
        stats: { spreadMult: 0.85, reloadTimeMult: 0.95 },
        cost: 600,
        unlockLevel: 7
    },

    // --- MAGAZINES ---
    'ext_mag': {
        id: 'ext_mag',
        name: 'Extended Mag',
        type: 'MAGAZINE',
        description: 'Increased ammo capacity.',
        stats: { magSizeMult: 1.5, reloadTimeMult: 1.1 },
        cost: 900,
        unlockLevel: 6
    },
    'fast_mag': {
        id: 'fast_mag',
        name: 'Fast Mag',
        type: 'MAGAZINE',
        description: 'Faster reloads.',
        stats: { reloadTimeMult: 0.6 },
        cost: 900,
        unlockLevel: 9
    },
};

export const ATTACHMENT_SLOTS: AttachmentType[] = ['SCOPE', 'MUZZLE', 'GRIP', 'MAGAZINE'];
