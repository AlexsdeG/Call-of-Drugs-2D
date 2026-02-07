import { ScriptEngine } from '../game/systems/ScriptEngine';
import { TriggerType, ActionType, Script } from '../schemas/scriptSchema';
import { MainGameScene } from '../game/scenes/MainGameScene';

// Mock Scene
const mockScene = {
  events: {
    emit: (event: string, data: any) => { console.log(`[Event] ${event}:`, data); }
  },
  sound: {
    play: (id: string) => { console.log(`[Sound] Playing ${id}`); }
  }
} as unknown as MainGameScene;

export function runScriptTests() {
  console.log('--- Running Script Engine Tests ---');
  
  const engine = new ScriptEngine(mockScene);
  
  const testScript: Script = {
    id: 'test-script-1',
    name: 'Test Script',
    enabled: true,
    triggers: [
      { type: TriggerType.ON_GAME_START },
      { type: TriggerType.ON_INTERACT, parameters: { objectId: 'door-1' } }
    ],
    actions: [
      { type: ActionType.SHOW_TEXT, parameters: { text: "Game Started!" } }
    ]
  };
  
  engine.registerScripts([testScript]);
  
  console.log('Test 1: Trigger ON_GAME_START (Should fire)');
  engine.trigger(TriggerType.ON_GAME_START);
  
  console.log('Test 2: Trigger ON_INTERACT with correct ID (Should fire)');
  engine.trigger(TriggerType.ON_INTERACT, { objectId: 'door-1' });
  
  console.log('Test 3: Trigger ON_INTERACT with wrong ID (Should NOT fire)');
  engine.trigger(TriggerType.ON_INTERACT, { objectId: 'door-2' });
  
  console.log('--- Script Tests Complete ---');
}

// Auto-run if executed directly (e.g. via node, though this needs ts-node setup usually)
// For this environment, we rely on invoking this function or importing it.
