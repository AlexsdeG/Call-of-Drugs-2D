import Phaser from 'phaser';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
    public body!: Phaser.Physics.Arcade.Body;
    private born: number = 0;
    private lifespan: number = 5000; 
    
    // CCD Reference
    private wallLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    private ray: Phaser.Geom.Line = new Phaser.Geom.Line();

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'bullet');
        // Ensure bullet renders above floor and obstacles
        this.setDepth(20);
    }

    fire(x: number, y: number, angle: number, speed: number, weaponStats: any, wallLayer: Phaser.Tilemaps.TilemapLayer | null) {
        // Reset and enable body logic
        if (this.body) {
            this.body.reset(x, y);
            (this.body as Phaser.Physics.Arcade.Body).enable = true;
        }
        
        this.wallLayer = wallLayer;
        
        this.setActive(true);
        this.setVisible(true);
        this.setDepth(20); 

        this.setRotation(angle);
        
        // Physics
        this.scene.physics.velocityFromRotation(angle, speed, this.body!.velocity);
        
        this.born = this.scene.time.now;
        
        // Store all necessary stats for damage calculation on impact
        this.setData('stats', weaponStats);
        this.setData('weaponKey', weaponStats.key || 'UNKNOWN'); // Ensure WeaponSystem passes key in attrs or handled separately
    }

    preUpdate(time: number, delta: number) {
        // Safety check: If scene is missing, object is likely destroyed
        if (!this.scene) return;

        // Continuous Collision Detection (CCD) for fast bullets vs Walls
        if (this.active && this.wallLayer) {
            // Predict movement this frame
            const vel = this.body.velocity;
            // delta is in ms, velocity in px/s. Dist = v * (delta/1000)
            const distX = vel.x * (delta / 1000);
            const distY = vel.y * (delta / 1000);

            // Set line from current to next position
            this.ray.setTo(this.x, this.y, this.x + distX, this.y + distY);

            // Check intersection with any tile in the wall layer along this line
            const tiles = this.wallLayer.getTilesWithinShape(this.ray);
            
            for (const tile of tiles) {
                // If it collides (index 1 is wall, or check .collides property)
                if (tile.canCollide || (tile.index !== -1 && tile.index !== 0)) {
                    this.x = tile.getCenterX();
                    this.y = tile.getCenterY();
                    this.disableBody(true, true);
                    
                    this.scene.events.emit('bullet-hit-wall', { x: this.x, y: this.y });
                    
                    return; // Stop processing
                }
            }
        }

        super.preUpdate(time, delta);

        if (time > this.born + this.lifespan) {
            this.disableBody(true, true); 
        }
    }
}