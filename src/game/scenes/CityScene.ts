import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { EventBus } from '../EventBus';
import { WORLD, WEAPON_DEFS } from '../../config/constants';
import { VisionManager } from '../systems/VisionManager';
import { Projectile } from '../entities/Projectile';
import { WeaponAttributes } from '../types/WeaponTypes';
import { MapManager } from '../systems/MapManager';
import { DEBUG_MAP } from '../../config/defaultMap';
import { PathfindingManager } from '../systems/PathfindingManager';
import { ProfileService } from '../services/ProfileService';
import { Police } from '../entities/Police';
import { Barricade } from '../entities/Barricade';
import { Door } from '../entities/Door';
import { Spawner } from '../entities/Spawner';
import { WallBuy } from '../entities/WallBuy';
import { MysteryBox } from '../entities/MysteryBox';
import { useEmpireStore } from '../../store/useEmpireStore';
import { GameState } from '../../types';
import { ScriptEngine } from '../systems/ScriptEngine';
import { TriggerType } from '../../schemas/scriptSchema';
import { ProductionUnit } from '../entities/ProductionUnit';
import { NpcDealer } from '../entities/NpcDealer';
import { CONTROLS } from '../../config/controls';

export class CityScene extends Phaser.Scene {
  private _player!: Player;
  public get player(): Player { return this._player; }
  private visionManager!: VisionManager;
  private mapManager!: MapManager;
  private pathfindingManager!: PathfindingManager;
  public scriptEngine!: ScriptEngine;
  
  private startTime: number = 0;
  
  private crates: Phaser.GameObjects.Sprite[] = [];
  private targets: Phaser.GameObjects.Sprite[] = [];
  private customWalls: Phaser.GameObjects.Sprite[] = [];
  private spawners: Spawner[] = [];
  
  // Physics Groups
  private bulletGroup!: Phaser.Physics.Arcade.Group;
  private obstacleGroup!: Phaser.Physics.Arcade.StaticGroup;
  private targetGroup!: Phaser.Physics.Arcade.StaticGroup;
  private policeGroup!: Phaser.Physics.Arcade.Group;
  private customWallGroup!: Phaser.Physics.Arcade.StaticGroup;
  
  // New Groups for Phase 2.3
  private doorGroup!: Phaser.Physics.Arcade.StaticGroup;
  private barricadeGroup!: Phaser.Physics.Arcade.StaticGroup;
  private wallBuyGroup!: Phaser.Physics.Arcade.StaticGroup;
  private mysteryBoxGroup!: Phaser.Physics.Arcade.StaticGroup;
  
  // Interactable Group - Normal Group (Not Physics) to store references for Player interaction
  private interactableGroup!: Phaser.GameObjects.Group;

  private floorLayer?: Phaser.Tilemaps.TilemapLayer;
  private wallLayer?: Phaser.Tilemaps.TilemapLayer;
  private targetLayer!: Phaser.GameObjects.Layer;

  // Effects
  private particleManager!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bloodManager!: Phaser.GameObjects.Particles.ParticleEmitter;
  private crosshair!: Phaser.GameObjects.Graphics;
  
  // Input
  private keys!: any;

  private isGameOver: boolean = false;
  private isReady: boolean = false; // Initialization Flag
  private fpsEvent?: Phaser.Time.TimerEvent;

  // Event Handlers
  private onExitGame: () => void;
  private onRestartGame: () => void;
  private onGameOver: () => void;

  // Preview Mode State
  private isPreview: boolean = false;
  private previewMapData?: any;
  private editorReturnData?: any; // To restore Editor state
  private editorReturnDirty: boolean = false;
  
  // Session State
  private statsSaved: boolean = false;

  constructor() {
    super({ key: 'CityScene' });
    
    this.onExitGame = async () => {
        // Save progress before exiting (if not preview)
        const nextState = this.isPreview ? GameState.EDITOR : GameState.MENU;
        
        // If stats haven't been saved yet, this means we are initiating the exit flow.
        // We save stats, generate report, and show Post-Game screen.
        if (!this.statsSaved && !this.isPreview) {
            await this.saveSessionStats(nextState);
            useEmpireStore.getState().setGameState(GameState.POST_GAME_STATS);
            return; // ABORT EXIT to show stats. Continue button will trigger exit-game again.
        }
        
        // If stats ARE saved, or we are in preview, proceed with actual shutdown.
        if (!this.statsSaved && this.isPreview) {
             await this.saveSessionStats(nextState);
        }

        this.scene.stop();
        if (this.isPreview) {
            EventBus.emit('editor-preview-stop');
            this.scene.start('EditorScene', { 
                mapData: this.editorReturnData,
                isDirty: this.editorReturnDirty 
            }); 
        } else {
            this.scene.start('MenuScene');
        }
        this.input.setDefaultCursor('default');
    };

    this.onRestartGame = () => {
        this.saveSessionStats(GameState.GAME).then(() => {
            this.scene.stop();
            this.scene.start('CityScene');
        });
    };

    this.onGameOver = async () => {
        this.isGameOver = true;
        this.physics.pause();
        this.input.setDefaultCursor('default');
        
        const nextState = GameState.GAME_OVER;
        await this.saveSessionStats(nextState);
        
        // Access store directly (since we are outside React)
        const message = "BUSTED";
        useEmpireStore.getState().setGameOverStats({
            roundsSurvived: useEmpireStore.getState().day,
            message
        });
        
        if (!this.isPreview) {
            useEmpireStore.getState().setGameState(GameState.POST_GAME_STATS);
        } else {
            useEmpireStore.getState().setGameState(GameState.GAME_OVER);
        }
    };
  }

  private async saveSessionStats(nextState: GameState) {
      // Don't save stats for Editor Previews
      if (this.isPreview) return;
      
      // Prevent double saving (e.g. GameOver then Exit)
      if (this.statsSaved) {
          console.log("CityScene: Session Stats already saved. Skipping.");
          return;
      }
      this.statsSaved = true;

      if (this._player) {
           // Update Profile
           const duration = (Date.now() - this.startTime) / 1000;
            const currentDay = useEmpireStore.getState().day;
            const sessionStats = {
                kills: this._player.sessionStats.kills,
                day: currentDay,
                headshots: this._player.sessionStats.headshots,
                timePlayed: duration,
                weaponUsage: this._player.sessionStats.weaponUsage // Pass weapon stats
            };
           
           // Get Full Report
           const report = await ProfileService.updateStats(sessionStats);
           
           if (report) {
               console.log("CityScene: Setting Session Report", report);
               useEmpireStore.getState().setSessionReport({
                   ...report,
                   nextState
               });
           }

           await ProfileService.saveProfile();
           console.log("CityScene: Session Stats Saved", sessionStats);
      }
  }


  init(data: { isPreview?: boolean, mapData?: any, editorMapData?: any, editorDirty?: boolean }) {
      // Force stop EditorScene to prevent "Ghost Editor" / State Leakage
      this.scene.stop('EditorScene');
      this.statsSaved = false; // Reset for new session
      console.log('MainGameScene: Init', { data });
      if (data && data.isPreview) {
          this.isPreview = true;
          this.previewMapData = data.mapData;
          this.editorReturnData = data.editorMapData;
          this.editorReturnDirty = data.editorDirty || false;
          
          // Reset Stats for Preview (High Points for Testing)
          useEmpireStore.getState().resetPlayerStats();
          useEmpireStore.getState().addCash(50000);
      } else {
          // Single Player / Default Loading
          this.isPreview = false;
          this.previewMapData = undefined; // CLEAR IT
          this.editorReturnData = undefined;
          this.editorReturnDirty = false;
      }
      console.log('MainGameScene: Init', { 
          receivedData: data,
          isPreview: this.isPreview, 
          hasPreviewData: !!this.previewMapData 
      });
  }

  create() {
    console.log('MainGameScene: Created');
    
    // Safety: Reset Camera Effects/state from potentially dirty Editor state
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.setZoom(1);
    this.cameras.main.setAngle(0);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.fadeIn(500); // Nice transition
    
    // Double check to ensure Editor is dead
    if (this.scene.get('EditorScene').scene.isActive()) {
        console.warn('MainGameScene: Detected active EditorScene, forcing stop.');
        this.scene.stop('EditorScene');
    }

    // Initialize Target Layer for Vision System (Police/Enemies)
    this.targetLayer = this.add.layer();
    this.targetLayer.setDepth(5); 
    
    this.isReady = false; // Reset ready state
    this.isGameOver = false;
    this.physics.resume(); 
    this.input.setDefaultCursor('none');
    this.startTime = Date.now();
    
    // Clear any previous spawners
    this.spawners = [];
    this.crates = [];
    this.targets = [];
    this.customWalls = [];


    // Events Cleanup & Setup
    this.events.off('shutdown');
    this.events.on('shutdown', this.shutdown, this);

    // Remove specific listeners if they exist (safety check)
    EventBus.off('exit-game', this.onExitGame);
    EventBus.off('restart-game', this.onRestartGame);
    EventBus.off('game-over', this.onGameOver);

    // Add Listeners
    EventBus.on('exit-game', this.onExitGame);
    EventBus.on('restart-game', this.onRestartGame);
    EventBus.on('game-over', this.onGameOver);

    // Pause/Resume Handlers to prevent Black Screen / Loss of Context
    EventBus.on('pause-game', () => {
        if (!this.scene.isActive()) return;
        this.physics.pause();
        // this.scene.pause(); // Do NOT pause the scene, just physics. Pausing scene stops updates which might cause black screen on resume if not handled perfectly.
        // Instead, we just pause physics and maybe inputs.
        this.input.setDefaultCursor('default');
    });

    EventBus.on('resume-game', () => {
        if (!this.scene.isActive()) return;
        this.physics.resume();
        // this.scene.resume();
        this.input.setDefaultCursor('none');
    });
    
    // EventBus.on('spawn-powerup', (data: {x: number, y: number, type: any}) => {
    //     if (!this.scene.isActive()) return;
    //     const pu = new PowerUp(this, data.x, data.y, data.type);
    //     this.powerUpGroup.add(pu);
    // });

    // Initialize Controls
    this.keys = this.input.keyboard.addKeys(CONTROLS);

    // Global PowerUp Effects
    EventBus.on('trigger-carpenter', () => {
        if (!this.scene.isActive()) return;
        let fixedCount = 0;
        this.barricadeGroup.children.each(b => {
            const bar = b as Barricade;
            if (bar.active) {
                bar.fullyRepair();
                fixedCount++;
            }
            return true;
        });
        
        // Bonus Points
        this.player.addPoints(200);
        EventBus.emit('show-notification', "Carpenter! Barricades Fixed!");
    });

    EventBus.on('trigger-nuke', () => {
        if (!this.scene.isActive()) return;
        this.policeGroup.children.each(z => {
            const police = z as Police;
            if (police.active) {
                police.takeDamage(10000); 
            }
            return true;
        });
        
        this.player.addPoints(400); 
        EventBus.emit('show-notification', "Heat Cleared! Nuke!");
    });

    EventBus.on('trigger-firesale', () => {
        if (!this.scene.isActive()) return;
        MysteryBox.startFireSale(this);
        EventBus.emit('show-notification', "FIRE SALE ACTIVE!");
    });

    // --- DEBUG: Spawn Objects for Testing ---
    this.time.delayedCall(2000, () => {
        const debugX = 12 * 32; 
        const debugY = 12 * 32; 
        
        console.log("DEBUG: Initialized at", debugX, debugY);

        // --- Phase 2 Step 2.2 Test: Production Unit ---
        const productionUnit = new ProductionUnit(this, debugX + 100, debugY);
        this.interactableGroup.add(productionUnit);
        this.physics.add.collider(this.player, productionUnit);

        // --- Phase 2 Step 2.3 Test: Dealer ---
        const dealer = new NpcDealer(this, debugX - 100, debugY);
        this.interactableGroup.add(dealer);
        this.physics.add.collider(this.player, dealer); 
    });

    // 0. Setup Physics Groups
    this.bulletGroup = this.physics.add.group({ classType: Projectile, runChildUpdate: true, maxSize: 100 });
    this.bulletGroup.setDepth(20);

    this.obstacleGroup = this.physics.add.staticGroup();
    this.targetGroup = this.physics.add.staticGroup();
    this.customWallGroup = this.physics.add.staticGroup();
    this.policeGroup = this.physics.add.group({ classType: Police, runChildUpdate: true, collideWorldBounds: false }); 
    this.policeGroup.setDepth(15); 
    
    // Interactables
    this.doorGroup = this.physics.add.staticGroup({ classType: Door });
    this.barricadeGroup = this.physics.add.staticGroup({ classType: Barricade });
    // Economy
    this.wallBuyGroup = this.physics.add.staticGroup({ classType: WallBuy });
    this.mysteryBoxGroup = this.physics.add.staticGroup({
        classType: MysteryBox
    });
    
    this.interactableGroup = this.add.group(); 

    // 1. Map & Pathfinding Init
    this.pathfindingManager = new PathfindingManager(this);
    this.mapManager = new MapManager(this, this.pathfindingManager);
    this.scriptEngine = new ScriptEngine(this);

    // 1.5 Textures
    this.createBackground();
    this.createTilesetTexture(); // Create tileset for MapManager
    this.createCrateTexture();
    this.createTargetTexture();

    this.createCustomWallTexture();

    // 2. Create Player First
    this._player = new Player(this, 100, 100, this.bulletGroup);
    this.player.setInteractables(this.interactableGroup); 
    this.player.setPoliceGroup(this.policeGroup); 
    // Inject ScriptEngine into Player for OnInteract triggers (if needed later) or handled via Scene
    
    // 3. Load Map
    let valid;
    
    if (this.isPreview && this.previewMapData) {
        console.log("MainGameScene: Loading PREVIEW Map Data");
        valid = this.mapManager.validate(this.previewMapData);
    } else {
        console.log("MainGameScene: Loading DEFAULT Map Data (Singleplayer)");
        valid = this.mapManager.validate(DEBUG_MAP);
    }
    
    if (valid.success && valid.data) {
        const layers = this.mapManager.createLevel(valid.data);
        this.wallLayer = layers.walls;
        this.floorLayer = layers.floor;
        
        if (this.wallLayer) this.player.weaponSystem.setWalls(this.wallLayer);

        if (this.wallLayer) this.player.weaponSystem.setWalls(this.wallLayer);

        // Preload Custom Textures
        const customObjects = valid.data.objects?.filter(o => o.type === 'CustomObject' && o.properties?.texture) || [];
        
        const loadTexture = (obj: any): Promise<void> => {
            return new Promise((resolve) => {
                const key = `custom-tex-${obj.id}`;
                // Check if already exists?
                if (this.textures.exists(key)) {
                    resolve();
                    return;
                }
                
                this.textures.addBase64(key, obj.properties.texture);
                this.textures.once('onload', () => {
                   resolve();
                });
                // Fallback timeout?
                setTimeout(resolve, 1000); 
            });
        };

        Promise.all(customObjects.map(loadTexture)).then(() => {
             // Create Objects AFTER textures are ready
             if (this.scene && this.sys.isActive()) {
                 this.mapManager.createObjects(
                    valid.data!, 
                    this.doorGroup, 
                    this.barricadeGroup, 
                    this.spawners, 
                    this.policeGroup, 
                    this.player,
                    this.targetLayer,
                    this.wallBuyGroup,
                    this.mysteryBoxGroup,
                    undefined, // perkMachineGroup removed
                    undefined, // packAPunchGroup removed
                    this.customWallGroup
                );
                
                // --- Register Interactables & Colliders ---
                this.doorGroup.children.each(d => { this.interactableGroup.add(d); return true; });
                this.barricadeGroup.children.each(b => { this.interactableGroup.add(b); return true; });
                this.wallBuyGroup.children.each(wb => { this.interactableGroup.add(wb); return true; });
                this.mysteryBoxGroup.children.each(mb => { 
                    this.interactableGroup.add(mb); 
                    this.physics.add.collider(this.player, mb);
                    return true; 
                });
                
                // Collisions for MysteryBox
                this.physics.add.collider(this.policeGroup, this.mysteryBoxGroup);
                
                this.physics.add.collider(this.bulletGroup, this.mysteryBoxGroup, (b) => { (b as Projectile).disableBody(true, true); });

                // --- Initialize Systems Dependent on Objects ---
                
                // 4. Game Mode
                // this.gameMode = new SurvivalMode(this, this.player, this.spawners, this.policeGroup);
                // this.gameMode.init();

                // 3. Bake Pathfinding
                if (this.mapManager['map']) {
                     const allObstacles = [
                         ...this.crates,
                         ...this.targets,
                         ...this.customWalls,
                         ...this.doorGroup.getChildren() as Phaser.GameObjects.Sprite[],
                         ...this.barricadeGroup.getChildren() as Phaser.GameObjects.Sprite[]
                     ];
                     this.pathfindingManager.buildGrid(this.mapManager['map'], allObstacles);
                }

                // 7. Setup Vision
                const visionObstacles = [
                    ...this.crates, 
                    ...this.customWalls,
                    ...this.doorGroup.getChildren() as Phaser.GameObjects.Sprite[]
                ];
                this.visionManager = new VisionManager(this);
                this.visionManager.setup(this.player, visionObstacles);
                this.visionManager.setTargetLayer(this.targetLayer);

                // 8. Camera
                this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
                this.cameras.main.setZoom(WORLD.DEFAULT_ZOOM);
                this.cameras.main.setBounds(0, 0, 3000, 3000);
                this.physics.world.setBounds(-500, -500, 3000, 3000); 

                // 9. Effects
                this.createEffects();
                this.crosshair = this.add.graphics();
                this.crosshair.setDepth(2000);

                // 11. Collisions
                this.setupCollisions();

                // Events
                this.events.on('bullet-hit-wall', (coords: {x: number, y: number}) => {
                    if (!this.scene.isActive()) return;
                    const emitter = this.data.get('sparkEmitter') as Phaser.GameObjects.Particles.ParticleEmitter;
                    if (emitter) emitter.explode(5, coords.x, coords.y);
                });

                this.events.on('show-damage-text', (data: {x: number, y: number, amount: number}) => {
                    this.showDamageText(data.x, data.y, data.amount, 'normal');
                });

                this.fpsEvent = this.time.addEvent({
                  delay: 500, loop: true,
                  callback: () => { EventBus.emit('debug-fps', Math.round(this.game.loop.actualFps)); }
                });

                // Register Scripts
                if (valid.data.scripts) {
                    this.scriptEngine.registerScripts(valid.data.scripts);
                }

                // Trigger Map Start
                this.scriptEngine.trigger(TriggerType.ON_GAME_START);

                EventBus.emit('scene-created', this);
                EventBus.emit('scene-active', 'CityScene');
                
                // Reset Stats for new session
    useEmpireStore.getState().resetPlayerStats();

    // Start Main Logic
    this.time.delayedCall(100, () => {
                    this.isReady = true; // Mark Scene as Ready
                    EventBus.emit('scene-ready');
                });
             }
        });
    }
}

  shutdown() {
      console.log("MainGameScene: Shutdown (Merged)");

      // 1. Stop Core Systems
      // Stop Logic/Physics immediately to prevent updates on destroyed objects
      this.physics.pause();
      this.time.removeAllEvents();
      this.tweens.killAll();
      if (this.fpsEvent) this.fpsEvent.destroy();

      // 2. Remove Listeners
      // Local Scene Events
      this.events.off('game-over', this.onGameOver);
      this.events.off('bullet-hit-wall');
      this.events.off('show-damage-text');
      
      // Global EventBus Events - Remove specific handlers or all for this scene context
      EventBus.off('exit-game', this.onExitGame);
      EventBus.off('restart-game', this.onRestartGame);
      EventBus.off('weapon-switch');
      // EventBus.off('spawn-powerup'); // Removed
      EventBus.off('trigger-carpenter');
      EventBus.off('trigger-nuke');
      EventBus.off('trigger-firesale');
      EventBus.off('pause-game');
      EventBus.off('resume-game');
      // If we bound anonymous functions for some events (like debug-fps), we might not be able to off specific ones easily without reference.
      // Ideally show-notification etc are global.
      
      // 3. Destroy Managers
      if (this.mapManager) this.mapManager.destroy();
      if (this.visionManager) this.visionManager.destroy();
      
      // 4. Reset Static/Global Systems
      MysteryBox.reset();

      // 5. Destroy Entities
      if (this.player) this.player.destroy();
      if (this.crosshair) this.crosshair.destroy();
      if (this.targetLayer) this.targetLayer.destroy();

      // 6. Clear Groups
      const groups = [
          this.bulletGroup, this.obstacleGroup, this.targetGroup, this.policeGroup,
          this.customWallGroup, this.doorGroup, this.barricadeGroup, this.wallBuyGroup,
          this.mysteryBoxGroup
      ];
      
      groups.forEach(g => {
          if (g) g.clear(true, true);
      });
      
      if (this.interactableGroup) this.interactableGroup.clear(true, true);
      
      // Clear Arrays
      this.spawners = [];
      this.crates = [];
      this.targets = [];
      this.customWalls = [];

      // 7. Reset Input
      this.input.setDefaultCursor('default');
      this.input.removeAllListeners();

      // 8. State Cleanup
      this.isPreview = false;
      this.previewMapData = undefined;
      
      console.log('MainGameScene: Shutdown Complete');
  }

  update(time: number, delta: number) {
    if (this.isGameOver || !this.isReady) return; // Block updates until ready

        if (Phaser.Input.Keyboard.JustDown(this.keys.SCOREBOARD)) {
            // Scoreboard logic (if any)
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.INVENTORY)) {
            useEmpireStore.getState().toggleInventory();
        }

    if (this.player) {
      this.player.update(time, delta);
      if (this.visionManager) this.visionManager.update(this.player);
      this.updateCrosshair();
    }

    
    // Update Systems
    // Update Game Mode
    // if (this.gameMode) this.gameMode.update(time, delta);
    
    // Update Spawners (mainly for activation status if needed)
    this.spawners.forEach(s => s.update(time));
  }

  private updateCrosshair() {
      if (this.isGameOver) return;
      
      const pointer = this.input.activePointer;
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.crosshair.clear();
      
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, worldPoint.x, worldPoint.y);
      const stats = this.player.weaponSystem.getActiveWeaponStats();
      
      if (!stats) return; 

      let color = 0xffffff; 
      let isCross = false; 
      
      // Calculate Thresholds
      const deadzone = stats.barrelLength;
      const tooClose = stats.minRange * 0.5;
      const closeWarning = stats.minRange;
      const farWarning = stats.range - (stats.minRange * 0.5); // Symmetric margin
      const maxRange = stats.range;

      if (dist < deadzone) {
          // Deadzone (Red X) - Gun is inside/behind player
          color = 0xff0000;
          isCross = true;
      } else if (dist < tooClose) {
          // Too Close (Red X)
          color = 0xff0000; 
          isCross = true; 
      } else if (dist < closeWarning) {
          // Close Warning (Orange Circle)
          color = 0xffa500; 
      } else if (dist <= farWarning) {
          // Optimal (White Circle)
          color = 0xffffff; 
      } else if (dist <= maxRange) {
          // Far Warning (Orange Circle)
          color = 0xffa500;
      } else {
          // Out of Range (Red X)
          color = 0xff0000; 
          isCross = true; 
      }

      this.crosshair.lineStyle(2, color, 1);
      if (isCross) {
          const s = 10;
          this.crosshair.lineStyle(3, color, 1);
          this.crosshair.beginPath();
          this.crosshair.moveTo(worldPoint.x - s, worldPoint.y - s);
          this.crosshair.lineTo(worldPoint.x + s, worldPoint.y + s);
          this.crosshair.moveTo(worldPoint.x + s, worldPoint.y - s);
          this.crosshair.lineTo(worldPoint.x - s, worldPoint.y + s);
          this.crosshair.strokePath();
      } else {
          this.crosshair.strokeCircle(worldPoint.x, worldPoint.y, 10);
      }
  }

  private createEffects() {
      this.particleManager = this.add.particles(0, 0, 'flare', {
          speed: { min: 50, max: 150 }, scale: { start: 0.4, end: 0 },
          tint: 0xffaa00, blendMode: 'ADD', lifespan: 200, emitting: false
      });
      this.particleManager.setDepth(20);
      this.data.set('sparkEmitter', this.particleManager);

      this.bloodManager = this.add.particles(0, 0, 'flare', {
          speed: { min: 30, max: 100 }, scale: { start: 0.5, end: 0 },
          tint: 0xaa0000, lifespan: 400, emitting: false
      });
      this.bloodManager.setDepth(15); 
      this.data.set('bloodEmitter', this.bloodManager);
  }

  private setupCollisions() {
      // Walls
      if (this.wallLayer) {
        if (!this.wallLayer.layer || !this.wallLayer.layer.data) {
             console.error("MainGameScene: WallLayer invalid in setupCollisions", this.wallLayer);
        } else {
             console.log("MainGameScene: Setup Wall Collisions - Layer Valid", { width: this.wallLayer.width, tiles: this.wallLayer.layer.data.length });
             
             // Register Colliders ONLY if Valid
             this.physics.add.collider(this.player, this.wallLayer);
             this.physics.add.collider(this.policeGroup, this.wallLayer);
             this.physics.add.collider(this.bulletGroup, this.wallLayer, (bullet, wallTile) => {
                  if (wallTile instanceof Phaser.Tilemaps.Tile) this.handleBulletImpact(bullet as Projectile);
             });
        }
      } else {
          console.warn("MainGameScene: WallLayer missing in setupCollisions");
      }

      // Floor (Water) Collision
      if (this.floorLayer) {
           this.physics.add.collider(this.player, this.floorLayer);
           this.physics.add.collider(this.policeGroup, this.floorLayer);
           // NOTE: Do NOT add bullet collider here. Bullets pass over water.
      }

      // Static Groups
      const statics = [this.customWallGroup, this.obstacleGroup, this.targetGroup];
      statics.forEach(grp => {
          this.physics.add.collider(this.player, grp);
          this.physics.add.collider(this.policeGroup, grp);
          this.physics.add.collider(this.bulletGroup, grp, (b, o) => this.handleBulletImpact(b as Projectile, o as Phaser.GameObjects.Sprite));
      });

      // Target Group Overlap for Bullets
      this.physics.add.overlap(this.bulletGroup, this.targetGroup, (b, t) => {
          this.handleBulletEntityHit(b as Projectile, t as Phaser.Physics.Arcade.Sprite);
      });

      // Entities
      this.physics.add.collider(this.policeGroup, this.policeGroup);
      this.physics.add.collider(this.policeGroup, this.player);
      this.physics.add.overlap(this.bulletGroup, this.policeGroup, (b, z) => {
          this.handleBulletEntityHit(b as Projectile, z as Phaser.Physics.Arcade.Sprite);
      });

      // Interactables Collisions
      this.physics.add.collider(this.player, this.doorGroup);
      this.physics.add.collider(this.player, this.doorGroup);
      this.physics.add.collider(this.player, this.barricadeGroup);

      // Pickup Interaction handled by Player or direct overlap if needed
      // PowerUp pickup removed for now
      
      this.physics.add.collider(this.bulletGroup, this.doorGroup, (b, d) => this.handleBulletImpact(b as Projectile));
      // this.physics.add.collider(this.bulletGroup, this.barricadeGroup, (b, bar) => this.handleBulletImpact(b as Projectile)); // Removed to allow bullets to pass through

      this.physics.add.collider(this.policeGroup, this.doorGroup);
      
      this.physics.add.collider(this.policeGroup, this.barricadeGroup, (z, b) => {
          const police = z as Police;
          const barricade = b as Barricade;
          police.handleCollisionWithBarricade(barricade);
      }, (z, b) => {
          const barricade = b as Barricade;
          return barricade.hasPanels();
      });
      
      this.physics.add.overlap(this.policeGroup, this.barricadeGroup, (z, b) => {
           const barricade = b as Barricade;
           if (!barricade.hasPanels()) {
               (z as Police).applySlow();
           }
      });

      this.physics.world.on('worldbounds', (body: Phaser.Physics.Arcade.Body) => {
          if (body.gameObject instanceof Projectile) body.gameObject.disableBody(true, true);
      });
  }

  private handleBulletImpact(bullet: Projectile, object?: Phaser.GameObjects.Sprite) {
      if (!this.scene.isActive()) return;
      const emitter = this.data.get('sparkEmitter') as Phaser.GameObjects.Particles.ParticleEmitter;
      if(emitter) emitter.explode(5, bullet.x, bullet.y);
      bullet.disableBody(true, true);
  }

  private handleBulletEntityHit(bullet: Projectile, target: Phaser.Physics.Arcade.Sprite) {
      if (!this.scene.isActive()) return;
      
      // Calculate Distance for Damage Drop-off
      // We calculate from Player position because recoil/sway moves the bullet start point
      // checking from "shooter" is standard game logic.
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
      const stats = bullet.getData('stats') as WeaponAttributes;
      let damage = stats.damage || 10;

      // Calculate Thresholds (Must match Crosshair)
      const deadzone = stats.barrelLength;
      const tooClose = stats.minRange * 0.5;
      const farWarning = stats.range - (stats.minRange * 0.5);

      if (dist < deadzone) {
          // Deadzone (Red X): 5% Damage
          damage = Math.floor(damage * 0.05);
      } else if (dist < tooClose) {
          // Too Close (Red X): 5% Damage
          damage = Math.floor(damage * 0.05);
      } else if (dist > stats.range) {
           // Too Far (Red X): 5% Damage
           damage = Math.floor(damage * 0.05);
      } else if (dist > farWarning) {
          // Far Warning (Orange): 50% Damage
          damage = Math.floor(damage * 0.5);
      } else if (dist < stats.minRange) {
          // Close Warning (Orange): 50% Damage
          damage = Math.floor(damage * 0.5);
      }
      // Else: Optimal (White): 100% Damage

      const emitter = this.data.get('bloodEmitter') as Phaser.GameObjects.Particles.ParticleEmitter;
      if(emitter) emitter.explode(10, bullet.x, bullet.y);

      if (target instanceof Police) {
          this.player.addPoints(10);
          const killed = target.takeDamage(damage);
          if (killed) { // Check if died
               // Track Kill
               // Determine if headshot (simplified for now, maybe add hitLocation to recordKill)
               const weaponKey = bullet.getData('weaponKey');
               this.player.recordKill(false, weaponKey); 
               
               // Add XP (e.g., 50 XP per kill)
               ProfileService.addXp(50);
          }
      } else {
          // Target Box Damage Logic
          target.setTint(0xff0000);
          const ch = target.getData('health') || 100;
          const nh = ch - damage;
          target.setData('health', nh);
          
          this.time.delayedCall(100, () => { 
             if(target.active) target.clearTint(); 
          });

          if (nh <= 0) {
              target.destroy();
          }
      }
      
      this.showDamageText(target.x, target.y - 20, damage, 'normal');
      bullet.disableBody(true, true);
  }

  private showDamageText(x: number, y: number, amount: number, type: string) {
      if (!this.scene.isActive()) return;
      const txt = this.add.text(x, y, amount.toString(), {
          fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 2
      });
      txt.setOrigin(0.5, 0.5);
      txt.setDepth(2100);
      this.tweens.add({ targets: txt, y: y - 40, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
  }

  private createBackground() { /* ... */ 
    const gridSize = WORLD.TILE_SIZE;
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.lineStyle(1, 0x333333);
    graphics.strokeRect(0, 0, gridSize, gridSize);
    graphics.generateTexture('grid', gridSize, gridSize);
    graphics.destroy();
    // Grid is 3000x3000px. Standard Position 0,0 with Origin 0,0 aligns with Map (0,0).
    const bg = this.add.tileSprite(0, 0, 4000, 4000, 'grid'); 
    bg.setOrigin(0, 0); // Align Top-Left to 0,0
    bg.setPosition(-2000, -2000); // Cover Negative Space, -2000 is divisible by 32 (32 * 62.5). Wait. 2000/32 = 62.5. 
    // We need a multiple of 32. 32 * 63 = 2016.
    bg.setPosition(-2016, -2016);
    bg.setDepth(-100);
  }
  private createCrateTexture() { /* ... */
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.lineStyle(2, 0x5D2906, 1);
    graphics.strokeRect(0, 0, 32, 32);
    graphics.generateTexture('crate', 32, 32);
    graphics.destroy();
   }
  private createTargetTexture() { /* ... */
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.lineStyle(2, 0xff0000, 1);
    graphics.strokeRect(0, 0, 32, 32);
    graphics.generateTexture('target', 32, 32);
    graphics.destroy();
   }
  private createCustomWallTexture() { /* ... */ 
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0x555555, 1); // Dark Gray
    graphics.fillRect(0, 0, 16, 16);
    graphics.lineStyle(1, 0x333333);
    graphics.strokeRect(0, 0, 16, 16);
    graphics.destroy();
   }

   private createTilesetTexture() {
       // Force update if it exists
       if (this.textures.exists('procedural_tileset')) {
           this.textures.remove('procedural_tileset');
       }
       
       // Create a strip of 5 tiles: [Empty, Wall, Water, Grass, Floor]
       const canvas = this.textures.createCanvas('procedural_tileset', 32 * 5, 32);
       if (!canvas) return;
       
       const ctx = canvas.getContext();
       
       // Index 0: Empty (Transparent)
       
       // Index 1: Wall (Brick Pattern)
       const wx = 32;
       ctx.fillStyle = '#5D2906'; // Dark Brown Background (Mortar)
       ctx.fillRect(wx, 0, 32, 32);
       ctx.fillStyle = '#8B4513'; // Brick Color
       // Draw Bricks
       // Row 1
       ctx.fillRect(wx, 0, 14, 10); ctx.fillRect(wx + 16, 0, 14, 10);
       // Row 2 (Offset)
       ctx.fillRect(wx, 12, 6, 8); ctx.fillRect(wx + 8, 12, 14, 8); ctx.fillRect(wx + 24, 12, 6, 8);
       // Row 3
       ctx.fillRect(wx, 22, 14, 10); ctx.fillRect(wx + 16, 22, 14, 10);
       
       // Index 2: Water (Waves)
       const wax = 64;
       // Gradient Background
       const grd = ctx.createLinearGradient(wax, 0, wax, 32);
       grd.addColorStop(0, '#006994'); // Light Sea Blue
       grd.addColorStop(1, '#003366'); // Deep Blue
       ctx.fillStyle = grd;
       ctx.fillRect(wax, 0, 32, 32);
       
       // Shine/Glint
       ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
       ctx.beginPath();
       ctx.arc(wax + 24, 6, 4, 0, Math.PI * 2);
       ctx.fill();
       
       // Texture / Ripples
       ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
       ctx.lineWidth = 1.5;
       ctx.beginPath();
       
       // Draw organic waves
       const drawWave = (offsetY: number, phase: number) => {
           for (let x = 0; x <= 32; x++) {
               const y = Math.sin((x + phase) * 0.2) * 2 + offsetY;
               if (x === 0) ctx.moveTo(wax + x, y);
               else ctx.lineTo(wax + x, y);
           }
       };
       
       drawWave(10, 0);
       drawWave(18, 10);
       drawWave(26, 5);
       
       ctx.stroke();

       
       // Index 3: Grass (Noise/Tufts)
       const gx = 96;
       ctx.fillStyle = '#1a4a1a'; // Darker Base Green
       ctx.fillRect(gx, 0, 32, 32);
       ctx.fillStyle = '#2d6e2d'; // Lighter Grass
       for(let i=0; i<40; i++) {
           const rx = Math.random() * 32;
           const ry = Math.random() * 32;
           ctx.fillRect(gx + rx, ry, 2, 2);
       }
       
       // Index 4: Floor (Stone Tiles)
       const fx = 128;
       ctx.fillStyle = '#333333'; // Dark Grey
       ctx.fillRect(fx, 0, 32, 32);
       ctx.strokeStyle = '#444444'; // Light outline
       ctx.lineWidth = 2;
       ctx.strokeRect(fx + 2, 2, 13, 13);
       ctx.strokeRect(fx + 17, 2, 13, 13);
       ctx.strokeRect(fx + 2, 17, 13, 13);
       ctx.strokeRect(fx + 17, 17, 13, 13);
       
       canvas.refresh();
   }
}