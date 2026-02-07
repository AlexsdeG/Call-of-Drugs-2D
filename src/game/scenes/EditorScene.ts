import * as Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { CityScene } from './CityScene'; // Renamed from MainGameScene
import { Police } from '../entities/Police'; // Added import for Police
// Ensure these imports exist. If MapSerializer/ProjectStorage are not visible, we need to check paths.
// They are likely ../systems/MapSerializer and ../storage/ProjectStorage
import { MapSerializer } from '../systems/MapSerializer';
import { ProjectStorage } from '../storage/ProjectStorage';
import { HistoryManager, EditorAction } from '../systems/HistoryManager';

interface EditorObject {
    id: string;
    type: string;
    x: number;
    y: number;
    rotation: number;
    width: number;
    height: number;
    sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;
    properties: Record<string, any>;
    scripts?: any[]; // using any[] to avoid strict type deps in this file for now, or import Script
}

export class EditorScene extends Phaser.Scene {
  private controls!: Phaser.Cameras.Controls.SmoothedKeyControl;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private cursorGraphics!: Phaser.GameObjects.Graphics;
  private isDrawing: boolean = false;
  
  // Tools
  private currentTool: 'paint' | 'erase' | 'select' | 'place_object' = 'paint';
  private currentTileIndex: number = 1; 
  private currentObjectType: string = 'Spawner'; // Default object to place

  // Objects
  private editorObjects: Map<string, EditorObject> = new Map();
  private selectedObject: EditorObject | null = null;
  private isDraggingObject: boolean = false;

  // Grid config
  private TILE_SIZE = 32;
  private readonly GRID_COLOR = 0x444444;
  private gridSize: number = 32; // Default snap size

  private readonly GRID_ALPHA = 0.5;

  private tiles: Map<string, Phaser.GameObjects.Image> = new Map();
  private mapWidth: number = 50; // default 50x50
  private mapHeight: number = 50;

  private brushSettings: { shape: 'square' | 'circle', width: number, height: number } = { shape: 'square', width: 1, height: 1 };
  
  private isPanning: boolean = false;
  private lastPanPoint: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

  // Editor Data to restore
  private restoreData?: any;
  private restoreDirty: boolean = false;

  public history!: HistoryManager;
  private batchPaintAction: { x: number, y: number, prev: number, new: number }[] = [];
  private dragStartPos: { x: number, y: number } | null = null;


  constructor() {
    super({ key: 'EditorScene' });
  }

  init(data: { mapData?: any, isDirty?: boolean }) { // MapData
      this._isDirty = false; // Ensure clean slate on init
      if (data && data.mapData) {
          this.restoreData = data.mapData;
          this.restoreDirty = data.isDirty || false;
      } else {
          this.restoreData = null;
          this.restoreDirty = false;
      }
  }

  create() {
    this.scene.stop('CityScene'); // Ensure Game is stopped
    this.cameras.main.setBackgroundColor('#111111');
    
    // 0. Generate Editor Resources
    this.createEditorTextures();

    // 0.5 History
    this.history = new HistoryManager();

    // 1. Grid Visualization
    this.createGrid();

    // 1.5 Restore State if exists
    if (this.restoreData) {
        console.log("EditorScene: Restoring State from Preview Return");
        try {
            MapSerializer.deserialize(this, this.restoreData);
            
            // Delay reporting dirty state to ensure UI (EditorOverlay) has mounted and subscribed
            this.time.delayedCall(200, () => {
                if (this.restoreDirty) {
                    this.markDirty();
                } else {
                    this.setClean();
                }
            });
        } catch (e) {
            console.error("EditorScene: Failed to restore state", e);
        }
    }

    // 1.5 Cursor Graphics
    this.cursorGraphics = this.add.graphics();
    this.cursorGraphics.setDepth(1000); // High depth

    // 2. Camera Controls
    this.input.mouse!.disableContextMenu(); // Prevent right click menu
    
    // Create WASD keys
    const keys = this.input.keyboard!.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    }) as any;

    const controlConfig = {
        camera: this.cameras.main,
        left: keys.left,
        right: keys.right,
        up: keys.up,
        down: keys.down,
        zoomIn: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
        zoomOut: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
        acceleration: 0.06,
        drag: 0.0005,
        maxSpeed: 1.0
    };
    this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl(controlConfig);
    
    // Center camera initially
    this.cameras.main.centerOn(this.mapWidth * this.TILE_SIZE / 2, this.mapHeight * this.TILE_SIZE / 2);

    // 3. Input Handling
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('pointermove', this.handlePointerMove, this);

    // Tests
    // if (import.meta.env.DEV) {
    //     mapEditorTests();
    //     TestRunner.setScene(this);
    //     TestRunner.runAll();
    // }
    
    // Zoom with mouse wheel
    this.input.on('wheel', (_u: unknown, _g: unknown, _x: number, deltaY: number, _z: number) => {
        // ... (existing zoom)
        // If we want to support ctrl+z here we need global key listener or scene key listener
    });

    // Undo/Redo Keys (Ctrl+Z, Ctrl+Y)
    this.input.keyboard!.on('keydown-Z', (event: KeyboardEvent) => {
        if (event.ctrlKey || event.metaKey) {
            this.handleUndo();
        }
    });

    this.input.keyboard!.on('keydown-Y', (event: KeyboardEvent) => {
         if (event.ctrlKey || event.metaKey) {
             this.handleRedo();
         }
    });

    this.input.on('wheel', (_u: unknown, _g: unknown, _x: number, deltaY: number, _z: number) => {
        const newZoom = this.cameras.main.zoom - deltaY * 0.001;
        this.cameras.main.setZoom(Phaser.Math.Clamp(newZoom, 0.1, 4));
    });

    // 4. Event Listeners
    EventBus.on('editor-tool-change', this.handleToolChange, this);
    EventBus.on('editor-map-resize', this.handleMapResize, this);
    EventBus.on('editor-brush-update', this.handleBrushUpdate, this);
    EventBus.on('editor-object-select', this.handleObjectSelect, this);
    EventBus.on('editor-object-delete', this.handleObjectDelete, this);
    EventBus.on('editor-object-update-prop', this.handleObjectUpdateProp, this);
    EventBus.on('editor-grid-update', this.handleGridSizeUpdate, this);
    EventBus.on('editor-object-add-script', this.handleAddScript, this);
    EventBus.on('editor-script-update', this.handleScriptUpdate, this);
    EventBus.on('editor-script-delete', this.handleScriptDelete, this);
    
    // Input Focus Handling
    EventBus.on('editor-input-focus', this.handleInputFocus, this);
    EventBus.on('editor-input-blur', this.handleInputBlur, this);

      // I/O Commands from Overlay
      EventBus.on('editor-command-save', this.handleSaveProject, this);
      EventBus.on('editor-command-save-file', this.handleSaveFile, this);
      EventBus.on('editor-command-import', this.handleImportProject, this);
      EventBus.on('editor-command-preview', this.handlePreviewMap, this);
      
      EventBus.on('editor-script-delete', this.handleScriptDelete, this);
    EventBus.on('check-editor-status', () => console.log('EditorScene is Active'), this);
    
    // I/O Commands from Overlay
      
      // Safety: If game starts externally (e.g. from Menu), ensure we die
      // If we are still active when 'start-game' fires, MenuScene likely wasn't active to handle it.
      EventBus.off('start-game', this.handleAutoShutdown, this); // Prevent dupe
      EventBus.on('start-game', this.handleAutoShutdown, this);

      // History Events
      EventBus.on('editor-undo', this.handleUndo, this);
      EventBus.on('editor-redo', this.handleRedo, this);

      EventBus.on('editor-history-jump', (targetIndex: number) => {
          const { undo } = this.history.getHistory();
          const currentUndoLength = undo.length; // Number of actions currently applied
          // targetIndex is 0-based index of the action in the full chronological list.
          // IF we click item i, we want the state AFTER action i is applied.
          // So we want undo stack length to be i + 1.
          
          const targetLength = targetIndex + 1;
          const diff = targetLength - currentUndoLength;
          
          if (diff < 0) {
              // We need to Undo abs(diff) times
              const count = Math.abs(diff);
              for (let k = 0; k < count; k++) {
                  this.handleUndo();
              }
          } else if (diff > 0) {
              // We need to Redo diff times
              for (let k = 0; k < diff; k++) {
                  this.handleRedo();
              }
          }
      });
      


      
      // Input Blocking (Modals)
      EventBus.on('editor-input-enable', this.handleInputEnable, this);

      // Focus Game on click (only if controls enabled)
      this.input.on('pointerdown', () => {
          if (this.controlsEnabled) {
              this.game.canvas.focus();
              window.focus();
          }
      });

    // Notify UI we are ready
    this.time.delayedCall(100, () => {
        EventBus.emit('scene-ready', { scene: 'EditorScene' });
        // Enforce Default Tool sync
        EventBus.emit('editor-tool-change-internal', { tool: 'paint', tileIndex: 1 });
    });

    // Exit Listener
    EventBus.on('exit-game', this.handleExit, this);
    
    // Default Tool: Paint Wall
    this.currentTool = 'paint';
    this.currentTileIndex = 1;

    // Globals
    this.mapGlobalVariables = [];
    this.mapGlobalScripts = [];
    EventBus.on('editor-update-globals', this.handleGlobalUpdate, this);
    
    // Shutdown Handler
    this.events.on('shutdown', this.shutdown, this);
  }

  // Named Handlers
  private handleExit() {
      console.log('EditorScene: handleExit -> Switching to MenuScene');
      this.scene.start('MenuScene');
  }

  private handleAutoShutdown() {
      console.warn('EditorScene: Auto-Shutdown triggered by start-game. RECOVERY: Starting CityScene.');
      // If we are here, MenuScene failed to start CityScene because Editor was still active.
      // We must take over and start the game to prevent black screen.
      this.scene.start('CityScene', { isPreview: false, mapData: null });
  }

  private handleInputEnable(enabled: boolean) {
      if (enabled) {
          this.handleInputBlur(); // Re-enable controls
      } else {
          this.handleInputFocus(); // Disable controls & Clear Captures
      }
  }

  // Global State
  private mapGlobalVariables: any[] = []; // GlobalVariable[]
  private mapGlobalScripts: any[] = []; // Script[]

  private handleGlobalUpdate(data: { variables: any[], scripts: any[] }) {
      this.mapGlobalVariables = data.variables;
      this.mapGlobalScripts = data.scripts;
  }

  private handleInputFocus() {
      this.controlsEnabled = false;
      if (this.input.keyboard) {
          this.input.keyboard.enabled = false;
          // Clear captures to let browser handle the keys (like typing in textarea)
          this.input.keyboard.clearCaptures();
      }
  }

  private handleInputBlur() {
      this.controlsEnabled = true;
      if (this.input.keyboard) {
          this.input.keyboard.enabled = true;
          // Re-enable captures for game controls if needed
          // WASDQE are handled by this.controls (SmoothedKeyControl) which uses Key objects.
          // We might want to re-add captures just in case, but usually enabled=true is enough if keys exist.
      }
  }
  
  private controlsEnabled: boolean = true;

  update(time: number, delta: number) {
      if (!this.controlsEnabled) return;

      this.controls.update(delta);
  }

  // Dirty State
  private _isDirty: boolean = false;

  public get isDirty(): boolean {
      return this._isDirty;
  }

  public setClean() {
      this._isDirty = false;
      EventBus.emit('editor-clean-state');
  }

  public markDirty() {
      if (!this._isDirty) {
          this._isDirty = true;
          EventBus.emit('editor-dirty-state');
      }
  }
  
  // --- ACCESSORS For Serializer ---
  
  public getMapDimensions() {
      return { width: this.mapWidth, height: this.mapHeight, tileSize: this.TILE_SIZE };
  }

  public getTiles() {
      const tiles: {x: number, y: number, index: number}[] = [];
      this.tiles.forEach((tile, key) => {
          // Parse key "x,y"
          const parts = key.split(',');
          const tx = parseInt(parts[0]);
          const ty = parseInt(parts[1]);
          // Determine index based on texture key
          let idx = 0;
          if (tile.texture.key === 'editor_wall') idx = 1;
          else if (tile.texture.key === 'editor_water') idx = 2;
          else if (tile.texture.key === 'editor_grass') idx = 3;
          // default floor is 0 (implicit) or explicitly saved? 
          // If we used editor_floor -> 4? 
          // For now let's map: 
          // editor_floor (implicit base) -> 0? But 0 usually means empty. 
          // Let's assume editor_floor is index 5 or treat as 0 if we assume default floor.
          // In serialize logic: if index > 0 it saves.
          else if (tile.texture.key === 'editor_floor') idx = 4; 
          
          tiles.push({ 
              x: tx * this.TILE_SIZE, 
              y: ty * this.TILE_SIZE, 
              index: idx 
          });
      });
      return tiles;
  }

  public getEditorObjects(): EditorObject[] {
      return Array.from(this.editorObjects.values());
  }

  public clearEditor() {
      // Clear Tiles
      this.tiles.forEach(t => t.destroy());
      this.tiles.clear();
      
      // Clear Objects
      this.editorObjects.forEach(o => o.sprite.destroy());
      this.editorObjects.clear();
      this.selectedObject = null;
      
      // Reset Grid
      this.mapWidth = 50; 
      this.mapHeight = 50;
      this.createGrid();
      
      this.markDirty();
  }

  public handleMapResize(data: { width: number, height: number }) {
      this.mapWidth = data.width;
      this.mapHeight = data.height;
      this.createGrid();
      this.markDirty();
  }

  public paintTileAtGrid(gx: number, gy: number, index: number) {
      // Reuse internal logic but bypass tool check
      // We need a way to set tile by index directly
      const key = `${gx},${gy}`;
      
      // If valid existing, destroy
      if (this.tiles.has(key)) {
          this.tiles.get(key)!.destroy();
      }
      
      // Get texture
      const texture = this.getTextureKey(index);
      if (texture) {
          const tile = this.add.image(gx * this.TILE_SIZE + 16, gy * this.TILE_SIZE + 16, texture);
          tile.setDepth(0); // Ensure tiles are at bottom
          this.tiles.set(key, tile);
      }
  }

  public restoreObject(data: any) {
     // Re-create object
     // We can reuse placeObject logic but we need to bypass "currentTool" and "pointer"
     // Refactor createObject visual logic
     
     const { id, type, x, y, width, height, properties, scripts } = data;
     
     // Visuals
     const container = this.add.container(x, y);
     const gfx = this.add.graphics();
     
     let w = width;
     let h = height;

      if (type === 'TriggerZone') {
          gfx.lineStyle(2, 0xffff00, 1);
          gfx.fillStyle(0xffff00, 0.2); 
          const radius = properties.radius || 32;
          gfx.strokeCircle(0, 0, radius);
          gfx.fillCircle(0, 0, radius);
      } else if (type === 'CustomObject') {
          const color = parseInt((properties.color || '#888888').replace('#', '0x'));
          gfx.lineStyle(2, 0xffffff, 1);
          gfx.fillStyle(color, 0.8);
          gfx.strokeRect(-w/2, -h/2, w, h);
          gfx.fillRect(-w/2, -h/2, w, h);
      } else if (type === 'Spawner') gfx.fillStyle(0xff0000, 0.7);
      else if (type === 'SpawnPoint') gfx.fillStyle(0x00ffff, 0.7);
      else if (type === 'Barricade') gfx.fillStyle(0x8B4513, 0.7);
      else if (type === 'Door') gfx.fillStyle(0x888888, 0.7);
      else if (type === 'MysteryBox') gfx.fillStyle(0x0000ff, 0.7);
      else gfx.fillStyle(0xaaaaaa, 0.7);
      
      if (type !== 'TriggerZone') {
          gfx.fillRect(-w/2, -h/2, w, h);
          // Face
          gfx.fillStyle(0xffffff, 0.8);
          gfx.fillRect((w/2) - 4, -2, 4, 4);
      }

      const label = properties.name || type.substring(0, 4);
      const text = this.add.text(0, 0, label, { fontSize: '10px', color: '#ffffff' });
      text.setOrigin(0.5);
      
      container.add([gfx, text]);
      container.setSize(w, h);
      
      // Rotation
      // Note: container rotation is in radians usually, but we might store degrees?
      // Check placeObject... checking... `properties.rotation` usually. 
      // If we use container.rotation it rotates visuals.
      // properties.rotation is just data.
      // Let's ensure visuals match properties if needed? 
      // Current implementation doesn't visibly rotate container unless we act on it. 
      
      const obj: EditorObject = {
          id,
          type,
          x,
          y,
          rotation: properties.rotation || 0,
          width: w,
          height: h,
          sprite: container,
          properties,
          scripts: scripts || []
      };
      
      // Apply saved rotation to Visuals
      if (obj.rotation !== 0) {
          container.setAngle(obj.rotation);
      }
      
      this.editorObjects.set(id, obj);
  }

  shutdown() {
      console.log("EditorScene: Shutdown");
      // Input
      if (this.controls) this.controls.stop(); 
      this.input.removeAllListeners();

      // Remove Listeners
      EventBus.off('editor-tool-change', this.handleToolChange, this);
      EventBus.off('editor-map-resize', this.handleMapResize, this);
      EventBus.off('editor-brush-update', this.handleBrushUpdate, this);
      EventBus.off('editor-object-select', this.handleObjectSelect, this);
      EventBus.off('editor-object-delete', this.handleObjectDelete, this);
      EventBus.off('editor-object-update-prop', this.handleObjectUpdateProp, this);
      EventBus.off('editor-grid-update', this.handleGridSizeUpdate, this);
      EventBus.off('editor-object-add-script', this.handleAddScript, this);
      EventBus.off('editor-script-update', this.handleScriptUpdate, this);
      EventBus.off('editor-script-delete', this.handleScriptDelete, this);
      EventBus.off('editor-update-globals', this.handleGlobalUpdate, this);
      EventBus.off('editor-input-focus', this.handleInputFocus, this);
      EventBus.off('editor-input-blur', this.handleInputBlur, this);
      EventBus.off('editor-command-import', this.handleImportProject, this);
      EventBus.off('editor-command-preview', this.handlePreviewMap, this);
      
      // I/O
      EventBus.off('editor-command-save', this.handleSaveProject, this);
      EventBus.off('editor-command-save-file', this.handleSaveFile, this);
      
      EventBus.off('editor-input-enable', this.handleInputEnable, this);
      EventBus.off('exit-game', this.handleExit, this);
      EventBus.off('start-game', this.handleAutoShutdown, this);

      EventBus.off('editor-undo', this.handleUndo, this);
      EventBus.off('editor-redo', this.handleRedo, this);

      
      // Properly Destroy Tiles
      this.tiles.forEach(t => t.destroy());
      this.tiles.clear();
      
      if (this.cursorGraphics) this.cursorGraphics.destroy();
      if (this.gridGraphics) this.gridGraphics.destroy();
      
      // Destroy Editors Objects
      this.editorObjects.forEach(o => o.sprite.destroy());
      this.editorObjects.clear();
      this.selectedObject = null;
  }
  
  private createEditorTextures() {
      // Wall (Light Brown with Brown X)
      if (!this.textures.exists('editor_wall')) {
          const g = this.make.graphics({x:0, y:0});
          g.fillStyle(0x8B5A2B); // Light Brown
          g.fillRect(0,0,32,32);
          g.lineStyle(2, 0x3E2723); // Dark Brown
          g.strokeRect(0,0,32,32);
          // X pattern
          g.lineStyle(2, 0x3E2723);
          g.moveTo(0,0); g.lineTo(32,32);
          g.moveTo(32,0); g.lineTo(0,32);
          g.generateTexture('editor_wall', 32, 32);
          g.destroy();
      }

      // Floor (Dark Tile)
      if (!this.textures.exists('editor_floor')) {
          const g = this.make.graphics({x:0, y:0});
          g.fillStyle(0x222222);
          g.fillRect(0,0,32,32);
          g.lineStyle(1, 0x333333); // Faint border
          g.strokeRect(0,0,32,32);
          g.generateTexture('editor_floor', 32, 32);
          g.destroy();
      }

      // Water (Blue with details)
      if (!this.textures.exists('editor_water')) {
          const canvas = this.textures.createCanvas('editor_water', 32, 32);
          if (canvas) {
              const ctx = canvas.getContext();
              
              // Gradient
              const grd = ctx.createLinearGradient(0, 0, 0, 32);
              grd.addColorStop(0, '#0055AA');
              grd.addColorStop(1, '#003388');
              ctx.fillStyle = grd;
              ctx.fillRect(0,0,32,32);

              // Ripple lines
              ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              
              // Wave 1
              ctx.moveTo(2, 8); ctx.quadraticCurveTo(8, 4, 14, 8);
              // Wave 2
              ctx.moveTo(18, 14); ctx.quadraticCurveTo(24, 10, 30, 14);
              // Wave 3
              ctx.moveTo(6, 24); ctx.quadraticCurveTo(12, 20, 18, 24);
              ctx.stroke();
              
              // Highlights
              ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
              ctx.beginPath();
              ctx.arc(4, 4, 1, 0, Math.PI*2);
              ctx.arc(28, 20, 1, 0, Math.PI*2);
              ctx.arc(12, 16, 2, 0, Math.PI*2);
              ctx.fill();
              
              canvas.refresh();
          }
      }

      // Grass (Green)
      if (!this.textures.exists('editor_grass')) {
          const g = this.make.graphics({x:0, y:0});
          g.fillStyle(0x114411);
          g.fillRect(0,0,32,32);
          g.fillStyle(0x226622); // Specs
          g.fillRect(5,5,2,2); g.fillRect(20,10,2,2); g.fillRect(10,25,2,2);
          g.generateTexture('editor_grass', 32, 32);
          g.destroy();
      }
  }

  private createGrid() {
    if (this.gridGraphics) this.gridGraphics.destroy();
    
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.lineStyle(1, this.GRID_COLOR, this.GRID_ALPHA);

    // World size based on tiles
    const widthPx = this.mapWidth * this.TILE_SIZE;
    const heightPx = this.mapHeight * this.TILE_SIZE;
    
    // Vertical lines
    for (let x = 0; x <= widthPx; x += this.TILE_SIZE) {
      this.gridGraphics.moveTo(x, 0);
      this.gridGraphics.lineTo(x, heightPx);
    }

    // Horizontal lines
    for (let y = 0; y <= heightPx; y += this.TILE_SIZE) {
      this.gridGraphics.moveTo(0, y);
      this.gridGraphics.lineTo(widthPx, y);
    }

    this.gridGraphics.strokePath();
    this.gridGraphics.setDepth(100); // Grid on top
  }

  // --- I/O Handlers ---

  private async handleSaveProject(data: { name: string }) {
      try {
          const mapData = MapSerializer.serialize(this, data.name);
          await ProjectStorage.saveProject(mapData);
          EventBus.emit('editor-save-success', data.name);
          this.setClean();
      } catch (err) {
          console.error(err);
          EventBus.emit('editor-io-error', 'Failed to Save Project');
      }
  }
  
  private async handleSaveFile(data: { name: string }) {
      try {
          const mapData = MapSerializer.serialize(this, data.name);
          // Download as Game Format (Unified)
          await ProjectStorage.downloadProject(mapData); 
          EventBus.emit('editor-save-success', data.name); 
          this.setClean();
      } catch (err) {
          console.error(err);
          EventBus.emit('editor-io-error', 'Failed to Download File');
      }
  }



  private handleImportProject(data: any) { // MapData
      try {
          MapSerializer.deserialize(this, data);
          this.setClean(); 
      } catch (e) {
          console.error(e);
          EventBus.emit('editor-io-error', 'Failed to Load Map Data');
      }
  }

  private handlePreviewMap() {
    const editorData = MapSerializer.serialize(this, "Preview");
    const gameData = MapSerializer.translateToGameFormat(editorData);
    EventBus.emit('editor-preview-start');
    const isDirty = this.isDirty;
    this.scene.start('CityScene', { 
        mapData: gameData, 
        editorMapData: editorData, // Pass original for restoration
        editorDirty: isDirty,
        isPreview: true 
    });
  }



  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    if (pointer.middleButtonDown()) {
        this.isPanning = true;
        this.lastPanPoint.set(pointer.x, pointer.y);
        this.game.canvas.style.cursor = 'grabbing';
        return;
    }

    if (!pointer.primaryDown) return;

    // Focus game
    this.game.canvas.focus();
    window.focus();

    if (this.currentTool === 'place_object') {
        this.placeObject(pointer);
    } else if (this.currentTool === 'select') {
        this.selectObject(pointer);
    } else {
        // Paint/Erase
        this.isDrawing = true;
        this.paintTile(pointer);
    }
    this.updateCursor(pointer);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
      if (this.isPanning) {
          const dx = (pointer.x - this.lastPanPoint.x) / this.cameras.main.zoom;
          const dy = (pointer.y - this.lastPanPoint.y) / this.cameras.main.zoom;
          
          this.cameras.main.scrollX -= dx;
          this.cameras.main.scrollY -= dy;
          
          this.lastPanPoint.set(pointer.x, pointer.y);
          return;
      }

      if (this.currentTool === 'select' && this.isDraggingObject && this.selectedObject) {
          const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
          
          let gx = Math.round(worldPoint.x / this.gridSize) * this.gridSize;
          let gy = Math.round(worldPoint.y / this.gridSize) * this.gridSize;
          
          // Apply offsets if needed (for standard 32x32, we add 16. For MysteryBox 64x32, we add 0 for X, 16 for Y)
          const type = this.selectedObject.type;
          
          if (type === 'MysteryBox') {
               const rot = this.selectedObject.rotation || 0;
               // 0 or 180 (Horizontal): W=64, H=32. Center X on grid (0), Center Y on tile (16)
               // 90 or 270 (Vertical): W=32, H=64. Center X on tile (16), Center Y on grid (0)
               
               if (Math.abs(rot) === 90 || Math.abs(rot) === 270) {
                   gx += 16;
                   gy += 0;
               } else {
                   gx += 0;
                   gy += 16;
               }
          } else {
               gx += 16;
               gy += 16;
          }

          this.selectedObject.x = gx;
          this.selectedObject.y = gy;
          
          if (this.selectedObject.sprite instanceof Phaser.GameObjects.Container) {
             this.selectedObject.sprite.setPosition(this.selectedObject.x, this.selectedObject.y);
          } else {
             this.selectedObject.sprite.setPosition(this.selectedObject.x, this.selectedObject.y);
          }
          
          EventBus.emit('editor-object-selected', {
              id: this.selectedObject.id,
              type: this.selectedObject.type,
              x: this.selectedObject.x,
              y: this.selectedObject.y,
              properties: this.selectedObject.properties
          });
      } else if (this.isDrawing) {
          this.paintTile(pointer);
      }
      this.updateCursor(pointer);
  }

  private handlePointerUp() {
      if (this.isPanning) {
          this.isPanning = false;
          this.game.canvas.style.cursor = 'default';
      }
      
      // End Batch Paint
      if (this.isDrawing && this.batchPaintAction.length > 0) {
           this.history.push({
               type: 'PAINT_TILES',
               label: 'Paint Tiles',
               timestamp: Date.now(),
               data: [...this.batchPaintAction]
           });
           this.batchPaintAction = [];
      }
      
      // End Object Drag
      if (this.isDraggingObject && this.selectedObject && this.dragStartPos) {
          if (this.selectedObject.x !== this.dragStartPos.x || this.selectedObject.y !== this.dragStartPos.y) {
              
              const tileChanges: any[] = [];
              if (this.selectedObject.type === 'Door' || this.selectedObject.type === 'Barricade') {
                  // Capture new tile change
                  const tx = Math.floor(this.selectedObject.x / this.TILE_SIZE);
                  const ty = Math.floor(this.selectedObject.y / this.TILE_SIZE);
                  const change = this.setTile(tx, ty, 0);
                  if (change) tileChanges.push(change);
              }

              this.history.push({
                  type: 'MOVE_OBJECT',
                  label: `Move ${this.selectedObject.type}`,
                  timestamp: Date.now(),
                  data: { 
                      id: this.selectedObject.id, 
                      prevX: this.dragStartPos.x, 
                      prevY: this.dragStartPos.y, 
                      newX: this.selectedObject.x, 
                      newY: this.selectedObject.y,
                      tileChanges // Include tile changes
                  }
              });
              this.markDirty();
          }
          this.dragStartPos = null;
      }

      this.isDrawing = false;
      this.isDraggingObject = false;
  }

  private handleBrushUpdate(data: { shape: 'square' | 'circle', width: number, height: number }) {
      this.brushSettings = data;
  }
  
  private handleGridSizeUpdate(size: number) {
      this.gridSize = size;
  }

  private paintTile(pointer: Phaser.Input.Pointer) {
      const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      const centerX = Math.floor(worldPoint.x / this.TILE_SIZE);
      const centerY = Math.floor(worldPoint.y / this.TILE_SIZE);
      
      const width = this.brushSettings.width;
      const height = this.brushSettings.height;
      const shape = this.brushSettings.shape;

      const startX = centerX - Math.floor((width - 1) / 2);
      const startY = centerY - Math.floor((height - 1) / 2);
      
      for (let x = 0; x < width; x++) {
          for (let y = 0; y < height; y++) {
              const tileX = startX + x;
              const tileY = startY + y;
              if (tileX < 0 || tileY < 0 || tileX >= this.mapWidth || tileY >= this.mapHeight) continue;
              
              if (shape === 'circle') {
                  const bcx = (width - 1) / 2;
                  const bcy = (height - 1) / 2;
                  const a = width / 2;
                  const b = height / 2;
                  if ((Math.pow((x - bcx)/a, 2) + Math.pow((y - bcy)/b, 2)) > 1.0) continue; 
              }
              this.applyTileAction(tileX, tileY);
          }
      }
  }

  private getTileIndexAt(x: number, y: number): number {
     const key = `${x},${y}`;
     const tile = this.tiles.get(key);
     if (!tile) return 0; // Empty/Default
     if (tile.texture.key === 'editor_wall') return 1;
     if (tile.texture.key === 'editor_water') return 2;
     if (tile.texture.key === 'editor_grass') return 3;
     if (tile.texture.key === 'editor_floor') return 4;
     return 0;
  }

  private applyTileAction(tileX: number, tileY: number, isUndoRedo: boolean = false) {
      const key = `${tileX},${tileY}`;
      const prevIndex = this.getTileIndexAt(tileX, tileY);
      let newIndex = this.currentTileIndex;

      if (this.currentTool === 'erase') {
          newIndex = 0; // Erase means 0
          if (!this.tiles.has(key)) return; // Already empty
          
          this.tiles.get(key)!.destroy();
          this.tiles.delete(key);
          this.markDirty();
      } else {
          // Paint
          const existing = this.tiles.get(key);
          const texture = this.getTextureKey(this.currentTileIndex);
          if (existing && existing.texture.key === texture) return; // Same tile
          
          if (existing) existing.destroy();
          
          // Create new
         if (texture) {
              const tile = this.add.image(tileX * this.TILE_SIZE + 16, tileY * this.TILE_SIZE + 16, texture);
              tile.setDepth(0); 
              this.tiles.set(key, tile);
          }
          this.markDirty();
      }

      // Record History (if not playing back)
      if (!isUndoRedo) {
          this.batchPaintAction.push({ 
              x: tileX, 
              y: tileY, 
              prev: prevIndex, 
              new: newIndex 
          });
      }
  }

  // Overload for Direct Paint (Undo/Redo)
  private paintTileDirect(x: number, y: number, index: number) {
      const key = `${x},${y}`;
      if (this.tiles.has(key)) {
          this.tiles.get(key)!.destroy();
          this.tiles.delete(key);
      }
      
      if (index === 0) return; // Empty

      const texture = this.getTextureKey(index);
      if (texture) {
          const tile = this.add.image(x * this.TILE_SIZE + 16, y * this.TILE_SIZE + 16, texture);
          tile.setDepth(0);
          this.tiles.set(key, tile);
      }
  }

  private handleUndo() {
      const action = this.history.undo();
      if (!action) return;
      this.applyHistoryAction(action, true);
  }

  private handleRedo() {
      const action = this.history.redo();
      if (!action) return;
      this.applyHistoryAction(action, false);
  }

  private applyHistoryAction(action: EditorAction, isUndo: boolean) {
      console.log(`Applying ${isUndo ? 'Undo' : 'Redo'}: ${action.type}`);
      
      if (action.type === 'PAINT_TILES') {
          const tiles = action.data as { x: number, y: number, prev: number, new: number }[];
          tiles.forEach(t => {
              const targetIndex = isUndo ? t.prev : t.new;
              this.paintTileDirect(t.x, t.y, targetIndex);
          });
          this.markDirty();
      }
      else if (action.type === 'PLACE_OBJECT') {
          // Undo: Delete | Redo: Place
          const objData = action.data;
          if (isUndo) {
              this.deleteObjectInternal(objData.id);
              // Undo Tile Changes
              if (objData.tileChanges) {
                  objData.tileChanges.forEach((t: any) => this.paintTileDirect(t.x, t.y, t.prev));
              }
          } else {
              this.restoreObject(objData);
              // Redo Tile Changes
              if (objData.tileChanges) {
                  objData.tileChanges.forEach((t: any) => this.paintTileDirect(t.x, t.y, t.new));
              }
          }
          this.markDirty();
      }
      else if (action.type === 'DELETE_OBJECT') {
          // Undo: Restore | Redo: Delete
          const objData = action.data;
          if (isUndo) {
              this.restoreObject(objData);
          } else {
              this.deleteObjectInternal(objData.id);
          }
           this.markDirty();
      }
      else if (action.type === 'UPDATE_PROP') {
            const { id, key, prevVal, newVal } = action.data;
            const targetVal = isUndo ? prevVal : newVal;
            
            // Apply prop
             // Apply prop
             const obj = this.editorObjects.get(id);
             if (obj) {
                 obj.properties[key] = targetVal;
                 
                 // Update visual properties based on key
                 if (key === 'x') obj.x = targetVal;
                 if (key === 'y') obj.y = targetVal;
                 if (key === 'rotation') obj.rotation = targetVal;
                 
                 // Apply Visual Updates
                 if (key === 'x' || key === 'y') (obj.sprite as any).setPosition(obj.x, obj.y);
                 if (key === 'rotation') obj.sprite.setAngle(obj.rotation);
                 
                 // Refresh Complex Visuals
                 if (['width', 'height', 'color', 'radius'].includes(key)) {
                     this.refreshObjectVisuals(obj);
                 }
                 
                 // Name
                 if (key === 'name') {
                      const container = obj.sprite as Phaser.GameObjects.Container;
                      if (container && container.list.length > 1) {
                          (container.getAt(1) as Phaser.GameObjects.Text).setText(targetVal);
                      }
                 }

                 // If selected, re-select to refresh UI
                 if (this.selectedObject && this.selectedObject.id === id) {
                     EventBus.emit('editor-object-selected', { ...obj, sprite: undefined });
                 }
                 this.markDirty();
             }
      }
      else if (action.type === 'UPDATE_SCRIPT') {
           const { id, prevScripts, newScripts } = action.data;
           const target = isUndo ? prevScripts : newScripts;
           const obj = this.editorObjects.get(id);
           if (obj) {
               obj.scripts = JSON.parse(JSON.stringify(target)); // Deep copy
               if (this.selectedObject && this.selectedObject.id === id) {
                     // Force refresh sidebar
                     EventBus.emit('editor-object-selected', { ...obj });
               }
               this.markDirty();
           }
      } else if (action.type === 'MOVE_OBJECT') {
           const { id, prevX, prevY, newX, newY } = action.data;
           const targetX = isUndo ? prevX : newX;
           const targetY = isUndo ? prevY : newY;
           
           const obj = this.editorObjects.get(id);
           if (obj) {
               obj.x = targetX;
               obj.y = targetY;
               (obj.sprite as any).setPosition(obj.x, obj.y);
               
               if (this.selectedObject && this.selectedObject.id === id) {
                   EventBus.emit('editor-object-selected', { ...obj, sprite: undefined });
               }
               this.markDirty();
           }
      }
  }

  // --- Capture Helpers ---

  


  private handleObjectDelete() {
      if (this.selectedObject) {
          const objData = { ...this.selectedObject }; // clone
          this.deleteObjectInternal(this.selectedObject.id);
          this.history.push({
              type: 'DELETE_OBJECT',
              label: `Delete ${objData.type}`,
              timestamp: Date.now(),
              data: objData
          });
          this.markDirty();
      }
  }

  private deleteObjectInternal(id: string) {
        const obj = this.editorObjects.get(id);
        if (obj) {
            obj.sprite.destroy();
            this.editorObjects.delete(id);
            if (this.selectedObject && this.selectedObject.id === id) {
                this.selectedObject = null;
                EventBus.emit('editor-object-deselected');
            }
        }
  }
  
  // Property Update capture (Called from UI event)
  private handleObjectUpdateProp(data: { id: string, key: string, value: any }) {
      const obj = this.editorObjects.get(data.id);
      if (obj) {
          const prevVal = obj.properties[data.key];
          
          // Apply
          obj.properties[data.key] = data.value;
          
          // Visuals: Position
          if (data.key === 'x') { obj.x = data.value; }
          if (data.key === 'y') { obj.y = data.value; }
          
          if (data.key === 'x' || data.key === 'y') {
              (obj.sprite as any).setPosition(obj.x, obj.y);
          }

          // Visuals: Rotation
          if (data.key === 'rotation') {
               obj.rotation = data.value;
               obj.sprite.setAngle(obj.rotation);
               
               // MysteryBox Special Alignment Logic
               if (obj.type === 'MysteryBox') {
                   let gx = Math.round(obj.x / this.gridSize) * this.gridSize;
                   let gy = Math.round(obj.y / this.gridSize) * this.gridSize;
                   if (Math.abs(obj.rotation) === 90 || Math.abs(obj.rotation) === 270) {
                       // Vertical
                       obj.x = gx + 16; obj.y = gy;
                   } else {
                       // Horizontal
                       obj.x = gx; obj.y = gy + 16;
                   }
                   (obj.sprite as any).setPosition(obj.x, obj.y);
               }
          }
          
          // Visuals: Dimensions / Color (Redraw)
          if (['width', 'height', 'color', 'radius'].includes(data.key)) {
              this.refreshObjectVisuals(obj);
          }
          
          // Visuals: Name Label
          if (data.key === 'name') {
              const container = obj.sprite as Phaser.GameObjects.Container;
              if (container.list && container.list.length > 1) {
                  const text = container.getAt(1) as Phaser.GameObjects.Text;
                  if (text) text.setText(data.value);
              }
          }
          
          // Record
          this.history.push({
              type: 'UPDATE_PROP',
              label: `Update ${data.key}`,
              timestamp: Date.now(),
              data: { id: data.id, key: data.key, prevVal, newVal: data.value }
          });
          this.markDirty();
          
          // Refresh UI
          if (this.selectedObject && this.selectedObject.id === data.id) {
               EventBus.emit('editor-object-selected', { ...obj, sprite: undefined });
          }
      }
  }

  // Helper to redraw object graphics based on current properties
  private refreshObjectVisuals(obj: EditorObject) {
      if (obj.sprite instanceof Phaser.GameObjects.Container) {
          const container = obj.sprite;
          const gfx = container.getAt(0) as Phaser.GameObjects.Graphics;
          if (gfx) {
              gfx.clear();
              
              if (obj.type === 'TriggerZone') {
                  const r = obj.properties.radius || 32;
                  obj.width = r * 2; 
                  obj.height = r * 2;
                  
                  gfx.lineStyle(2, 0xffff00, 1);
                  gfx.fillStyle(0xffff00, 0.2);
                  gfx.strokeCircle(0, 0, r);
                  gfx.fillCircle(0, 0, r);
                  container.setSize(r*2, r*2);
              } 
              else if (obj.type === 'CustomObject') {
                  const w = obj.properties.width || 32;
                  const h = obj.properties.height || 32;
                  const color = parseInt((obj.properties.color || '#888888').replace('#', '0x'));
                  
                  obj.width = w;
                  obj.height = h;
                  
                  gfx.lineStyle(2, 0xffffff, 1);
                  gfx.fillStyle(color, 0.8);
                  gfx.strokeRect(-w/2, -h/2, w, h);
                  gfx.fillRect(-w/2, -h/2, w, h);
                  // Face
                  gfx.fillStyle(0xffffff, 0.8);
                  gfx.fillRect((w/2) - 4, -2, 4, 4);

                  container.setSize(w, h);
              }
              // Add other types if they support property-based visual changes
          }
      }
  }

  private selectObject(pointer: Phaser.Input.Pointer) {
       // Simple hit test
       const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
       
       // Reverse iterate to select top-most
       const objects = Array.from(this.editorObjects.values());
       for (let i = objects.length - 1; i >= 0; i--) {
           const obj = objects[i];
           const bounds = obj.sprite.getBounds();
           if (bounds.contains(worldPoint.x, worldPoint.y)) {
               this.selectedObject = obj;
               this.isDraggingObject = true;
               this.dragStartPos = { x: obj.x, y: obj.y };
               EventBus.emit('editor-object-selected', { ...obj });
               return;
           }
       }
       
       this.selectedObject = null;
       EventBus.emit('editor-object-deselected');
  }





  private getTextureKey(index: number): string {
      switch(index) {
          case 0: return 'editor_floor';
          case 1: return 'editor_wall';
          case 2: return 'editor_water';
          case 3: return 'editor_grass';
          default: return 'editor_floor';
      }
  }

  private updateCursor(pointer: Phaser.Input.Pointer) {
      this.cursorGraphics.clear();
      
      // Draw Selection Outline (Blue) with Rotation support
      if (this.selectedObject) {
          this.cursorGraphics.lineStyle(2, 0x00ffff, 1);
          
          const obj = this.selectedObject;
          const cx = obj.x;
          const cy = obj.y;
          const w = obj.width;
          const h = obj.height;
          const rot = Phaser.Math.DegToRad(obj.rotation || 0);
          
          // Calculate corners
          const c = Math.cos(rot);
          const s = Math.sin(rot);
          
          const halfW = w / 2;
          const halfH = h / 2;
          
          const points = [
              { x: -halfW, y: -halfH },
              { x: halfW, y: -halfH },
              { x: halfW, y: halfH },
              { x: -halfW, y: halfH }
          ].map(p => ({
              x: cx + (p.x * c - p.y * s),
              y: cy + (p.x * s + p.y * c)
          }));
          
          this.cursorGraphics.strokePoints(points, true, true);
      }

      const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;

      // If dragging, we are done
      if (this.currentTool === 'select' && this.isDraggingObject) return;
      
      if (this.currentTool === 'place_object') {
           // Show Preview of Object placement
           let w = 32; let h = 32;
           // Adjust for type
           if (this.currentObjectType === 'MysteryBox') { w = 64; h = 32; }
           
           // Alignment Logic
           let x = Math.round(worldPoint.x / this.gridSize) * this.gridSize;
           let y = Math.round(worldPoint.y / this.gridSize) * this.gridSize;
           
           if (this.currentObjectType === 'MysteryBox') {
               // 0 offset X, 16 offset Y
               y += 16;
           } else if (this.currentObjectType === 'SpawnPoint') {
               // Standard center offset
                x += 16;
                y += 16;
                this.cursorGraphics.lineStyle(2, 0x00ffff, 0.8); // Cyan for SpawnPoint
                this.cursorGraphics.strokeRect(x - w/2, y - h/2, w, h);
                return;
           } else {
               x += 16;
               y += 16;
           }

           this.cursorGraphics.lineStyle(2, 0x00ff00, 0.8);
           this.cursorGraphics.strokeRect(x - w/2, y - h/2, w, h);
           return;
      }
      
      // Normal Tile Cursor
      const centerX = Math.floor(worldPoint.x / this.TILE_SIZE);
      const centerY = Math.floor(worldPoint.y / this.TILE_SIZE);
  
      const width = this.brushSettings.width;
      const height = this.brushSettings.height;
      const shape = this.brushSettings.shape;

      // Calculate Range (Centered)
      const startX = centerX - Math.floor((width - 1) / 2);
      const startY = centerY - Math.floor((height - 1) / 2);

      const pxX = startX * this.TILE_SIZE;
      const pxY = startY * this.TILE_SIZE;
      const pxW = width * this.TILE_SIZE;
      const pxH = height * this.TILE_SIZE;

      if (this.currentTool === 'erase') {
          this.cursorGraphics.lineStyle(2, 0xff0000, 0.8);
      } else {
          this.cursorGraphics.lineStyle(2, 0xaaaaaa, 0.8);
      }

      if (shape === 'square') {
          this.cursorGraphics.strokeRect(pxX, pxY, pxW, pxH);
      } else {
          this.cursorGraphics.strokeEllipse(pxX + pxW/2, pxY + pxH/2, pxW, pxH);
      }
  }

  // Correct placeObject logic for alignment and rotation
  private placeObject(pointer: Phaser.Input.Pointer) {
      const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      
      const type = this.currentObjectType;
      let width = 32;
      let height = 32;
      
      if (type === 'MysteryBox') {
          width = 64; 
          height = 32;
      }
      
      // Snap Logic
      let x = Math.round(worldPoint.x / this.gridSize) * this.gridSize;
      let y = Math.round(worldPoint.y / this.gridSize) * this.gridSize;

      if (type === 'MysteryBox') {
          // No offset for X (Center on grid line means splitting 2 tiles perfectly i.e. 32 -> 0..64)
          // Add 16 for Y (Center on tile center)
          y += 16;
      } else if (type === 'SpawnPoint') {
          // Validation: Cannot place on Wall
          // We check the center or corners. Let's check the center tile.
          const tileX = Math.floor(x / this.TILE_SIZE);
          const tileY = Math.floor(y / this.TILE_SIZE);
          
          if (this.tiles.has(`${tileX},${tileY}`)) {
              const tile = this.tiles.get(`${tileX},${tileY}`);
              if (tile && tile.texture.key === 'editor_wall') {
                  // It's a wall! Fail.
                  // Ideally show a toast/notification, but for now just return.
                  console.warn("Cannot place SpawnPoint on a Wall");
                  return;
              }
          }
          
          // Also check Grid edges if 32x32? 
          // Editor logic: Objects are placed at grid snaps. 
          // If we are placing a 32x32 object at x,y (center), it occupies exactly one tile if aligned.
          // x,y are snapped.
          
          x += 16;
          y += 16;
      } else {
          x += 16;
          y += 16;
      }

      // 1. Overlap Check (Replace existing)
      const existingIdsToDelete: string[] = [];
      for (const obj of this.editorObjects.values()) {
           if (Math.abs(obj.x - x) < 5 && Math.abs(obj.y - y) < 5) {
               existingIdsToDelete.push(obj.id);
           }
      }

      // Enforce Single Spawn Point
      if (type === 'SpawnPoint') {
          for (const obj of this.editorObjects.values()) {
              if (obj.type === 'SpawnPoint') {
                  existingIdsToDelete.push(obj.id);
              }
          }
      }

      existingIdsToDelete.forEach(id => {
          this.editorObjects.get(id)?.sprite.destroy();
          this.editorObjects.delete(id);
      });

      const id = Phaser.Utils.String.UUID();
      const properties: any = {};

      if (type === 'MysteryBox') {
          properties.cost = 950;
          properties.rotation = 0;
      } else if (type === 'PackAPunch') {
          properties.cost = 5000;
      } else if (type === 'Door') {
           properties.cost = 500;
           properties.zone = 0;
           // Tile Logic handled below
      } else if (type === 'Barricade') {
           // Tile Logic handled below
      } else if (type === 'PerkMachine') {
           properties.cost = 1000;
           properties.perk = 'JUGGERNOG';
      } else if (type === 'WallBuy') {
           properties.cost = 500;
           properties.weapon = 'PISTOL';
      }

      // Visuals
      const container = this.add.container(x, y);
      container.setDepth(10); // Ensure Objects are above tiles
      const gfx = this.add.graphics();
      
      if (type === 'TriggerZone') {
          gfx.lineStyle(2, 0xffff00, 1);
          gfx.fillStyle(0xffff00, 0.2); // Transparent Yellow
          // Default radius 32
          const radius = properties.radius || 32;
          gfx.strokeCircle(0, 0, radius);
          gfx.fillCircle(0, 0, radius);
          // Set body size for selection (approximate box)
          width = radius * 2;
          height = radius * 2;
      } else if (type === 'CustomObject') {
          const color = parseInt((properties.color || '#888888').replace('#', '0x'));
          gfx.lineStyle(2, 0xffffff, 1);
          gfx.fillStyle(color, 0.8);
          width = properties.width || 32;
          height = properties.height || 32;
          gfx.strokeRect(-width/2, -height/2, width, height);
          gfx.fillRect(-width/2, -height/2, width, height);
      } else if (type === 'Spawner') gfx.fillStyle(0xff0000, 0.7);
      else if (type === 'SpawnPoint') gfx.fillStyle(0x00ffff, 0.7); // Cyan
      else if (type === 'Barricade') gfx.fillStyle(0x8B4513, 0.7);
      else if (type === 'Door') gfx.fillStyle(0x888888, 0.7);
      else if (type === 'MysteryBox') gfx.fillStyle(0x0000ff, 0.7);
      else if (type === 'PerkMachine') gfx.fillStyle(0x00ff00, 0.7);
      else gfx.fillStyle(0xaaaaaa, 0.7);
      
      gfx.fillRect(-width/2, -height/2, width, height);
      
      // Face indicator for rotation
      gfx.fillStyle(0xffffff, 0.8);
      gfx.fillRect((width/2) - 4, -2, 4, 4); // Little notch on right

      const label = properties.name || type.substring(0, 4);
      const text = this.add.text(0, 0, label, { fontSize: '10px', color: '#ffffff' });
      text.setOrigin(0.5);
      
      container.add([gfx, text]);
      container.setSize(width, height);
      

      
      const obj: EditorObject = {
          id,
          type,
          x,
          y,
          rotation: 0,
          width,
          height,
          sprite: container,
          properties
      };

      this.editorObjects.set(id, obj);
      this.selectedObject = obj;
      
      // Tile Change for Door/Barricade
      let tileChanges: any[] = [];
      if (type === 'Door' || type === 'Barricade') {
          const change = this.setTile(Math.floor(x / this.TILE_SIZE), Math.floor(y / this.TILE_SIZE), 0); // 0 = Floor
          if (change) tileChanges.push(change);
      }
      
      // History
      this.history.push({
          type: 'PLACE_OBJECT',
          label: `Place ${type}`,
          timestamp: Date.now(),
          data: { ...obj, sprite: undefined, tileChanges }
      });
      
      this.markDirty();
      EventBus.emit('editor-object-selected', { ...obj, sprite: undefined, scripts: [] });
      
      // Auto-switch to Select Mode (unless CTRL is held)
      // pointer.event might be null if simulated, but usually valid for mouse/touch
      const event = pointer.event as MouseEvent;
      if (!event.ctrlKey && !event.metaKey) {
          this.currentTool = 'select';
          EventBus.emit('editor-tool-change', { tool: 'select', tileIndex: this.currentTileIndex });
      }
  }

  private handleAddScript(data: { id: string, script: any }) {
    const obj = this.editorObjects.get(data.id);
    if (!obj) return;
    
    if (!obj.scripts) obj.scripts = [];
    obj.scripts.push(data.script);
    this.markDirty();
    
    // Refresh selection to show new script
    if (this.selectedObject && this.selectedObject.id === data.id) {
         EventBus.emit('editor-object-selected', {
            id: obj.id,
            type: obj.type,
            x: obj.x,
            y: obj.y,
            properties: obj.properties,
            scripts: obj.scripts
        });
    }
  }
  
  private handleScriptUpdate(data: { id: string, index: number, script: any }) {
      const obj = this.editorObjects.get(data.id);
      if (!obj || !obj.scripts) return;
      
      obj.scripts[data.index] = data.script;
      this.markDirty();
      
      if (this.selectedObject && this.selectedObject.id === data.id) {
          EventBus.emit('editor-object-selected', { ...obj, sprite: undefined });
      }
  }

  private handleScriptDelete(data: { id: string, index: number }) {
      const obj = this.editorObjects.get(data.id);
      if (!obj || !obj.scripts) return;
      
      obj.scripts.splice(data.index, 1);
      this.markDirty();
      
      if (this.selectedObject && this.selectedObject.id === data.id) {
          EventBus.emit('editor-object-selected', { ...obj, sprite: undefined });
      }
  }
  
  private setTile(tileX: number, tileY: number, newIndex: number): { x: number, y: number, prev: number, new: number } | null {
      const key = `${tileX},${tileY}`;
      const prevIndex = this.getTileIndexAt(tileX, tileY);
      
      // If same, do nothing
      if (prevIndex === newIndex) return null;
      
      // Destroy existing if any
      if (this.tiles.has(key)) {
          this.tiles.get(key)!.destroy();
          this.tiles.delete(key);
      }
      
      // Create new (unless newIndex is 0/Floor and we treat Floor as empty visually? No, Floor has texture)
      // Wait, applyTileAction logic for Paint(0) -> Empty? No.
      // In applyTileAction:
      // Eraser (index?) -> newIndex = 0.
      // Else -> getTextureKey(index).
      // If we want Floor, index is 0. getTextureKey(0) -> 'editor_floor'.
      // So if newIndex=0, we paint 'editor_floor'.
      // If Erase, usually implicit. But here we want to force Floor.
      
      const texture = this.getTextureKey(newIndex);
      if (texture) {
           const tile = this.add.image(tileX * this.TILE_SIZE + 16, tileY * this.TILE_SIZE + 16, texture);
           tile.setDepth(0); 
           this.tiles.set(key, tile);
      }
      this.markDirty();
      
      return { x: tileX, y: tileY, prev: prevIndex, new: newIndex };
  }



  private handleObjectSelect(data: { type: string }) {
      this.currentObjectType = data.type;
      this.currentTool = 'place_object';
  }





  private handleToolChange(data: { tool: 'paint' | 'erase' | 'select' | 'place_object', tileIndex: number }) {
      this.currentTool = data.tool;
      this.currentTileIndex = data.tileIndex;
      // If switching away from select/place, deselect
      if (data.tool === 'paint' || data.tool === 'erase') {
          this.selectedObject = null;
          EventBus.emit('editor-object-deselected');
      }
  }
}
