import { useEmpireStore } from '../store/useEmpireStore';
import { ProfileService } from '../game/services/ProfileService';
import { DEFAULT_PROFILE } from '../schemas/profileSchema';

export async function runProfilePersistenceTest() {
    console.log('--- Profile Persistence & Session Reset Test ---');

    // 1. Initial State
    // Mock a loaded profile
    const initialProfile = { ...DEFAULT_PROFILE, name: 'Tester', id: '123' };
    initialProfile.stats.totalKills = 10;
    useEmpireStore.getState().setProfile(initialProfile);
    
    // 2. Simulate Game Start 1
    console.log('STEP 1: Starting Game 1');
    useEmpireStore.getState().resetSession(); // Verify this resets properly
    let stats = useEmpireStore.getState().playerStats;
    if (stats.kills !== 0) console.error('FAIL: Session kills not 0 on start!');

    // 3. Simulate Gameplay 1 (1 Kill)
    console.log('STEP 2: Kill 1 Zombie');
    useEmpireStore.getState().updatePlayerStats({ kills: 1 });
    // In MainGameScene, player.sessionStats would track this too.
    // Let's assume MainGameScene calls ProfileService.updateStats with session stats
    const sessionStats1 = { kills: 1, day: 1, headshots: 0, timePlayed: 10 };
    
    // 4. Simulate Save & Exit 1
    console.log('STEP 3: Saving Game 1');
    // Mock ProfileService.currentProfile to be the store profile
    (ProfileService as any).currentProfile = useEmpireStore.getState().profile;
    
    ProfileService.updateStats(sessionStats1); // This updates in-memory profile
    
    // Check Profile
    let p = useEmpireStore.getState().profile;
    if (p?.stats.totalKills !== 11) console.error(`FAIL: Expected 11 kills, got ${p?.stats.totalKills}`);
    else console.log('PASS: Kills updated to 11');

    // 5. Simulate Game Start 2 (User Issue: Did it reset?)
    console.log('STEP 4: Starting Game 2');
    // MainGameScene calls resetSessionStats
    useEmpireStore.getState().resetSession();
    
    stats = useEmpireStore.getState().playerStats;
    if (stats.kills !== 0) console.error('FAIL: Session kills not reset on Game 2!');
    else console.log('PASS: Session kills reset to 0');

    // 6. Simulate Gameplay 2 (1 Kill)
    console.log('STEP 5: Kill 1 Zombie (Game 2)');
    useEmpireStore.getState().updatePlayerStats({ kills: 1 });
    const sessionStats2 = { kills: 1, day: 1, headshots: 0, timePlayed: 10 };

    // 7. Simulate Save & Exit 2
    console.log('STEP 6: Saving Game 2');
    ProfileService.updateStats(sessionStats2);

    p = useEmpireStore.getState().profile;
    // Should be 11 (Start of Game 2) + 1 = 12.
    if (p?.stats.totalKills !== 12) console.error(`FAIL: Expected 12 kills, got ${p?.stats.totalKills}`);
    else console.log('PASS: Kills updated to 12');

    console.log('--- Test Complete ---');
}
