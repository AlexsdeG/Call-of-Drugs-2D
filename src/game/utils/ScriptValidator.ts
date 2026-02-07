import { Script, ScriptAction, ActionType, ConditionType, TriggerType, VariableScope } from '../../schemas/scriptSchema';
import { GlobalVariable } from '../../schemas/mapSchema';

export interface ValidationError {
  line?: number; // Approximate, if we can map it back
  message: string;
  severity: 'error' | 'warning';
}

export class ScriptValidator {
  
  public static validate(script: Script, globalVars: GlobalVariable[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // 1. Check Triggers
    script.triggers.forEach(trigger => {
        // Evaluate conditions in trigger
        if (trigger.conditions) {
            trigger.conditions.forEach(cond => {
                this.validateCondition(cond, globalVars, errors);
            });
        }
    });

    // 2. Check Actions (recursive)
    this.validateActions(script.actions, globalVars, errors);

    return errors;
  }

  private static validateActions(actions: ScriptAction[], globalVars: GlobalVariable[], errors: ValidationError[]) {
      actions.forEach(action => {
          // Check Logic
          if (action.type === ActionType.IF && action.condition) {
              this.validateCondition(action.condition, globalVars, errors);
              if (action.then) this.validateActions(action.then, globalVars, errors);
              if (action.else) this.validateActions(action.else, globalVars, errors);
          }

          // Check Variable Usage
          if (action.type === ActionType.SET_VARIABLE) {
              const name = action.parameters?.name;
              const scope = action.parameters?.scope;
              
              if (scope === VariableScope.GLOBAL) {
                  const gVar = globalVars.find(v => v.name === name);
                  if (!gVar) {
                      errors.push({ 
                          message: `Variable '${name}' is not defined in Global Variables.`, 
                          severity: 'error' 
                      });
                  } else {
                      // Optional: Type check value against gVar.type
                  }
              }
          }
          
          // Check Recursive
          if (action.then) this.validateActions(action.then, globalVars, errors);
      });
  }

  private static validateCondition(condition: any, globalVars: GlobalVariable[], errors: ValidationError[]) {
      if (condition.type === ConditionType.VARIABLE_EQUALS) {
          const name = condition.parameters?.name; // Currently our schema uses name in params for this?
          // Wait, ConditionSchema params are generic z.record.
          // Convention needs to be consistent. 
          // Let's assume params: { name: "varname", value: "val" }
          
          // Note: ConditionSchema logic in ScriptEngine uses params.name for VARIABLE_EQUALS
          
          if (name) {
             // We can't easily check scope in Condition unless we enforce it in params. 
             // Currently ScriptEngine defaults to Global if not specified? 
             // Let's assume global check if no scope is provided or scope is GLOBAL.
             const scope = condition.parameters?.scope || VariableScope.GLOBAL;
             
             if (scope === VariableScope.GLOBAL) {
                 const gVar = globalVars.find(v => v.name === name);
                 if (!gVar) {
                      errors.push({ 
                          message: `Condition uses undefined Global Variable '${name}'.`, 
                          severity: 'error' 
                      });
                  }
             }
          }
      }
  }
}
