import { ProfileSchema } from '../schemas/profileSchema';
import { ProfileService } from '../game/services/ProfileService';

export const runProfileTests = async () => {
    console.group('🧪 Running Profile System Tests');

    // TEST 1: Schema Validation
    console.log('Test 1: Schema Validation');
    const validProfile = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'TestPlayer',
        createdAt: Date.now(),
        lastPlayed: Date.now(),
        level: 5,
        xp: 1500,
        stats: {
            kills: 100,
            headshots: 10,
            gamesPlayed: 5,
            timePlayed: 3600,
            rounds: 15,
            points: 1000,
            ammo: 100,
            maxAmmo: 100,
            maxHealth: 100,
            maxStamina: 100,
            health: 100,
            stamina: 100
        },
        weaponStats: {},
        unlocks: ['weapon_ak47'],
        settings: {
            masterVolume: 1,
            musicVolume: 0.5,
            sfxVolume: 0.8,
            fov: 90
        }
    };

    const result = ProfileSchema.safeParse(validProfile);
    if (result.success) {
        console.log('✅ Valid Profile Passed');
    } else {
        console.error('❌ Valid Profile Failed', result.error);
    }

    const invalidProfile = {
        name: '', 
        level: -1, 
    };
    const result2 = ProfileSchema.safeParse(invalidProfile);
    if (!result2.success) {
        console.log('✅ Invalid Profile correctly rejected');
    } else {
        console.error('❌ Invalid Profile improperly accepted');
    }

    // TEST 2: Service Methods (Mock-ish)
    console.log('Test 2: Service Methods Availability');
    if (typeof ProfileService.saveProfile === 'function' && typeof ProfileService.loadProfile === 'function') {
        console.log('✅ Service methods defined');
    } else {
        console.error('❌ Service methods missing');
    }

    console.groupEnd();
};
