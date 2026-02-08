# Implementation Plan: DrugEmpire (Schedule 1 Clone)

This plan outlines the transformation of the "Call of 2D Zombies" repository into "Call of Drugs 2D".
**Strategy:** Transform "Wave Survival" mechanics into "Economic/Stealth" mechanics while keeping the core Engine (Phaser+React) intact.

---

## 📂 Target File Structure
*The agent should verify the structure matches this at the end of Phase 1.*

```text
src/
├── config/                  # Game Constants
│   ├── constants.ts         # Prices, Max Stacks, Heat Thresholds
│   └── controls.ts          # Input Mappings
├── game/
│   ├── components/          # React Wrappers
│   ├── entities/
│   │   ├── Player.ts        # Movement & Interaction
│   │   ├── Vehicle.ts       # New: Driving Physics
│   │   ├── Police.ts        # Refactored from Zombie.ts
│   │   ├── NPC.ts           # Civilians/Dealers
│   │   ├── Furniture.ts     # Placed Objects
│   │   └── Production.ts    # Refactored from Barricade.ts
│   ├── scenes/
│   │   ├── BootScene.ts     # Asset Loading
│   │   ├── MenuScene.ts     # Main Menu
│   │   ├── CityScene.ts     # (Was MainGameScene) Open World
│   │   └── InteriorScene.ts # (Was EditorScene) Inside Buildings
│   ├── systems/
│   │   ├── EconomySystem.ts # New: Prices, Rent
│   │   ├── HeatManager.ts   # New: Police Aggression
│   │   └── InventoryManager.ts # New: Item Logic
│   └── ui/                  # React Components
├── store/
│   ├── useEmpireStore.ts    # (Was useGameStore) Global State
│   └── useUIStore.ts        # Modal States
└── utils/

```

---

## 🛑 Phase 1: Foundation, Cleanup & Rename

**Goal:** Remove Zombie-specific logic, rename the project, and establish the new "Empire" state management.

### Step 1.1: Project Configuration & Dependencies

* **Action:**
* Update `package.json`: Name to `drug-empire`.
* Install new dependencies: `phaser-raycaster` (for vision), `tweakpane` (for balancing).
* Clean `vite.config.ts` if needed.


* **Test:** Run `pnpm install` and `pnpm dev`. Ensure app boots without crashing.

### Step 1.2: Scene & Entity Renaming

* **Action:**
* Rename `MainGameScene.ts`  `CityScene.ts`.
* Rename `Zombie.ts`  `Police.ts`.
* Delete `WaveManager.ts`, `PerkMachine.ts`, `PackAPunch.ts`, `PowerUp.ts`.
* Update `CityScene.ts`: Remove wave timers, zombie spawners, and "Round Number" UI.


* **Test:** Load the game. The Player should spawn in the empty map. No zombies should spawn. No "Round 1" text.

### Step 1.3: Store Refactor (The "Brain" Transplant)

* **Action:**
* Rename `useGameStore.ts`  `useEmpireStore.ts`.
* **Modify State Interface:**
* Remove: `score`, `round`, `zombiesKilled`.
* Add: `cash: number`, `bank: number`, `heat: number`, `day: number`.
* Add: `inventory: Item[]` (Empty array for now).




* **Test:** Create `storeTests.ts`. Verify `addCash(100)` updates the store and UI does not crash accessing missing `score` variables.

### Step 1.4: Interaction Interface Cleanup

* **Action:**
* Update `IInteractable.ts`: Remove `cost` (points). Add `interactionDuration` (for production) and `requiredItem` (optional).
* Refactor `Door.ts`: Remove point cost. Add `locked` (boolean).


* **Test:** Walk up to a Door. Ensure the interaction prompt appears ("Press F to Open" instead of "Press F [500 pts]").

---

## 💰 Phase 2: Core Economy & Production Loop

**Goal:** Implement the "Earn Money" loop (Produce  Inventory  Sell).

### Step 2.1: Inventory System Logic

* **Action:**
* Create `src/game/systems/InventoryManager.ts`.
* Define `ItemType` interface (id, name, weight, illegal).
* Implement methods: `addItem`, `removeItem`, `hasItem` , `getTotalWeight`, `isOverWeight`, `weightLeft`.
* check for max weight.
* Connect to `useEmpireStore`.


* **Test:** Unit test `addItem`. Check if adding beyond max weight fails.

### Step 2.2: The Production Entity (Refactoring Barricades)

* **Action:**
* Create `src/game/entities/ProductionUnit.ts` (Refactored from `Barricade.ts`).
* Logic:
1. State: `Idle`  `Processing` (Timer)  `Ready`.
2. Interaction: Player holds 'F'. Progress bar fills.
3. On Complete: Call `InventoryManager.addItem('weed_packet')`.




* **Test:** Place a `ProductionUnit` in `CityScene`. Interact. specific item should appear in `useEmpireStore.inventory`.

### Step 2.3: Selling Mechanism (The Dealer)

* **Action:**
* Create `src/game/entities/NpcDealer.ts` (Simple sprite).
* Interaction: "Press F to Sell".
* Logic: Check Inventory for "Illegal" items. Remove items  Add `cash` to Store.


* **Test:** Produce item from Step 2.2. Walk to Dealer. Sell. Verify Cash increases and Inventory decreases.

### Step 2.4: Basic UI Overlay

* **Action:**
* Update `HUD`: Show Cash (Green text), Bank (Blue text), Heat (Stars).
* Create `InventoryUI.tsx`: A simple grid showing current items. Toggle with 'I' key.


* **Test:** Press 'I'. Drag an item (visual only for now). Close.

---

## 🚗 Phase 3: Movement & Driving

**Goal:** Add vehicles and map traversal.

### Step 3.1: Vehicle Entity Physics

* **Action:**
* Create `src/game/entities/Vehicle.ts`.
* Implement "Arcade Car Physics":
* `W` = Accelerate (Velocity + Rotation Vector).
* `S` = Brake/Reverse.
* `A/D` = Rotate (Angular Velocity).
* **Important:** Apply lateral friction (drift reduction) so it doesn't slide like ice.




* **Test:** Spawn a car. Drive it. Verify it collides with world walls.

### Step 3.2: Enter/Exit Logic

* **Action:**
* Update `Player.ts`: Add `enterVehicle(vehicle)` function.
* Hide Player Sprite.
* Set `Camera.startFollow(vehicle)`.
* Input Handler: Switch from Player Controls to Car Controls.




* **Test:** Walk to car. Press F. Player disappears, car moves. Press F. Car stops, Player appears.

---

## 👮 Phase 4: Risk, AI & Police

**Goal:** Make the world dangerous.

### Step 4.1: Raycaster Integration

* **Action:**
* Initialize `PhaserRaycaster` in `CityScene`.
* Create a generic `VisionCone` class that attaches to an entity.


* **Test:** Enable debug mode. See the rays drawing on the map walls.

### Step 4.2: Police AI (Refactoring Zombies)

* **Action:**
* Update `Police.ts`:
* Attach `VisionCone`.
* State Machine: `Patrol` (Random walk)  `Investigate` (Go to noise)  `Chase` (Run at player).


* Logic: If Player touches Ray  Check `Heat` & `IllegalItem`  Trigger Chase.


* **Test:** Walk in front of Cop with empty hands (Safe). Walk in front with "Weed" (Chase starts).

### Step 4.3: Heat System & Consequences

* **Action:**
* Create `HeatManager.ts`.
* Logic: Heat decays over time. Crimes (Selling/Killing) increase Heat.
* UI: Update HUD to show 1-5 Stars but only when chase is active.


* **Test:** Sell drugs repeatedly. Watch stars go up. Verify Police spawn rate increases (mock logic).

---

## 🏠 Phase 5: Real Estate & Interiors

**Goal:** "The Sims" mode inside buildings.

### Step 5.1: Interior Scene Setup

* **Action:**
* Refactor `EditorScene.ts`  `InteriorScene.ts`.
* Logic: This scene renders a small tilemap (the room) independent of the City.
* Transition: When entering a door in City, `sleep` CityScene, `wake` InteriorScene.


* **Test:** Enter a building. Screen fades. You are in a room. Walk out. You are back in City.

### Step 5.2: Furniture Placement (Build Mode)

* **Action:**
* Reuse `Editor` logic but restrict it to "Inventory Items" only.
* Logic: Player selects "Table" from Inventory  Ghost sprite appears on Grid  Click to place.
* Persistence: Save placed items to `useEmpireStore.properties[id]`.


* **Test:** Buy table. Go home. Place table. Leave. Return. Table is still there.

### Step 5.3: Real Estate Purchasing

* **Action:**
* Create `RealEstateSign.ts` (Interactable).
* Logic: If `cash >= price`, unlock Property ID in Store. Give keys (access to Door).


* **Test:** Try to enter locked house (Fail). Buy house. Enter house (Success).

---

## 🎮 Phase 6: Content, Polish & Saving

**Goal:** Make it a game.

### Step 6.1: Shop UI & Economy Balancing

* **Action:**
* Create `ShopModal.tsx`: Buy Seeds, Chemicals, Furniture, Guns.
* Connect to `NPC.ts` (Shopkeeper).
* Integrate this into the Editor to allow select dealer in entities and select what type of vendor it is.


* **Test:** Buy generic items. Verify money deduction.

### Step 6.2: Save System Finalization

* **Action:**
* Update `ProfileService.ts`: Ensure `EmpireStore` (Inventory, Cash, Heat, Property Objects) serializes correctly to `localforage`.
* Edge Case: Handle "Save Bloat" (don't save entire object, save IDs).


* **Test:** Play for 10 mins. Buy house. Place items. Refresh Browser. Load Game. Everything restores.

---

## 🧪 Global Test Structure (Continuous Integration)

Create a file `src/tests/globalIntegrationTest.ts` that runs these checks on startup (Dev Mode only):

1. **Store Check:** Can `useEmpireStore` Initialize?
2. **Map Check:** Does `CityScene` have a valid Tilemap?
3. **Entity Check:** Can `Player` and `Vehicle` be instantiated without crashing?
4. **Save Check:** Can `ProfileService` write/read a dummy file?
