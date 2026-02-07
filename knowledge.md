# Project Knowledge Base: "Empire Builder" (Schedule 1 Clone)

## 1. Project Overview
**Concept:** A 2D top-down open-world management RPG. The player starts as a street-level dealer and builds a criminal empire.
**Core Loop:** Buy Ingredients $\rightarrow$ Produce Product (Minigames/Time) $\rightarrow$ Transport (Risk) $\rightarrow$ Sell (Profit) $\rightarrow$ Invest (Real Estate/Equipment).
**Visual Style:** Top-down pixel art (similar to GTA 2 / RimWorld).
**Technical Base:** Forked from "Call of 2D Zombies" (Phaser 3 + React + TypeScript).

---

## 2. Tech Stack & Dependencies

### Core Frameworks
* **Engine:** `phaser` (v3.80+) - Handles rendering, physics (Arcade), input, and world logic.
* **UI Layer:** `react`, `react-dom` - Handles HUD, Phone, Inventory, Crafting, and Shop interfaces.
* **State Management:** `zustand` - Acts as the **Bridge** between Phaser (Game Loop) and React (UI).
* **Build Tool:** `vite` - Fast HMR and bundling.

### Essential Libraries (NPM)
```json
{
  "dependencies": {
    "phaser": "^3.80.1",
    "react": "^18.2.0",
    "zustand": "^4.5.2",
    "phaser-raycaster": "^0.10.11", // CRITICAL: For Police "Cone of Vision" & Lighting
    "easystarjs": "^0.4.4",         // Pathfinding for NPCs/Traffic
    "localforage": "^1.10.0",       // Saving large JSON objects (Save Files)
    "uuid": "^11.0.0",              // Unique IDs for items/entities
    "howler": "^2.2.4",             // Audio Manager (better than Phaser audio for UI)
    "tweakpane": "^4.0.3",          // For realtime balancing of economy/speed
    "lucide-react": "^0.344.0",     // UI Icons
    "clsx": "^2.1.0",               // Conditional classes for React UI
    "tailwind-merge": "^2.2.0"      // Tailwind utility
  }
}

```

---

## 3. Architecture & Data Flow

### The "Bridge" Pattern

The game runs two parallel loops. **Phaser** handles the world. **React** handles the data presentation. **Zustand** syncs them.

1. **Input:** Player presses 'I' in Phaser.
2. **Event:** Phaser calls `useGameStore.getState().toggleInventory()`.
3. **Render:** React detects state change and renders `<InventoryModal />` over the canvas.
4. **Action:** Player clicks "Equip Gun" in React.
5. **Feedback:** React updates Zustand  Zustand subscriber triggers `PhaserGame.scene.player.equipWeapon()`.

### Scene Management Strategy

* **`BootScene`**: Loads assets.
* **`MenuScene`**: Main Menu (Load Save / New Game).
* **`CityScene`**: The Open World. Large map, driving, police, street selling.
* **`InteriorScene`**: A generic scene reused for *all* buildings. When entering a building, `CityScene` sleeps, and `InteriorScene` loads a specific "Room Layout" JSON.

---

## 4. Feature Implementation Details

### A. Player & Driving System

**Challenge:** Mixing walking physics (instant stop) with driving physics (drift/momentum).
**Implementation:**

* **State:** `isDriving: boolean`.
* **Control Scheme:** * *Walking:* WASD directly sets Velocity.
* *Driving:* W/S adds Acceleration (Speed), A/D changes Angular Velocity (Rotation).


* **Snippet (Arcade Car Physics):**

```typescript
// inside Vehicle.ts update()
if (this.isAccelerating) {
    scene.physics.velocityFromRotation(this.rotation, this.currentSpeed, this.body.velocity);
}
// Apply "Drift Factor" (Lateral Friction)
const lateralVelocity = new Phaser.Math.Vector2(this.body.velocity).project(
    new Phaser.Math.Vector2(Math.cos(this.rotation + Math.PI/2), Math.sin(this.rotation + Math.PI/2))
);
this.body.velocity.x -= lateralVelocity.x * 0.95; // 0.95 = Grip
this.body.velocity.y -= lateralVelocity.y * 0.95;

```

### B. The "Heat" & Police System

**Logic:** Replaces Zombie AI.

* **Vision:** Use `phaser-raycaster`. Attach a ray cone to the Police sprite.
* **Detection:** If `Player` is in cone AND `Player.holdingIllegalItem` is true  Increment `GlobalHeat`.
* **Escalation:**
* Heat 0-25: Police ignore you.
* Heat 26-50: Police follow (Investigate).
* Heat 50+: Police sprint/shoot (Chase).
* Heat 90+: SWAT/Helicopter (High Alert - Night logic).



### C. Economy & Inventory

**Dual Currency:**

* `cash`: Dirty money. Used for street deals, buying drugs. Lost on death/arrest.
* `bank`: Clean money. Safe. Used for Real Estate, Legal Shops.
* **Laundering:** Player must visit ATM or Business to convert Cash  Bank (with tax).

**Inventory Structure:**

```typescript
interface Item {
  id: string;
  name: string; // e.g., "Blue Sky Crystal"
  type: 'weapon' | 'drug' | 'material' | 'furniture';
  illegal: boolean; // Triggers police aggro
  weight: number;
  stackable: boolean;
  props?: { quality: number; durability: number }; // Dynamic stats
}

```

### D. Interior & Grid Building (The "Sims" Layer)

**Reuse:** Uses `EditorScene` logic but simplified for gameplay.

* **Grid:** 32x32 pixel grid.
* **Data Storage:** Properties are saved in `ProfileService` as an array of placed objects.
```typescript
properties: {
  [propertyId: string]: {
    owned: boolean;
    rentDue: number;
    furniture: [{ id: 'table_wood', x: 4, y: 5, rotation: 90 }]
  }
}

```


* **Interaction:** Clicking a machine (e.g., Stove) opens a React UI Minigame.

---

## 5. Codebase Migration & Reuse Map

| Old Component (Zombie Game) | New Purpose (Empire Game) | Action Required |
| --- | --- | --- |
| `game/entities/Zombie.ts` | `game/entities/Police.ts` | Remove `attack()`. Add `visionCone`. Keep pathfinding (`EasyStar`). |
| `game/entities/Player.ts` | `game/entities/Player.ts` | Add `enterVehicle()`, `mountCar()`. Add `inventory` checks to movement speed. |
| `game/entities/WallBuy.ts` | `game/entities/RealEstateSign.ts` | Change "Buy Gun" logic to "Open Purchase Modal" for property. |
| `game/entities/Barricade.ts` | `game/entities/ProductionStation.ts` | "Repair" logic becomes "Produce" logic (Hold F to fill bar). |
| `game/systems/WeaponSystem.ts` | `game/systems/CombatSystem.ts` | Keep shooting logic. Add "Gang Allegiance" checks (Friendly Fire). |
| `game/scenes/MainGameScene.ts` | `game/scenes/CityScene.ts` | Strip Wave Manager. Add Traffic Spawner and Day/Night Cycle. |
| `game/scenes/EditorScene.ts` | `game/scenes/InteriorScene.ts` | Repurpose for *playing* inside houses, not just editing maps. |
| `store/useGameStore.ts` | `store/useEmpireStore.ts` | Rename `score` to `cash`. Add `reputation`, `heat`, `inventory`. |

---

## 6. File Structure (Target)

```text
src/
├── config/              // Constants (Prices, Item Stats, Map Configs)
├── game/
│   ├── components/      // React overlays (PhaserGame wrapper)
│   ├── entities/        // Player, Police, Vehicle, NPC, Furniture
│   ├── scenes/          // Boot, Menu, CityScene, InteriorScene
│   ├── systems/         // TrafficManager, HeatManager, DayNightCycle
│   └── utils/           // Math helpers, Raycast helpers
├── store/               // Zustand Stores (gameStore, uiStore)
├── ui/                  // React Components
│   ├── hud/             // Minimap, Health, Ammo, Heat Stars
│   ├── phone/           // Messages, Orders App, GPS
│   ├── inventory/       // Drag & Drop Grid
│   ├── shops/           // Gun Store, Furniture Store, Real Estate
│   └── menus/           // Pause, Settings, Save/Load
└── types/               // TypeScript Interfaces

```

---

## 7. Attention Points & Pitfalls

### ⚠️ Critical Watchlist

1. **Zustand <-> Phaser Loop:**
* *Problem:* Updating React state *every frame* (60fps) inside Phaser's `update()` will crash the browser.
* *Solution:* Only sync state on events (e.g., `onShoot`, `onDamage`) or use a throttle (update UI every 100ms, not 16ms).


2. **Map Size vs. Performance:**
* *Problem:* Loading a massive city with 1000s of colliders.
* *Solution:* Use **Chunking** or strict Camera Culling. Only update physics for entities within 1000px of player.


3. **LocalForage Limits:**
* *Problem:* Saving the entire history of every item can exceed storage quotas.
* *Solution:* Store static data (item descriptions) in code constants. Only save `itemID` and `quantity` in the save file.


4. **Raycaster Performance:**
* *Problem:* Too many lights/vision cones lag the game.
* *Solution:* Limit active raycasters to the closest 5 police officers. Disable raycasting for off-screen NPCs.



### 🔐 Security Note

* This is a client-side game. Data validation in `SecurityAnalyzer.ts` is useful for preventing runtime crashes, but **cannot** prevent a user from editing their LocalStorage to give themselves infinite money. Accept this for the single-player/P2P architecture.
