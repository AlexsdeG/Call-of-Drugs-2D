import { z } from 'zod';

// --- ENUMS ---

export enum TriggerType {
  ON_INTERACT = 'ON_INTERACT',
  ON_ZONE_ENTER = 'ON_ZONE_ENTER',
  ON_ZONE_LEAVE = 'ON_ZONE_LEAVE',
  ON_ROUND_START = 'ON_ROUND_START',
  ON_ROUND_END = 'ON_ROUND_END',
  ON_GAME_START = 'ON_GAME_START',
  ON_POWER_ON = 'ON_POWER_ON',
  ON_ZOMBIE_KILL = 'ON_ZOMBIE_KILL',
  ON_TICK = 'ON_TICK', // Use sparingly!
}

export enum ActionType {
  // Logic
  IF = 'IF',
  WAIT = 'WAIT',
  SET_VARIABLE = 'SET_VARIABLE',
  LOG = 'LOG',
  
  // Game Actions
  SHOW_TEXT = 'SHOW_TEXT',
  PLAY_SOUND = 'PLAY_SOUND',
  SPAWN_POLICE = 'SPAWN_POLICE',
  KILL_ALL_POLICE = 'KILL_ALL_POLICE',
  OPEN_DOOR = 'OPEN_DOOR',
  CLOSE_DOOR = 'CLOSE_DOOR',
  TELEPORT_PLAYER = 'TELEPORT_PLAYER',
  GIVE_WEAPON = 'GIVE_WEAPON',
  ACTIVATE_OBJECT = 'ACTIVATE_OBJECT',
  SET_OBJECT_PROPERTY = 'SET_OBJECT_PROPERTY',
}

export enum ConditionType {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  HAS_TAG = 'HAS_TAG', // e.g., check if player has a perk or item
  IS_ALIVE = 'IS_ALIVE',
  VARIABLE_EQUALS = 'VARIABLE_EQUALS', // Compare variable to value
}

export enum VariableScope {
  GLOBAL = 'GLOBAL', // Per Game
  LOCAL = 'LOCAL',   // Per Object context
}

// --- SCHEMAS ---

export const ConditionSchema = z.object({
  type: z.nativeEnum(ConditionType),
  parameters: z.record(z.string(), z.any()).optional(), // e.g. { value: 5, varName: "round" }
});

// Recursive Action Schema using z.lazy for nested actions (Logic)
export const ActionSchema: z.ZodType<any> = z.lazy(() => z.object({
  type: z.nativeEnum(ActionType),
  // Parameters for specific actions
  parameters: z.record(z.string(), z.any()).optional(),
  
  // Logic Flow
  condition: ConditionSchema.optional(), // For IF
  then: z.array(ActionSchema).optional(), // For IF (true)
  else: z.array(ActionSchema).optional(), // For IF (false)
}));

export const TriggerSchema = z.object({
  type: z.nativeEnum(TriggerType),
  parameters: z.record(z.string(), z.any()).optional(),
  conditions: z.array(ConditionSchema).optional(), // Optional pre-conditions for the trigger to fire
});

export const ScriptSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  triggers: z.array(TriggerSchema),
  actions: z.array(ActionSchema),
  enabled: z.boolean().default(true),
});

// --- TYPES ---

export type ScriptTrigger = z.infer<typeof TriggerSchema>;
export type ScriptAction = z.infer<typeof ActionSchema>;
export type ScriptCondition = z.infer<typeof ConditionSchema>;
export type Script = z.infer<typeof ScriptSchema>;

