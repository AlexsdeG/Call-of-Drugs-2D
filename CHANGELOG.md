# Changelog

## [0.2.8] - 2026-02-07
### Changed
- **Project Rename**: Transformed into "Drug Empire".
- **Store Refactor**: Replaced `useGameStore` with `useEmpireStore` (Cash, Bank, Heat, Inventory).
- **Interaction Cleanup**: Removed point costs from Doors/Barricades. Added `locked` property to Doors.
- **Dependencies**: Added `phaser-raycaster` and `tweakpane`.
- **Cleanup**: Removed legacy Zombie/Wave logic references.

## [0.2.7] - 2026-02-067
### Added
- **Phase 1 Step 1.3 (Store Refactor)**:
  - Renamed `useGameStore` to `useEmpireStore`.
  - Implemented new economy state (`cash`, `bank`, `heat`, `inventory`).
  - Removed legacy zombie stats (`score`, `round`).

## [0.2.6] - 2026-02-07
### Added
- **Project Rebranding**: Renamed to "Drug Empire".
- **Economic Foundation**: Added `phaser-raycaster` and `tweakpane` for vision and balancing.
- **Phase 1 Step 1.1 & 1.2**: Initial codebase cleanup and renaming.

## [0.2.5] - 2026-01-11
### Added
- **Weapon XP System**: Weapons now gain XP and Level up based on kills and playtime.
- **Attachment Unlocking**: Attachments are now locked behind specific weapon levels.
- **Persistent Weapon Stats**: Track Kills, Headshots, and Playtime per weapon.

## [0.2.4] - 2026-01-11 - Phase 5 Step 5.2 (Customization UI)
### Added
- **Attachment System**:
  - `src/config/attachmentDefs.ts`: Definitions for Scopes, Muzzles, Grips, and Magazines.
  - `src/schemas/profileSchema.ts`: Added `loadouts` and `equippedAttachments` to Profile.
- **UI**:
  - `GameSetupScreen`: New pre-game screen for Difficulty and Map selection.
  - `LoadoutScreen`: Weapon customization interface with stats visualization.
  - `AttachmentSelector`: UI for browsing and equipping attachments.
- **Gameplay**:
  - `WeaponSystem`: Now applies attachment stats (Recoil, Range, Damage) to equipped weapons.

## [0.2.3] - 2026-01-11
### Added
- **Profile System**: Added `ProfileService` using `localForage` for saving/loading player data.
- **Modern Main Menu**: Replaced the basic menu with a "COD-style" `MenuOverlay`.
    - Profile Banner showing Name, Level, and XP.
    - Navigation Buttons with hover effects.
    - Save/Load Manager for Import/Export of profiles.
- **Persistence**: Player stats (Kills, Playtime, Rounds) now persist to the profile.
- **XP & Leveling**: Implemented basic XP gain from kills and rounds, with a visual XP bar.
### Changed
- Updated `MainGameScene` to track session stats (Kills, Start Time) and update profile on Game Over.
- Incremented game version to 0.2.3.
## [0.2.2] - 2026-01-10
### Added
- **Editor History**: Implemented Undo/Redo for tile painting, object placement, movement, and property updates.
- **Script Editor History**: Added local undo/redo for code editing.
- **UI**: Added Undo/Redo buttons to Editor Toolbar and Script Modal.

## [0.2.1] - 2026-01-10 - Phase 4 Step 4.4 Part 2 (Map Serialization)
### Added
- **File I/O**:
  - fully fixed File I/O system. fully working map loading and saving.
  - editor preview gives you 50k points
  - fix depth issue with tiles and objects in editor
  - mystery box rotating bug fixed
  - fix nuke points bug, triggered multiple times
  - max ammo bug fixed, refill only reserve ammo + check if weapon is pack a punched
  - if you have max ammo, you can't buy ammo

## [0.2.0] - 2026-01-09 - Phase 4 Step 4.4 Part 1 (Map Serialization)
### Added
- **File I/O**:
  - `src/game/systems/MapSerializer.ts`: Added Map Serialization and Deserialization logic.
  - `src/game/systems/MapManager.ts`: Added Map Loading and Saving logic.
  - Preview Map in Editor.

## [0.1.21] - 2026-01-08 - Phase 4 Step 4.3 (Scripting System)
### Added
- **Scripting Engine**:
  - `src/schemas/scriptSchema.ts`: Zod/TypeScript definitions for Triggers (`ON_GAME_START`, `ON_INTERACT`) and Actions (`SHOW_TEXT`).
  - `src/game/systems/ScriptEngine.ts`: Runtime system to evaluate triggers and execute actions.
  - Integration with `MainGameScene` (Game Start trigger).
- **Editor UI**:
  - Added "Scripts" section to Object Inspector.
  - Ability to add new scripts to objects (default: Show Text on Interact).
  - Visualization of attached scripts in the editor sidebar.
- **Tests**:
  - `src/tests/scriptTests.ts`: Unit tests for ScriptEngine logic.

## [0.1.20] - 2026-01-08
### Added
- Editor: Object Placement foundation.
- Editor: Brush Preview (Grey/Red outlines).
- Editor: Support for placing Spawners, Machines, Perks, Barricades, Doors, Mystery Box, PackAPunch.

## [0.1.19] - 2025-01-08 - Phase 4 Step 4.1 (Editor UI & Interaction)
- **Editor System**:
  - `src/game/scenes/EditorScene.ts`: New scene for map editing with grid visualization.
  - `src/game/ui/Editor/EditorSidebar.tsx`: UI for selecting tiles and tools.
  - `src/game/ui/Editor/EditorOverlay.tsx`: Overlay container for Editor UI.
- **Integration**:
  - Registered `EditorScene` in `gameConfig.ts`.
  - Added "Map Editor" button to Main Menu.
  - Added Editor state handling in `App.tsx` and `PhaserGame.tsx`.

## [0.1.18] - 2025-01-07
### Added
- **Power Ups System**:
  - Drops from zombies (Max Ammo, Nuke, Insta-Kill, Double Points, Carpenter).
  - Floating 3D-style icons with labels.
  - Active Power-Up UI with timers and blinking effects.
  - Global effects (Nuke kills all, Carpenter fixes barriers).
- **Perk System**:
  - Juggernog (Health), Speed Cola (Reload), Double Tap (Fire Rate), Stamin-Up (Speed).
  - Perk Machines placed on map.
- **Pack-a-Punch**:
  - Machine for weapon upgrades.
  - Visual upgrades (Green muzzle flash, "Upgraded" name).
- **Economy**:
  - Point system (Hit, Kill, Repair).
  - Wall Buys and Mystery Box interactions.
- **UI Enhancements**:
  - Active PowerUps HUD.
  - Round Counter synced with Game Store.
  - Interaction Prompts.
### Fixed
- **Critical Fixes**:
  - Fixed "Black Screen" issue when resuming from pause (physics synchronization).
  - Fixed Round Counter resetting to 1 on resume.
  - Fixed Mystery Box crash (`setFrame` error).
  - Fixed Carpenter and Nuke logic not triggering globally.
- **WeaponSystem**: Fixed logic for weapon upgrades (ammo state vs attributes).
- **Map Integration**: Default map updated with Perk Machines and PaP locations.
- **MapManager**: Updated to parse `perk_machine` and `pack_a_punch` objects.
- **Test Map**: Added `src/tests/perkMapTest.ts` for isolated testing.
- **WeaponSystem**: Fixed logic for weapon upgrades (ammo state vs attributes).

## [0.1.17] - Phase 3 Step 3.2 (Economy & Items)
### Added
- **Economy System**:
    - `src/game/entities/WallBuy.ts`: Interactable wall weapon purchase.
    - `src/game/entities/MysteryBox.ts`: Random weapon chest with moving logic (Teddy Bear).
    - `src/game/constants.ts`: Added `SHOTGUN` and `SNIPER` weapon definitions.
- **Player Updates**:
    - Points system integration (+10 hit, +100 kill).
    - `equipWeapon(key)` support in `Player.ts`.
- **Map**:
    - Updated `defaultMap.ts` with WallBuys (Spawn) and MysteryBoxes (All 3 rooms).
    - Updated `MapManager.ts` to parse economy objects.
- **Assets**:
    - Added procedural textures for `wallbuy` and `mysterybox` in `BootScene`.
- **Tests**:
    - `src/tests/economyMapTest.ts`: Verification script for economy map objects.

## [0.1.16] - Phase 3 Step 3.1 (Wave Manager & Director AI)
### Added
- **Systems**:
    - `src/game/systems/WaveManager.ts`: Manages round progression, zombie counts, and spawn timers.
    - `src/game/systems/DirectorAI.ts`: Monitors player stress (health/ammo) and adjusts spawn pacing.
- **Integration**:
    - Initialized `WaveManager` and `DirectorAI` in `MainGameScene`.
    - Refactored `Spawner.ts` to be controlled by `WaveManager`.

## [0.1.15] - Phase 2 Step 2.3 (Interactables & Barriers)
- **Interaction System**:
    - `src/game/interfaces/IInteractable.ts`: Interface for entities that respond to 'F' key.
    - Updated `Player.ts` to scan for nearest interactable and trigger interaction logic.
- **Entities**:
    - `src/game/entities/Door.ts`: Buyable obstacle. Removes itself and updates pathfinding grid when bought.
    - `src/game/entities/Barricade.ts`: Repairable window. Zombies attack it; Players repair it.
- **AI Logic**:
    - Updated `Zombie.ts` to handle `ATTACK_BARRIER` state. Zombies switch targets to barricades upon collision.
- **Systems**:
    - Updated `PathfindingManager.ts` to support dynamic tile updates (making a tile walkable after door purchase).
    - Updated `MapManager.ts` to parse `door` and `barricade` objects from map data.
- **Assets**:
    - Added procedural textures for `door` (Gray Metal) and `barricade` (Wood Planks) in `BootScene`.
- **Map**:
    - Updated `defaultMap.ts` to include a test Door (Cost: 500) and Barricade.
- **Tests**:
    - `src/tests/interactionTests.ts`: Verifies Door purchasing and Barricade repair logic.

## [0.1.14] - Phase 2 Step 2.2 (Zombie AI & Pathfinding)
### Added
- **AI System**:
    - `src/game/systems/PathfindingManager.ts`: Wrapper around `easystarjs`. Handles grid generation from Tilemaps and manages a path calculation queue to prevent frame drops.
- **Entities**:
    - `src/game/entities/Zombie.ts`: Intelligent enemy class with State Machine (`IDLE`, `PATHING`, `CHASE`, `ATTACK`).
    - Implemented "Soft Collision" for zombies (they push each other slightly to avoid stacking).
- **Assets**:
    - Added procedural `zombie` texture (Green/Red/Black) in `BootScene`.
- **Tests**:
    - `src/tests/zombieTests.ts`: Verifies pathfinding grid generation and zombie movement logic.
### Changed
- **MainGameScene**:
    - Initialized `PathfindingManager` with map data.
    - Added "Obstacle Baking": Crate positions are now marked as non-walkable in the pathfinding grid.
    - Added `zombieGroup` physics group.
    - Implemented Zombie spawning loop (Spawns 10 zombies for testing).
    - Added full collision matrix:
        - Zombies vs Walls (Slide)
        - Zombies vs Obstacles (Slide)
        - Zombies vs Bullets (Damage/Death)
        - Zombies vs Player (Push/Attack)

## [0.1.13] - Phase 2 Step 2.1 (Map Data & Validation)
### Added
- **Map System**:
    - `src/schemas/mapSchema.ts`: Zod schema for validating Map JSON (Layers, Objects, Metadata).
    - `src/game/systems/MapManager.ts`: Handles map validation, loading, and Tilemap generation.
    - `src/config/defaultMap.ts`: A debug map layout (20x20) with walls and a room structure.
- **Assets**:
    - Added procedural `tileset` generation in `BootScene` (Index 0: Floor, Index 1: Wall).
- **Tests**:
    - `src/tests/mapTests.ts`: Verifies schema validation (success/failure cases) and Tilemap layer creation.
### Changed
- **MainGameScene**:
    - Removed procedural "Random Obstacles" generation.
    - Integrated `MapManager` to load the default map.
    - Updated physics collisions to use the Map's Wall Layer instead of the `obstacleGroup`.

## [0.1.12] - Phase 1 Step 1.4 (Juice & VFX)
- **Visual Effects**:
    - **Projectile System**: Replaced instant raycasting with physical `Projectile` sprites that travel at high velocity (2000px/s). Bullets are recycled via Object Pooling for performance.
    - **Muzzle Flash**: Added a dynamic flash sprite at the gun tip that appears briefly when firing.
    - **Impact Sparks**: Added particle effects (yellow flares) when bullets collide with walls, crates, or enemies.
- **Assets**: Programmatically generated textures for `bullet`, `muzzleflash`, and `flare` in `BootScene`.
### Changed
- **Weapon System**: Refactored `WeaponSystem` to utilize `Physics.Arcade.Group` for bullet management instead of internal graphics drawing. Collisions are now handled in `MainGameScene`.