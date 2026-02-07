import { Script, ScriptAction, TriggerType, ActionType, ConditionType, VariableScope, ScriptCondition } from '../../schemas/scriptSchema';
import { CityScene } from '../scenes/CityScene';
import { Police } from '../entities/Police';

export class ScriptEngine {
  private scene: CityScene;
  private scripts: Script[] = [];
  
  // Variables State
  private globalVariables: Map<string, any> = new Map();
  // We could have local variables map keyed by object ID if needed, mainly for "LOCAL" scope
  private objectVariables: Map<string, Map<string, any>> = new Map();

  constructor(scene: CityScene) {
    this.scene = scene;
  }

  public registerScripts(scripts: Script[]) {
    this.scripts = [...this.scripts, ...scripts];
    console.log(`[ScriptEngine] Registered ${scripts.length} scripts. Total: ${this.scripts.length}`);
  }

  public clearScripts() {
    this.scripts = [];
    this.objectVariables.clear();
    // Global variables usually persist per session, but maybe clear on map load?
    this.globalVariables.clear(); 
  }

  public initializeGlobals(definitions: any[]) {
      definitions.forEach(def => {
          this.globalVariables.set(def.name, def.initialValue);
      });
      console.log(`[ScriptEngine] Initialized ${definitions.length} global variables.`);
  }

  public trigger(type: TriggerType, context: Record<string, any> = {}) {
    // Find all scripts that have a matching trigger and pass basic checks
    const matchingScripts = this.scripts.filter(script => 
      script.enabled && script.triggers.some(trigger => this.evaluateTrigger(trigger, type, context))
    );

    matchingScripts.forEach(async script => {
      // console.log(`[ScriptEngine] Triggered script: ${script.name}`);
      await this.executeActions(script.actions, context);
    });
  }

  private evaluateTrigger(trigger: any, type: TriggerType, context: Record<string, any>): boolean {
    if (trigger.type !== type) return false;

    // Check parameters match (e.g., Zone ID)
    if (trigger.parameters) {
      for (const [key, value] of Object.entries(trigger.parameters)) {
        if (context[key] !== value) return false;
      }
    }
    
    // Check extra Conditions if any
    if (trigger.conditions && trigger.conditions.length > 0) {
        for (const condition of trigger.conditions) {
            if (!this.evaluateCondition(condition, context)) return false;
        }
    }

    return true;
  }

  private evaluateCondition(condition: ScriptCondition, context: Record<string, any>): boolean {
      const params = condition.parameters || {};
      
      switch (condition.type) {
          case ConditionType.EQUALS:
              return context[params.key] === params.value;
          case ConditionType.NOT_EQUALS:
              return context[params.key] !== params.value;
          case ConditionType.GREATER_THAN:
              return context[params.key] > params.value;
          case ConditionType.LESS_THAN:
              return context[params.key] < params.value;
          case ConditionType.IS_ALIVE:
              // Check if entity in context is active
              return context.entity && context.entity.active;
          case ConditionType.VARIABLE_EQUALS: {
              const val = this.getVariable(params.name, params.scope, context.objectId);
              return val === params.value;
          }
           case ConditionType.HAS_TAG:
              // Placeholder for tagging system
              return true; 
          default:
              return false;
      }
  }

  private getVariable(name: string, scope: VariableScope = VariableScope.GLOBAL, objectId?: string): any {
      if (scope === VariableScope.LOCAL && objectId) {
          return this.objectVariables.get(objectId)?.get(name);
      }
      return this.globalVariables.get(name);
  }

  private setVariable(name: string, value: any, scope: VariableScope = VariableScope.GLOBAL, objectId?: string) {
      if (scope === VariableScope.LOCAL && objectId) {
          if (!this.objectVariables.has(objectId)) {
              this.objectVariables.set(objectId, new Map());
          }
          this.objectVariables.get(objectId)!.set(name, value);
      } else {
          this.globalVariables.set(name, value);
      }
  }

  private async executeActions(actions: ScriptAction[], context: Record<string, any>) {
    for (const action of actions) {
      switch (action.type) {
        // --- LOGIC ---
        case ActionType.WAIT:
            if (action.parameters?.ms) {
                await new Promise(resolve => setTimeout(resolve, action.parameters.ms));
            }
            break;
            
        case ActionType.IF:
            if (action.condition && this.evaluateCondition(action.condition, context)) {
                if (action.then) await this.executeActions(action.then, context);
            } else {
                if (action.else) await this.executeActions(action.else, context);
            }
            break;

        case ActionType.SET_VARIABLE:
             if (action.parameters?.name) {
                 this.setVariable(
                     action.parameters.name, 
                     action.parameters.value, 
                     action.parameters.scope as VariableScope, // Cast carefully, maybe validate
                     context.objectId
                 );
             }
             break;
             
        case ActionType.LOG:
            console.log(`[SCRIPT LOG]:`, action.parameters?.message, context);
            break;

        // --- GAME ACTIONS ---
        case ActionType.SHOW_TEXT:
          this.scene.events.emit('show-toast', action.parameters?.text || 'Script Text');
          break;
          
        case ActionType.PLAY_SOUND:
           if (action.parameters?.soundId) {
             this.scene.sound.play(action.parameters.soundId);
           }
          break;

        case ActionType.KILL_ALL_POLICE:
            (this.scene as any).policeGroup.children.each((p: any) => p.takeDamage(1000));
            break;
          
        case ActionType.SPAWN_POLICE:
          // Use SpawnManager or direct instantiation if simple
          // For now, emit event or call scene method
           console.log('[ScriptEngine] Spawn Police', action.parameters);
           // Logic to spawn at specific x,y or spawner ID
          break;
          
        case ActionType.OPEN_DOOR:
             if (action.parameters?.doorId) {
                  console.log(`[ScriptEngine] Opens door ${action.parameters.doorId}`);
                  // Find door entity in scene and call open()
             }
          break;
          
         case ActionType.TELEPORT_PLAYER:
             if (this.scene.player && action.parameters?.x !== undefined && action.parameters?.y !== undefined) {
                 this.scene.player.setPosition(action.parameters.x, action.parameters.y);
             }
             break;
             
        default:
          console.warn(`[ScriptEngine] Unknown action type: ${action.type}`);
      }
    }
  }

  // Called every frame by MainGameScene
  public update(time: number, delta: number) {
      // Potentially trigger ON_TICK here, but be careful of performance!
      // this.trigger(TriggerType.ON_TICK, { time, delta });
      
      // Also check TriggerZones logic here if not handled by physics overlap
  }
}
