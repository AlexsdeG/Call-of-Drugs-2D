# Script Editor Documentation

The Scripting System allows you to add custom logic to your map objects and global game events. It uses a secure, JSON-based structure to define **Triggers** and **Actions**.

## Concepts

### Triggers
Events that cause a script to run.
- `ON_GAME_START`: Runs once when the map loads.
- `ON_INTERACT`: Runs when player presses 'F' on the object.
- `ON_ZONE_ENTER`: Runs when player enters a Trigger Zone.
- `ON_ZONE_LEAVE`: Runs when player leaves a Trigger Zone.
- `ON_ROUND_START`: Runs at the start of every wave.
- `ON_ZOMBIE_KILL`: Runs whenever a zombie dies (Global).

### Actions
Commands that execute when a trigger fires.
- **Logic**: `IF`, `WAIT`, `SET_VARIABLE`, `LOG`.
- **Game**: `SHOW_TEXT`, `PLAY_SOUND`, `SPAWN_ZOMBIE`, `OPEN_DOOR`, `TELEPORT_PLAYER`.

### Variables
Store data to create complex logic (e.g., counting kills, tracking state).
- **Global**: Shared across the entire game (e.g., "quest_step").
- **Local**: Specific to an object (e.g., "isOpen").

---

## Language Reference

### Logic Actions

#### `IF` (Condition)
Checks a condition.
```json
{
  "type": "IF",
  "condition": {
    "type": "VARIABLE_EQUALS",
    "parameters": { "name": "hasKey", "value": true }
  },
  "then": [ ... actions ... ],
  "else": [ ... actions ... ]
}
```

#### `WAIT`
Pauses execution for milliseconds.
```json
{
  "type": "WAIT", 
  "parameters": { "ms": 1000 }
}
```

#### `SET_VARIABLE`
Sets a value.
```json
{
  "type": "SET_VARIABLE", 
  "parameters": { 
    "name": "doorLocked", 
    "value": false,
    "scope": "GLOBAL" 
  }
}
```

### Conditions
Used in `IF` actions or Triggers.
- `EQUALS`, `NOT_EQUALS`, `GREATER_THAN`, `LESS_THAN`
- `VARIABLE_EQUALS`: check a variable.
- `IS_ALIVE`: check if entity is alive.

---

## Examples

### 1. Simple Door (Requires Key)
**Trigger**: `ON_INTERACT`
**Script**:
```json
[
  {
    "type": "IF",
    "condition": {
      "type": "VARIABLE_EQUALS",
      "parameters": { "name": "has_red_key", "value": true }
    },
    "then": [
      { "type": "OPEN_DOOR", "parameters": { "doorId": "door_1" } },
      { "type": "SHOW_TEXT", "parameters": { "text": "Door Opened!" } }
    ],
    "else": [
      { "type": "SHOW_TEXT", "parameters": { "text": "Locked. Find the Red Key." } }
    ]
  }
]
```

### 2. Wave Spawner
**Trigger**: `ON_ROUND_START`
**Script**:
```json
[
  { "type": "WAIT", "parameters": { "ms": 2000 } },
  { "type": "SHOW_TEXT", "parameters": { "text": "Zombies Incoming!" } },
  { "type": "SPAWN_ZOMBIE", "parameters": { "type": "runner", "count": 5 } }
]
```
