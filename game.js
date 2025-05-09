// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SPEED = 3;
const PLAYER_ROTATION_SPEED = 0.05;
const BULLET_SPEED = 7;
const BULLET_COOLDOWN = 500; // milliseconds
const ENEMY_SPEED = 1.5;
const ENEMY_ROTATION_SPEED = 0.03;
const ENEMY_FIRE_COOLDOWN = 2000; // milliseconds
const ENEMY_SPAWN_INTERVAL = 3000; // milliseconds
const TANK_SIZE = 40;
const BULLET_SIZE = 6;
const MAX_ENEMIES = 5;
const PARTICLE_COUNT = 30; // Number of particles in explosion
const BOMB_RECHARGE_TIME = 20000; // 20 seconds
const ENEMY_DAMAGE_MULTIPLIER = 0.4; // Enemy bullets do 40% of their normal damage
const PLAYER_DAMAGE_MULTIPLIER = 2.0; // Player bullets do 200% of their normal damage
const HEALTH_PICKUP_INTERVAL = 15000; // Health pickup every 15 seconds
const HEALTH_PICKUP_AMOUNT = 50; // Amount of health restored

// Device detection
let isMobile = false;
let isTablet = false;

// Mobile controls variables
let joystickActive = false;
let joystickPosition = { x: 0, y: 0 };
let joystickKnobPosition = { x: 0, y: 0 };
let joystickCenter = { x: 0, y: 0 };
let joystickMaxRadius = 40;
let joystickVector = { x: 0, y: 0 };

// Game Mode Variable
let gameMode = '2d'; // '2d' or '3d'

// Three.js Variables for 3D Mode
let scene, camera, renderer;
let terrain;
let tankModels = {}; // Store 3D models
let bulletModels = [];
let enemyModels = [];
let skybox;
let directionalLight, ambientLight;
let threeDContainer;

// Sound System
const SOUNDS = {
    fire: new Audio('./sounds/fire.mp3'),
    explosion: new Audio('./sounds/explosion.mp3')
};

let soundEnabled = true; // Track if sound is enabled

// Pre-load sounds and configure them
function initSounds() {
    // Set volume for each sound
    SOUNDS.fire.volume = 0.3;
    SOUNDS.explosion.volume = 0.4;
    
    // Allow sounds to overlap by creating a pool of audio objects
    SOUNDS.firePool = [];
    SOUNDS.explosionPool = [];
    
    // Create 5 copies of each sound for overlapping playback
    for (let i = 0; i < 5; i++) {
        SOUNDS.firePool.push(new Audio('./sounds/fire.mp3'));
        SOUNDS.firePool[i].volume = 0.3;
        
        SOUNDS.explosionPool.push(new Audio('./sounds/explosion.mp3'));
        SOUNDS.explosionPool[i].volume = 0.4;
    }
    
    // Initialize sound toggle
    document.getElementById('soundToggle').addEventListener('change', function() {
        soundEnabled = this.checked;
    });
}

// Function to play sounds
function playSound(soundName) {
    // Don't play sounds if game is over or sound is disabled
    if (gameOver || !soundEnabled) return;
    
    try {
        // Select sound pool based on name
        let soundPool;
        switch (soundName) {
            case 'fire':
                soundPool = SOUNDS.firePool;
                break;
            case 'explosion':
                soundPool = SOUNDS.explosionPool;
                break;
            default:
                console.error('Unknown sound:', soundName);
                return;
        }
        
        // Find an available sound from the pool
        for (let i = 0; i < soundPool.length; i++) {
            if (soundPool[i].paused || soundPool[i].ended) {
                soundPool[i].currentTime = 0;
                soundPool[i].play().catch(e => console.error('Error playing sound:', e));
                return;
            }
        }
        
        // If all sounds are playing, use the first one
        soundPool[0].currentTime = 0;
        soundPool[0].play().catch(e => console.error('Error playing sound:', e));
    } catch (e) {
        console.error('Sound play error:', e);
    }
}

// Tank Configs
const TANK_TYPES = {
    default: {
        speed: PLAYER_SPEED,
        health: 200,
        armor: 0.6, // Damage multiplier (lower is better)
        bodyColor: '#2980B9',
        turretColor: '#3498DB',
        trackColor: '#1F618D'
    },
    speeder: {
        speed: PLAYER_SPEED * 1.5,
        health: 150,
        armor: 0.7, // Takes 30% less damage
        bodyColor: '#E67E22',
        turretColor: '#D35400',
        trackColor: '#A04000'
    },
    heavy: {
        speed: PLAYER_SPEED * 0.7,
        health: 300,
        armor: 0.5, // Takes 50% less damage
        bodyColor: '#8E44AD',
        turretColor: '#9B59B6',
        trackColor: '#6C3483'
    }
};

// Enemy Tank Configs - much weaker than player tanks
const ENEMY_TANK_TYPES = {
    default: {
        speed: ENEMY_SPEED,
        health: 50, // Reduced from 200
        armor: 1.0, // Takes full damage (no armor protection)
        bodyColor: '#2980B9',
        turretColor: '#3498DB',
        trackColor: '#1F618D'
    },
    speeder: {
        speed: ENEMY_SPEED * 1.5,
        health: 40, // Reduced from 150
        armor: 1.2, // Takes 20% more damage
        bodyColor: '#E67E22',
        turretColor: '#D35400',
        trackColor: '#A04000'
    },
    heavy: {
        speed: ENEMY_SPEED * 0.7,
        health: 75, // Reduced from 300
        armor: 0.8, // Still has some armor
        bodyColor: '#8E44AD',
        turretColor: '#9B59B6',
        trackColor: '#6C3483'
    }
};

// Weapon Configs
const WEAPON_TYPES = {
    standard: {
        damage: 25,
        cooldown: BULLET_COOLDOWN,
        bulletSpeed: BULLET_SPEED,
        bulletSize: BULLET_SIZE,
        bulletColor: '#3498DB'
    },
    rapid: {
        damage: 15,
        cooldown: BULLET_COOLDOWN * 0.4, // Faster firing
        bulletSpeed: BULLET_SPEED * 1.2,
        bulletSize: BULLET_SIZE * 0.8,
        bulletColor: '#E74C3C'
    },
    cannon: {
        damage: 50,
        cooldown: BULLET_COOLDOWN * 2, // Slower firing
        bulletSpeed: BULLET_SPEED * 0.8,
        bulletSize: BULLET_SIZE * 1.5,
        bulletColor: '#2ECC71'
    }
};

// Bomb Configs
const BOMB_TYPES = {
    cluster: {
        damage: 30,
        range: 100,
        color: '#F39C12',
        effect: 'cluster', // Splits into multiple explosions
        iconClass: 'bomb-cluster'
    },
    emp: {
        damage: 10,
        range: 150,
        color: '#3498DB',
        effect: 'freeze', // Freezes enemies
        iconClass: 'bomb-emp'
    },
    nuke: {
        damage: 75,
        range: 200,
        color: '#E74C3C',
        effect: 'nuke', // Massive damage in large area
        iconClass: 'bomb-nuke'
    }
};

// Game Variables
let canvas;
let ctx;
let player;
let bullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];
let pickups = []; // Array to store health pickups
let score = 0;
let gameOver = false;
let lastEnemySpawnTime = 0;
let lastHealthPickupTime = 0; // Track when the last health pickup was spawned
let spawnInterval;
let healthPickupInterval; // Interval for spawning health pickups
let gameLoopId;
let specialBombReady = true;
let lastBombTime = 0;
let bombRechargeInterval;

// Player Selections
let selectedTankType = 'default';
let selectedWeaponType = 'standard';
let selectedBombType = 'cluster';

// Input handling
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false,
    ' ': false, // Spacebar
    b: false, // Special Bomb
    r: false
};

// Game objects
class Tank {
    constructor(x, y, color, isPlayer = false, tankType = 'default') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.rotation = isPlayer ? -Math.PI / 2 : Math.PI / 2; // Player faces up, enemies face down
        this.width = TANK_SIZE;
        this.height = TANK_SIZE;
        
        this.isPlayer = isPlayer;
        this.tankType = tankType;
        
        // Use appropriate tank config based on whether it's a player or enemy
        const typeConfig = isPlayer ? 
            TANK_TYPES[this.tankType] : 
            ENEMY_TANK_TYPES[this.tankType];
        
        this.health = typeConfig.health;
        this.maxHealth = typeConfig.health;
        this.armor = typeConfig.armor;
        this.speed = isPlayer ? typeConfig.speed : typeConfig.speed;
        this.rotationSpeed = isPlayer ? PLAYER_ROTATION_SPEED : ENEMY_ROTATION_SPEED;
        
        this.bodyColor = typeConfig.bodyColor;
        this.turretColor = typeConfig.turretColor;
        this.trackColor = typeConfig.trackColor;
        
        this.trackOffset = 0; // For track animation
        this.trackSpeed = 0.4; // Speed of track animation
        this.destroyed = false;
        this.lastFireTime = 0;
        
        // For the EMP bomb effect
        this.frozen = false;
        this.frozenTime = 0;
        
        // Weapon setup for player
        if (isPlayer) {
            this.weapon = selectedWeaponType;
        } else {
            // Enemies use random weapons
            const weaponTypes = Object.keys(WEAPON_TYPES);
            this.weapon = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
        }
        
        // Create 3D model for the tank if in 3D mode
        if (gameMode === '3d') {
            this.model3D = create3DTankModel(tankType, !isPlayer);
            this.model3D.position.x = x / 10 - CANVAS_WIDTH / 20;
            this.model3D.position.z = y / 10 - CANVAS_HEIGHT / 20;
            this.model3D.position.y = 0;
            
            if (isPlayer) {
                tankModels.player = this.model3D;
            } else {
                enemyModels.push(this.model3D);
            }
            
            if (scene) {
                scene.add(this.model3D);
            }
        }
    }

    update(deltaTime) {
        if (this.health <= 0) return;
        
        // Handle frozen state (for EMP effect)
        if (this.frozen) {
            if (Date.now() - this.frozenTime > 3000) { // 3 seconds frozen
                this.frozen = false;
            } else {
                return; // Skip update if frozen
            }
        }

        // Only move the player based on keyboard input
        if (this.isPlayer) {
            this.handlePlayerMovement();
            
            // Handle special bomb
            if (keys.b && specialBombReady) {
                this.useSpecialBomb();
            }
        } else {
            this.handleEnemyAI();
        }

        // Keep tank within canvas bounds
        this.x = Math.max(this.width / 2, Math.min(CANVAS_WIDTH - this.width / 2, this.x));
        this.y = Math.max(this.height / 2, Math.min(CANVAS_HEIGHT - this.height / 2, this.y));
    }

    handlePlayerMovement() {
        // Forward/Backward movement
        let isMoving = false;
        
        if (isMobile || isTablet) {
            // Mobile joystick control
            if (joystickActive) {
                // Move based on joystick vector
                const moveAngle = Math.atan2(joystickVector.y, joystickVector.x);
                
                // Set rotation to follow joystick direction
                // Smooth rotation to avoid jerky movement
                const targetRotation = moveAngle;
                const rotationDiff = normalizeAngle(targetRotation - this.rotation);
                
                // Rotate tank toward joystick direction
                if (Math.abs(rotationDiff) > 0.05) {
                    if (rotationDiff > 0) {
                        this.rotation += Math.min(this.rotationSpeed * 1.5, rotationDiff);
                    } else {
                        this.rotation += Math.max(-this.rotationSpeed * 1.5, rotationDiff);
                    }
                }
                
                // Move forward based on joystick distance from center
                const joystickDistance = Math.sqrt(joystickVector.x * joystickVector.x + joystickVector.y * joystickVector.y);
                if (joystickDistance > 0.1) {
                    this.x += Math.cos(this.rotation) * this.speed * joystickDistance;
                    this.y += Math.sin(this.rotation) * this.speed * joystickDistance;
                    isMoving = true;
                }
            }
        } else {
            // Desktop keyboard controls
            if (keys.ArrowUp || keys.w) {
                this.x += Math.cos(this.rotation) * this.speed;
                this.y += Math.sin(this.rotation) * this.speed;
                isMoving = true;
            }
            if (keys.ArrowDown || keys.s) {
                this.x -= Math.cos(this.rotation) * this.speed;
                this.y -= Math.sin(this.rotation) * this.speed;
                isMoving = true;
            }

            // Rotation
            if (keys.ArrowLeft || keys.a) {
                this.rotation -= this.rotationSpeed;
            }
            if (keys.ArrowRight || keys.d) {
                this.rotation += this.rotationSpeed;
            }
        }

        // Update track animation if moving
        if (isMoving) {
            this.trackOffset += this.trackSpeed;
            if (this.trackOffset > 10) this.trackOffset = 0;
        }

        // Firing
        const weaponConfig = WEAPON_TYPES[this.weapon];
        if (keys[' '] && Date.now() - this.lastFireTime > weaponConfig.cooldown) {
            this.fire();
        }
    }

    handleEnemyAI() {
        // Simple AI for enemy tanks
        if (player.health <= 0) return; // Don't chase if player is dead

        // Calculate angle to player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const angleToPlayer = Math.atan2(dy, dx);

        // Rotate towards player
        let rotationDiff = angleToPlayer - this.rotation;
        
        // Normalize the rotation difference
        while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
        while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
        
        // Apply rotation towards player
        if (rotationDiff > 0) {
            this.rotation += Math.min(this.rotationSpeed, rotationDiff);
        } else {
            this.rotation -= Math.min(this.rotationSpeed, -rotationDiff);
        }

        // Move towards player if far away, otherwise keep distance
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
        let isMoving = false;
        
        if (distanceToPlayer > 200) {
            // Move towards player
            this.x += Math.cos(this.rotation) * this.speed;
            this.y += Math.sin(this.rotation) * this.speed;
            isMoving = true;
        } else if (distanceToPlayer < 150) {
            // Move away from player
            this.x -= Math.cos(this.rotation) * this.speed/2;
            this.y -= Math.sin(this.rotation) * this.speed/2;
            isMoving = true;
        }
        
        // Update track animation if moving
        if (isMoving) {
            this.trackOffset += this.trackSpeed;
            if (this.trackOffset > 10) this.trackOffset = 0;
        }

        // OPTIMIZATION: Reduce firing frequency and add distance check
        const weaponConfig = WEAPON_TYPES[this.weapon];
        const angleDifference = Math.abs(normalizeAngle(angleToPlayer - this.rotation));
        // Only fire if well-aimed, not too often, and within a reasonable distance
        if (angleDifference < 0.2 && 
            Date.now() - this.lastFireTime > weaponConfig.cooldown * 1.5 && // Increased cooldown by 50%
            distanceToPlayer < 300 && // Don't fire if too far away
            enemyBullets.length < MAX_ENEMIES * 2 && // Limit total enemy bullets
            Math.random() > 0.3) { // Add randomness to firing (70% chance to fire when conditions met)
            this.fire();
        }
    }

    fire() {
        const bulletX = this.x + Math.cos(this.rotation) * (this.width / 2 + 5);
        const bulletY = this.y + Math.sin(this.rotation) * (this.height / 2 + 5);
        
        const weaponConfig = WEAPON_TYPES[this.weapon];
        
        const bullet = new Bullet(
            bulletX,
            bulletY,
            this.rotation,
            this.isPlayer,
            weaponConfig
        );
        
        if (this.isPlayer) {
            bullets.push(bullet);
        } else {
            enemyBullets.push(bullet);
        }
        
        this.lastFireTime = Date.now();
        
        // Create muzzle flash effect
        createMuzzleFlash(bulletX, bulletY, this.rotation, weaponConfig.bulletColor);
        
        // Play sound effect
        playSound('fire');
    }
    
    useSpecialBomb() {
        const bombConfig = BOMB_TYPES[selectedBombType];
        
        // Deploy the bomb at player's location
        createBombExplosion(this.x, this.y, bombConfig);
        
        // Play explosion sound
        playSound('explosion');
        
        // Reset bomb availability
        specialBombReady = false;
        lastBombTime = Date.now();
        
        // Update bomb UI
        updateBombUI();
        
        // Start recharge timer
        startBombRecharge();
    }

    draw() {
        // Only draw in 2D mode
        if (gameMode === '3d') return;
        
        if (this.health <= 0) return;
        
        ctx.save();
        
        // Apply frozen effect if active
        if (this.frozen) {
            ctx.globalAlpha = 0.7;
            ctx.shadowColor = '#3498DB';
            ctx.shadowBlur = 15;
        }
        
        // Translate and rotate context to position of tank
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Draw the tracks
        this.drawTracks();
        
        // Draw tank body
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 5);
        ctx.fill();
        
        // Draw tank details
        ctx.fillStyle = this.isPlayer ? '#1F618D' : '#693D8D';
        ctx.fillRect(-this.width / 2 + 5, -this.height / 2 + 5, this.width - 10, this.height - 10);
        
        // Draw tank turret base
        ctx.fillStyle = this.turretColor;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw tank barrel
        ctx.fillStyle = this.turretColor;
        ctx.fillRect(0, -this.width / 12, this.width / 2 + 5, this.width / 6);
        
        // Add barrel detail
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(0, -this.width / 12, this.width / 2 + 5, this.width / 6);
        ctx.stroke();
        
        // Tank identifier (player vs enemy)
        if (this.isPlayer) {
            ctx.fillStyle = '#2ECC71';
        } else {
            ctx.fillStyle = '#E74C3C';
        }
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Health bar
        this.drawHealthBar();
    }
    
    drawTracks() {
        // Left track
        ctx.fillStyle = this.trackColor;
        ctx.fillRect(-this.width / 2 - 5, -this.height / 2, 10, this.height);
        
        // Right track
        ctx.fillStyle = this.trackColor;
        ctx.fillRect(this.width / 2 - 5, -this.height / 2, 10, this.height);
        
        // Track details (treads)
        ctx.fillStyle = '#000';
        for (let i = 0; i < 6; i++) {
            const y = -this.height / 2 + i * (this.height / 5) + this.trackOffset;
            
            // Left track treads
            ctx.fillRect(-this.width / 2 - 5, y, 10, 3);
            
            // Right track treads
            ctx.fillRect(this.width / 2 - 5, y, 10, 3);
        }
    }
    
    drawHealthBar() {
        const healthBarWidth = 40;
        const healthBarHeight = 5;
        const healthPercentage = this.health / this.maxHealth;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.height / 2 - 15, healthBarWidth, healthBarHeight);
        
        // Health color based on percentage
        ctx.fillStyle = healthPercentage > 0.5 ? '#2ECC71' : healthPercentage > 0.25 ? '#F39C12' : '#E74C3C';
        ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.height / 2 - 15, healthBarWidth * healthPercentage, healthBarHeight);
        
        // Add border to health bar
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - healthBarWidth / 2, this.y - this.height / 2 - 15, healthBarWidth, healthBarHeight);
    }

    takeDamage(amount) {
        // Apply armor modifier to damage
        const actualDamage = amount * this.armor;
        
        this.health -= actualDamage;
        if (this.health <= 0) {
            this.health = 0;
            this.destroyed = true;
            
            // Create explosion effect
            createExplosion(this.x, this.y);
            
            // Play explosion sound
            playSound('explosion');
            
            if (!this.isPlayer) {
                // Enemy destroyed
                score += 100;
                updateScore();
                // Remove enemy from array
                const index = enemies.indexOf(this);
                if (index !== -1) {
                    enemies.splice(index, 1);
                }
            } else {
                // Player destroyed - game over
                endGame();
            }
        }
    }
    
    freeze() {
        this.frozen = true;
        this.frozenTime = Date.now();
        
        // Create freeze effect
        createFreezeEffect(this.x, this.y);
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        // Show healing effect
        createHealingEffect(this.x, this.y);
    }
}

class Bullet {
    constructor(x, y, angle, isPlayerBullet, weaponConfig) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = weaponConfig.bulletSpeed;
        this.width = weaponConfig.bulletSize;
        this.height = weaponConfig.bulletSize;
        this.damage = weaponConfig.damage;
        this.color = weaponConfig.bulletColor;
        this.isPlayerBullet = isPlayerBullet;
        this.trail = [];
        this.trailMaxLength = 5; // Maximum number of trail segments
        
        // Create 3D model for the bullet if in 3D mode
        if (gameMode === '3d') {
            this.model3D = create3DBullet(weaponConfig.type || 'standard');
            this.model3D.position.x = x / 10 - CANVAS_WIDTH / 20;
            this.model3D.position.z = y / 10 - CANVAS_HEIGHT / 20;
            this.model3D.position.y = 2; // Position at turret height
            
            bulletModels.push(this.model3D);
            
            if (scene) {
                scene.add(this.model3D);
            }
        }
    }

    update() {
        // Add current position to trail
        if (this.trail.length < this.trailMaxLength) {
            this.trail.push({x: this.x, y: this.y});
        } else {
            // Shift array only when needed, using direct index assignment for better performance
            for (let i = 0; i < this.trailMaxLength - 1; i++) {
                this.trail[i] = this.trail[i + 1];
            }
            this.trail[this.trailMaxLength - 1] = {x: this.x, y: this.y};
        }
        
        // Update position
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        
        // Check if bullet is out of bounds
        if (this.x < 0 || this.x > CANVAS_WIDTH || this.y < 0 || this.y > CANVAS_HEIGHT) {
            return false; // Bullet should be removed
        }
        
        // Update 3D model position
        if (gameMode === '3d' && this.model3D) {
            this.model3D.position.x = this.x / 10 - CANVAS_WIDTH / 20;
            this.model3D.position.z = this.y / 10 - CANVAS_HEIGHT / 20;
        }
        
        return true; // Bullet is still valid
    }

    draw() {
        // Only draw in 2D mode
        if (gameMode === '3d') return;
        
        // Draw bullet trail (simplified for performance)
        const trailLength = this.trail.length;
        if (trailLength > 0) {
            for (let i = 0; i < trailLength; i += 2) { // Skip every other point for performance
                const alpha = i / trailLength;
                const size = this.width * (0.5 + 0.5 * alpha);
                
                ctx.fillStyle = this.isPlayerBullet 
                    ? `rgba(${hexToRgb(this.color)}, ${alpha})` 
                    : `rgba(${hexToRgb(this.color)}, ${alpha})`;
                
                ctx.beginPath();
                ctx.arc(this.trail[i].x, this.trail[i].y, size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw main bullet (simplified gradient for performance)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Add simplified glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 5; // Reduced blur for performance
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    checkCollision(tank) {
        // Don't hit your own tanks
        if (this.isPlayerBullet === tank.isPlayer) return false;
        
        // Quick bounding box check first (faster than circle calculation)
        const halfTankWidth = tank.width / 2;
        const halfTankHeight = tank.height / 2;
        const bulletRadius = this.width / 2;
        
        if (this.x + bulletRadius < tank.x - halfTankWidth || 
            this.x - bulletRadius > tank.x + halfTankWidth ||
            this.y + bulletRadius < tank.y - halfTankHeight || 
            this.y - bulletRadius > tank.y + halfTankHeight) {
            return false;
        }
        
        // More accurate circle-rectangle collision only if bounding box check passes
        const distX = Math.abs(this.x - tank.x);
        const distY = Math.abs(this.y - tank.y);
        
        if (distX > (halfTankWidth + bulletRadius) || 
            distY > (halfTankHeight + bulletRadius)) {
            return false;
        }
        
        if (distX <= halfTankWidth || distY <= halfTankHeight) {
            return true;
        }
        
        const dx = distX - halfTankWidth;
        const dy = distY - halfTankHeight;
        return (dx * dx + dy * dy <= bulletRadius * bulletRadius);
    }
}

class Particle {
    constructor(x, y, color, size, speedX, speedY, life = 30) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.initialSize = size;
        this.speedX = speedX;
        this.speedY = speedY;
        this.life = life;
        this.initialLife = life;
        this.alpha = 1;
    }
    
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;
        this.alpha = this.life / this.initialLife;
        this.size = this.initialSize * this.alpha;
        return this.life > 0;
    }
    
    draw() {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Bomb and Special Effects Functions
function createBombExplosion(x, y, bombConfig) {
    // Play explosion sound
    playSound('explosion');
    
    // Create visual explosion effect based on bomb type
    switch(bombConfig.effect) {
        case 'cluster':
            // Main explosion
            createExplosion(x, y, 2, bombConfig.color);
            
            // Smaller cluster explosions
            for (let i = 0; i < 5; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = 30 + Math.random() * 70;
                const clusterX = x + Math.cos(angle) * distance;
                const clusterY = y + Math.sin(angle) * distance;
                
                // Delay the cluster explosions
                setTimeout(() => {
                    createExplosion(clusterX, clusterY, 1, bombConfig.color);
                    
                    // Play delayed explosion sound
                    playSound('explosion');
                    
                    // Apply damage to enemies in cluster radius
                    applyBombDamage(clusterX, clusterY, bombConfig.range / 2, bombConfig.damage / 2);
                }, 300 + Math.random() * 500);
            }
            
            // Apply damage to enemies in bomb radius
            applyBombDamage(x, y, bombConfig.range, bombConfig.damage);
            break;
            
        case 'freeze':
            // EMP effect
            createEMPEffect(x, y, bombConfig.range);
            
            // Apply freeze to enemies in range
            for (const enemy of enemies) {
                const dx = enemy.x - x;
                const dy = enemy.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= bombConfig.range) {
                    enemy.freeze();
                    
                    // Apply slight damage
                    enemy.takeDamage(bombConfig.damage);
                }
            }
            break;
            
        case 'nuke':
            // Massive explosion
            createExplosion(x, y, 3, bombConfig.color);
            
            // Create shockwave effect
            createShockwave(x, y, bombConfig.range);
            
            // Apply damage to all enemies in bomb radius with distance falloff
            for (const enemy of enemies) {
                const dx = enemy.x - x;
                const dy = enemy.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= bombConfig.range) {
                    // Damage falls off with distance
                    const falloff = 1 - (distance / bombConfig.range);
                    const damage = bombConfig.damage * falloff;
                    enemy.takeDamage(damage);
                }
            }
            break;
    }
}

function applyBombDamage(x, y, range, damage) {
    for (const enemy of enemies) {
        const dx = enemy.x - x;
        const dy = enemy.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= range) {
            enemy.takeDamage(damage);
        }
    }
}

function createEMPEffect(x, y, range) {
    // Create EMP ring effect
    const particleCount = 60;
    const color = '#3498DB';
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const px = x + Math.cos(angle) * range;
        const py = y + Math.sin(angle) * range;
        
        // Particles move outward from center
        const speedX = Math.cos(angle) * 2;
        const speedY = Math.sin(angle) * 2;
        
        particles.push(new Particle(x, y, color, 5, speedX, speedY, 30));
    }
    
    // Add inner particles
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * range * 0.8;
        const px = x + Math.cos(angle) * distance;
        const py = y + Math.sin(angle) * distance;
        
        particles.push(new Particle(px, py, '#FFFFFF', 3 + Math.random() * 3, 0, 0, 20));
    }
}

function createFreezeEffect(x, y) {
    // Create ice crystal particles around the frozen tank
    const color = '#A9CCE3';
    
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 5 + Math.random() * 20;
        const px = x + Math.cos(angle) * distance;
        const py = y + Math.sin(angle) * distance;
        
        particles.push(new Particle(px, py, color, 2 + Math.random() * 3, 0, 0, 60));
    }
}

function createShockwave(x, y, radius) {
    // Create expanding ring effect
    const rings = 3;
    
    for (let r = 0; r < rings; r++) {
        const delay = r * 200; // Stagger the rings
        
        setTimeout(() => {
            const particleCount = 40;
            const startRadius = r * (radius / rings);
            
            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2;
                const px = x + Math.cos(angle) * startRadius;
                const py = y + Math.sin(angle) * startRadius;
                
                // Particles move outward
                const speedX = Math.cos(angle) * 3;
                const speedY = Math.sin(angle) * 3;
                
                particles.push(new Particle(px, py, '#E74C3C', 4, speedX, speedY, 30));
            }
        }, delay);
    }
}

// Effects functions
function createExplosion(x, y, scale = 1, color = null) {
    const colors = color ? [color, lightenColor(color, 20), '#FFFFFF'] : ['#E74C3C', '#F39C12', '#F1C40F', '#FFFFFF'];
    
    // Reduce particle count when there are already many particles
    const currentParticleCount = particles.length;
    let particleCount = PARTICLE_COUNT * scale;
    
    // Scale down particle count if there are already many particles
    if (currentParticleCount > 50) {
        particleCount = Math.floor(particleCount / 2);
    }
    if (currentParticleCount > 100) {
        particleCount = Math.floor(particleCount / 2);
    }
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (0.5 + Math.random() * 3) * scale;
        const speedX = Math.cos(angle) * speed;
        const speedY = Math.sin(angle) * speed;
        const size = (3 + Math.random() * 5) * scale;
        const life = (20 + Math.random() * 40) * scale;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        particles.push(new Particle(x, y, color, size, speedX, speedY, life));
    }
}

function createMuzzleFlash(x, y, angle, color = '#F1C40F') {
    const colors = ['#FFFFFF', color, lightenColor(color, 30)];
    
    for (let i = 0; i < 10; i++) {
        const flashAngle = angle + (Math.random() - 0.5) * 0.5; // Small cone
        const speed = 1 + Math.random() * 3;
        const speedX = Math.cos(flashAngle) * speed;
        const speedY = Math.sin(flashAngle) * speed;
        const size = 1 + Math.random() * 3;
        const life = 5 + Math.random() * 10;
        const particleColor = colors[Math.floor(Math.random() * colors.length)];
        
        particles.push(new Particle(x, y, particleColor, size, speedX, speedY, life));
    }
}

function createTeleportEffect(x, y) {
    const colors = ['#3498DB', '#2ECC71', '#9B59B6', '#FFFFFF'];
    
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 40;
        const px = x + Math.cos(angle) * distance;
        const py = y + Math.sin(angle) * distance;
        const speed = 0.3 + Math.random() * 0.5;
        const speedX = (x - px) * speed / distance;
        const speedY = (y - py) * speed / distance;
        const size = 2 + Math.random() * 4;
        const life = 15 + Math.random() * 20;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        particles.push(new Particle(px, py, color, size, speedX, speedY, life));
    }
}

// Special Bomb UI Functions
function updateBombUI() {
    const bombIcon = document.querySelector('.bomb-icon');
    const bombCount = document.querySelector('.bomb-count');
    
    // Set the correct bomb icon based on selection
    bombIcon.style.backgroundImage = getBombIconUrl(selectedBombType);
    
    // Update the bomb count and style
    if (specialBombReady) {
        bombCount.textContent = '1';
        document.getElementById('specialBomb').classList.add('bomb-ready');
    } else {
        bombCount.textContent = '0';
        document.getElementById('specialBomb').classList.remove('bomb-ready');
    }
}

function getBombIconUrl(bombType) {
    const bombConfig = BOMB_TYPES[bombType];
    return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="${bombConfig.color.replace('#', '%23')}"/></svg>')`;
}

function startBombRecharge() {
    // Clear any existing interval
    if (bombRechargeInterval) {
        clearInterval(bombRechargeInterval);
    }
    
    // Start recharge timer
    bombRechargeInterval = setTimeout(() => {
        specialBombReady = true;
        updateBombUI();
    }, BOMB_RECHARGE_TIME);
}

// Helper Functions
function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
}

function updateScore() {
    document.getElementById('score').textContent = score;
}

function spawnEnemy() {
    if (enemies.length >= MAX_ENEMIES || gameOver) return;
    
    let x, y;
    // 50% chance to spawn from top, 25% from left, 25% from right
    const spawnPosition = Math.random();
    
    if (spawnPosition < 0.5) {
        // Spawn from top
        x = Math.random() * (CANVAS_WIDTH - 100) + 50;
        y = 50;
    } else if (spawnPosition < 0.75) {
        // Spawn from left
        x = 50;
        y = Math.random() * (CANVAS_HEIGHT - 100) + 50;
    } else {
        // Spawn from right
        x = CANVAS_WIDTH - 50;
        y = Math.random() * (CANVAS_HEIGHT - 100) + 50;
    }
    
    // Random enemy tank type
    const tankTypes = Object.keys(ENEMY_TANK_TYPES);
    const enemyTankType = tankTypes[Math.floor(Math.random() * tankTypes.length)];
    
    // Random colors for enemy tanks
    const colors = ['#8E44AD', '#D35400', '#C0392B', '#16A085'];
    const randColor = colors[Math.floor(Math.random() * colors.length)];
    
    const enemy = new Tank(x, y, randColor, false, enemyTankType);
    enemies.push(enemy);
    
    // Create spawn effect
    createTeleportEffect(x, y);
}

// Color manipulation helpers
function lightenColor(color, percent) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    const lightenValue = Math.round(2.55 * percent);
    
    const newR = Math.min(255, r + lightenValue);
    const newG = Math.min(255, g + lightenValue);
    const newB = Math.min(255, b + lightenValue);
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function darkenColor(color, percent) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    const darkenValue = Math.round(2.55 * percent);
    
    const newR = Math.max(0, r - darkenValue);
    const newG = Math.max(0, g - darkenValue);
    const newB = Math.max(0, b - darkenValue);
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
}

function endGame() {
    gameOver = true;
    clearInterval(spawnInterval);
    clearInterval(healthPickupInterval); // Clear health pickup interval
    cancelAnimationFrame(gameLoopId);
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').style.display = 'block';
    
    // Clear bomb recharge timer
    if (bombRechargeInterval) {
        clearTimeout(bombRechargeInterval);
    }
}

function resetGame() {
    // Reset game state
    gameOver = false;
    score = 0;
    bullets = [];
    enemyBullets = [];
    enemies = [];
    particles = [];
    pickups = []; // Clear pickups
    
    // Reset bomb state
    specialBombReady = true;
    lastBombTime = 0;
    if (bombRechargeInterval) {
        clearTimeout(bombRechargeInterval);
    }
    
    // Reset health pickup timer
    lastHealthPickupTime = Date.now();
    if (healthPickupInterval) {
        clearInterval(healthPickupInterval);
    }
    
    // Reset player
    player = new Tank(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 100, TANK_TYPES[selectedTankType].bodyColor, true, selectedTankType);
    
    // Update UI
    updateScore();
    document.getElementById('playerHealth').textContent = player.health;
    document.getElementById('gameOver').style.display = 'none';
    updateBombUI();
    
    // Restart enemy spawning
    lastEnemySpawnTime = Date.now();
    clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnEnemy, ENEMY_SPAWN_INTERVAL);
    
    // Start health pickup spawning
    healthPickupInterval = setInterval(spawnHealthPickup, HEALTH_PICKUP_INTERVAL);
    
    // Create spawn effect for player
    createTeleportEffect(player.x, player.y);
    
    // Restart game loop
    gameLoop();
    
    // Clean up 3D resources if in 3D mode
    if (gameMode === '3d') {
        // Remove all bullet models
        bulletModels.forEach(model => {
            if (model) {
                scene.remove(model);
                model.traverse(object => {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) object.material.dispose();
                });
            }
        });
        bulletModels = [];
        
        // Remove all enemy models
        enemyModels.forEach(model => {
            if (model) {
                scene.remove(model);
                model.traverse(object => {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) object.material.dispose();
                });
            }
        });
        enemyModels = [];
        
        // Remove player model
        if (tankModels.player) {
            scene.remove(tankModels.player);
            tankModels.player.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) object.material.dispose();
            });
        }
        
        // Setup 3D environment again
        setup3DEnvironment();
    }
}

// Show the game container and hide options menu
function startGame() {
    // Get selected options from UI
    const selectedTankElement = document.querySelector('[data-tank].selected');
    const selectedWeaponElement = document.querySelector('[data-weapon].selected');
    const selectedBombElement = document.querySelector('[data-bomb].selected');
    const selectedModeElement = document.querySelector('[data-mode].selected');
    
    // Set global variables based on selections
    if (selectedTankElement) selectedTankType = selectedTankElement.getAttribute('data-tank');
    if (selectedWeaponElement) selectedWeaponType = selectedWeaponElement.getAttribute('data-weapon');
    if (selectedBombElement) selectedBombType = selectedBombElement.getAttribute('data-bomb');
    if (selectedModeElement) gameMode = selectedModeElement.getAttribute('data-mode');
    
    document.getElementById('optionsMenu').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
    
    // Initialize bomb UI
    updateBombUI();
    
    // Setup 3D environment if 3D mode is selected
    if (gameMode === '3d') {
        document.getElementById('threeDContainer').style.display = 'block';
        document.getElementById('gameCanvas').style.display = 'none';
        setup3DEnvironment();
    } else {
        document.getElementById('threeDContainer').style.display = 'none';
        document.getElementById('gameCanvas').style.display = 'block';
    }
    
    // Start the game
    resetGame();
}

// Show the options menu and hide game container
function showOptions() {
    document.getElementById('optionsMenu').style.display = 'block';
    document.getElementById('gameContainer').style.display = 'none';
    
    // Stop the game loop
    cancelAnimationFrame(gameLoopId);
    if (spawnInterval) {
        clearInterval(spawnInterval);
    }
    if (bombRechargeInterval) {
        clearTimeout(bombRechargeInterval);
    }
}

// Game loop and initialization
function gameLoop() {
    if (gameOver) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw grid for reference (for a video game look)
    drawGrid();
    
    // Update and draw player
    player.update();
    player.draw();
    
    // Update player health in UI
    document.getElementById('playerHealth').textContent = Math.round(player.health);
    
    // Process a limited number of particles per frame
    let maxParticleUpdates = 30;
    
    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
        if (maxParticleUpdates <= 0) break;
        maxParticleUpdates--;
        
        if (!particles[i].update()) {
            particles.splice(i, 1);
            continue;
        }
        particles[i].draw();
    }
    
    // Update and draw health pickups
    for (let i = pickups.length - 1; i >= 0; i--) {
        if (!pickups[i].update()) {
            pickups.splice(i, 1);
            continue;
        }
        pickups[i].draw();
    }
    
    // Process a limited number of bullets per frame
    let maxBulletUpdates = 20;
    
    // Update and draw player bullets
    for (let i = bullets.length - 1; i >= 0 && maxBulletUpdates > 0; i--) {
        maxBulletUpdates--;
        
        const bullet = bullets[i];
        if (!bullet.update()) {
            bullets.splice(i, 1);
            continue;
        }
        
        bullet.draw();
        
        // Skip collision detection if there are too many enemies
        if (enemies.length > 8) {
            // Only check every other enemy
            for (let j = 0; j < enemies.length; j += 2) {
                const enemy = enemies[j];
                if (bullet.checkCollision(enemy)) {
                    // Apply player damage multiplier to make enemies die faster
                    enemy.takeDamage(bullet.damage * PLAYER_DAMAGE_MULTIPLIER);
                    
                    // Create hit effect
                    createExplosion(bullet.x, bullet.y);
                    
                    // Play hit sound (explosion sound at lower volume)
                    playSound('explosion');
                    
                    bullets.splice(i, 1);
                    break;
                }
            }
        } else {
            // Check collision against all enemies when there are fewer
            for (const enemy of enemies) {
                if (bullet.checkCollision(enemy)) {
                    // Apply player damage multiplier to make enemies die faster
                    enemy.takeDamage(bullet.damage * PLAYER_DAMAGE_MULTIPLIER);
                    
                    // Create hit effect
                    createExplosion(bullet.x, bullet.y);
                    
                    // Play hit sound (explosion sound at lower volume)
                    playSound('explosion');
                    
                    bullets.splice(i, 1);
                    break;
                }
            }
        }
    }
    
    // Update and draw enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0 && maxBulletUpdates > 0; i--) {
        maxBulletUpdates--;
        
        const bullet = enemyBullets[i];
        if (!bullet.update()) {
            enemyBullets.splice(i, 1);
            continue;
        }
        
        bullet.draw();
        
        // Check for collision with player
        if (bullet.checkCollision(player)) {
            // Apply damage multiplier to enemy bullets
            const reducedDamage = bullet.damage * ENEMY_DAMAGE_MULTIPLIER;
            player.takeDamage(reducedDamage); // Enemy bullet damage is reduced
            
            // Create hit effect
            createExplosion(bullet.x, bullet.y);
            
            // Play hit sound
            playSound('explosion');
            
            enemyBullets.splice(i, 1);
        }
    }
    
    // Distribute enemy updates to avoid processing all at once
    const enemiesToUpdate = Math.min(enemies.length, 3); // Process max 3 enemies per frame
    const enemyUpdateInterval = enemies.length > 0 ? Math.floor(enemies.length / enemiesToUpdate) : 1;
    
    // Update and draw enemies
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        
        // Only update a subset of enemies each frame
        if (i % enemyUpdateInterval === frameCount % enemyUpdateInterval) {
            enemy.update();
        }
        
        // Always draw all enemies
        enemy.draw();
    }
    
    // Increment frame counter for enemy update distribution
    frameCount = (frameCount + 1) % 1000;
    
    // Check if we need to spawn a health pickup
    if (Date.now() - lastHealthPickupTime > HEALTH_PICKUP_INTERVAL && pickups.length < 3) {
        spawnHealthPickup();
    }
    
    // Update and render 3D scene if in 3D mode
    if (gameMode === '3d') {
        update3DScene();
    }
    
    // Request next frame
    gameLoopId = requestAnimationFrame(gameLoop);
}

// Add frameCount for distributing enemy updates
let frameCount = 0;

function drawGrid() {
    const gridSize = 40;
    ctx.strokeStyle = 'rgba(52, 73, 94, 0.1)';
    ctx.lineWidth = 1;
    
    // Draw vertical lines
    for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
    }
}

// Polyfill for roundRect if not supported
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        this.beginPath();
        this.moveTo(x + radius, y);
        this.arcTo(x + width, y, x + width, y + height, radius);
        this.arcTo(x + width, y + height, x, y + height, radius);
        this.arcTo(x, y + height, x, y, radius);
        this.arcTo(x, y, x + width, y, radius);
        this.closePath();
        return this;
    };
}

// Event Listeners
function setupEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
        if (e.key in keys) {
            keys[e.key] = true;
            
            // Restart game with R key
            if (e.key === 'r' && gameOver) {
                resetGame();
            }
            
            // Prevent scrolling with arrow keys and space
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
        }
    });
    
    window.addEventListener('keyup', (e) => {
        if (e.key in keys) {
            keys[e.key] = false;
        }
    });
    
    // Option card selection
    const tankCards = document.querySelectorAll('[data-tank]');
    tankCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove selected class from all tank cards
            tankCards.forEach(c => c.classList.remove('selected'));
            // Add selected class to clicked card
            card.classList.add('selected');
            // Update selected tank type
            selectedTankType = card.getAttribute('data-tank');
        });
    });
    
    const weaponCards = document.querySelectorAll('[data-weapon]');
    weaponCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove selected class from all weapon cards
            weaponCards.forEach(c => c.classList.remove('selected'));
            // Add selected class to clicked card
            card.classList.add('selected');
            // Update selected weapon type
            selectedWeaponType = card.getAttribute('data-weapon');
        });
    });
    
    const bombCards = document.querySelectorAll('[data-bomb]');
    bombCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove selected class from all bomb cards
            bombCards.forEach(c => c.classList.remove('selected'));
            // Add selected class to clicked card
            card.classList.add('selected');
            // Update selected bomb type
            selectedBombType = card.getAttribute('data-bomb');
        });
    });
    
    // Start Game button
    document.getElementById('startGameButton').addEventListener('click', startGame);
    
    // Restart button
    document.getElementById('restartButton').addEventListener('click', resetGame);
    
    // Options button
    document.getElementById('optionsButton').addEventListener('click', showOptions);
    
    // Add event listeners for game mode selection
    const modeOptions = document.querySelectorAll('[data-mode]');
    modeOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Only do something if selecting a different mode
            if (this.getAttribute('data-mode') !== gameMode) {
                modeOptions.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                
                // Store previous mode
                const previousMode = gameMode;
                gameMode = this.getAttribute('data-mode');
                
                // Clean up 3D resources if switching from 3D to 2D
                if (previousMode === '3d' && gameMode === '2d') {
                    // Dispose of 3D resources
                    if (scene) {
                        // Remove all bullet models
                        bulletModels.forEach(model => {
                            if (model) {
                                scene.remove(model);
                                model.traverse(object => {
                                    if (object.geometry) object.geometry.dispose();
                                    if (object.material) object.material.dispose();
                                });
                            }
                        });
                        bulletModels = [];
                        
                        // Remove all enemy models
                        enemyModels.forEach(model => {
                            if (model) {
                                scene.remove(model);
                                model.traverse(object => {
                                    if (object.geometry) object.geometry.dispose();
                                    if (object.material) object.material.dispose();
                                });
                            }
                        });
                        enemyModels = [];
                        
                        // Remove player model
                        if (tankModels.player) {
                            scene.remove(tankModels.player);
                            tankModels.player.traverse(object => {
                                if (object.geometry) object.geometry.dispose();
                                if (object.material) object.material.dispose();
                            });
                        }
                        
                        // Dispose of renderer
                        if (renderer) {
                            renderer.dispose();
                        }
                    }
                }
            }
        });
    });
}

// Initialize game
function init() {
    console.log("Initializing game...");
    
    // Detect mobile/tablet devices
    detectDevice();
    
    // Initialize canvas and context
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    if (!canvas || !ctx) {
        console.error("Could not initialize canvas or context");
        return;
    }
    
    // Set canvas dimensions
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Set up control instructions text
    const controlsText = document.getElementById('controlsText');
    if (controlsText) {
        controlsText.innerHTML = `
            <span class="control-key">WASD</span> or <span class="key">ARROW KEYS</span> to move,
            <span class="control-key">SPACEBAR</span> to fire,
            <span class="control-key">B</span> for special bomb,
            <span class="control-key">R</span> to restart
        `;
    }
    
    // Initialize sound system
    initSounds();
    
    // Set up bomb icons
    setupBombIcons();
    
    // Show options menu initially
    showOptions();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize mobile controls if on mobile
    if (isMobile || isTablet) {
        setupMobileControls();
    }
    
    // Initialize frame timing
    lastFrameTime = performance.now();
    
    console.log("Game initialization complete");
}

function setupBombIcons() {
    // Set background images for the bomb previews
    document.querySelector('.bomb-icon').style.backgroundImage = getBombIconUrl('cluster');
}

// Start the game when the page loads
window.addEventListener('load', init);

// Add this class after the Particle class
class HealthPickup {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 25;
        this.pulseSize = 0;
        this.pulseDirection = 1;
        this.rotationAngle = 0;
    }
    
    update() {
        // Pulsing effect
        if (this.pulseDirection === 1) {
            this.pulseSize += 0.2;
            if (this.pulseSize >= 5) {
                this.pulseDirection = -1;
            }
        } else {
            this.pulseSize -= 0.2;
            if (this.pulseSize <= 0) {
                this.pulseDirection = 1;
            }
        }
        
        // Rotation effect
        this.rotationAngle += 0.02;
        if (this.rotationAngle > Math.PI * 2) {
            this.rotationAngle -= Math.PI * 2;
        }
        
        // Check collision with player
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < TANK_SIZE) {
            // Heal player
            player.heal(HEALTH_PICKUP_AMOUNT);
            
            // Create pickup effect
            createHealthPickupEffect(this.x, this.y);
            
            return false; // Remove this pickup
        }
        
        return true; // Keep this pickup
    }
    
    draw() {
        ctx.save();
        
        // Draw pulsing glow
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#2ECC71';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width/2 + this.pulseSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Draw health pickup
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotationAngle);
        
        // Draw cross shape
        ctx.fillStyle = '#2ECC71';
        ctx.fillRect(-this.width/4, -this.height/2, this.width/2, this.height);
        ctx.fillRect(-this.width/2, -this.height/4, this.width, this.height/2);
        
        // Draw outline
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width/4, -this.height/2, this.width/2, this.height);
        ctx.strokeRect(-this.width/2, -this.height/4, this.width, this.height/2);
        
        ctx.restore();
    }
}

// Add this function to create a health pickup
function spawnHealthPickup() {
    if (gameOver) return;
    
    // Random position (away from edges and enemies)
    let validPosition = false;
    let x, y;
    let attempts = 0;
    
    while (!validPosition && attempts < 20) {
        x = 50 + Math.random() * (CANVAS_WIDTH - 100);
        y = 50 + Math.random() * (CANVAS_HEIGHT - 100);
        
        // Check if location is away from enemies
        validPosition = true;
        for (const enemy of enemies) {
            const dx = x - enemy.x;
            const dy = y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 100) {
                validPosition = false;
                break;
            }
        }
        
        // Check if location is away from player
        const dxPlayer = x - player.x;
        const dyPlayer = y - player.y;
        const distancePlayer = Math.sqrt(dxPlayer * dxPlayer + dyPlayer * dyPlayer);
        
        if (distancePlayer < 150) {
            validPosition = false;
        }
        
        attempts++;
    }
    
    if (validPosition) {
        pickups.push(new HealthPickup(x, y));
        lastHealthPickupTime = Date.now();
        
        // Create spawn effect
        createHealthPickupSpawnEffect(x, y);
    }
}

// Add these visual effect functions
function createHealthPickupEffect(x, y) {
    const color = '#2ECC71'; // Health green
    
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        const speedX = Math.cos(angle) * speed;
        const speedY = Math.sin(angle) * speed;
        const size = 2 + Math.random() * 4;
        const life = 20 + Math.random() * 20;
        
        particles.push(new Particle(x, y, color, size, speedX, speedY, life));
    }
}

function createHealthPickupSpawnEffect(x, y) {
    const color = '#2ECC71'; // Health green
    
    for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 10;
        const px = x + Math.cos(angle) * distance;
        const py = y + Math.sin(angle) * distance;
        const speed = 0.2;
        const speedX = (x - px) * speed / distance;
        const speedY = (y - py) * speed / distance;
        const size = 2 + Math.random() * 3;
        const life = 20 + Math.random() * 20;
        
        particles.push(new Particle(px, py, color, size, speedX, speedY, life));
    }
}

function createHealingEffect(x, y) {
    const color = '#2ECC71'; // Health green
    
    // Create healing particles that move upward
    for (let i = 0; i < 15; i++) {
        const px = x + (Math.random() - 0.5) * 30;
        const py = y + (Math.random() - 0.5) * 30;
        const speedX = (Math.random() - 0.5) * 0.5;
        const speedY = -1 - Math.random() * 1; // Move upward
        const size = 2 + Math.random() * 3;
        const life = 30 + Math.random() * 20;
        
        particles.push(new Particle(px, py, color, size, speedX, speedY, life));
    }
}

// Function to create a 3D model for tanks
function create3DTankModel(type, isEnemy = false) {
    const tankGroup = new THREE.Group();
    
    // Tank body colors based on type and whether it's an enemy
    let bodyColor, turretColor, trackColor;
    if (isEnemy) {
        const enemyConfig = ENEMY_TANK_TYPES[type];
        bodyColor = enemyConfig.bodyColor;
        turretColor = enemyConfig.turretColor;
        trackColor = enemyConfig.trackColor;
    } else {
        const tankConfig = TANK_TYPES[type];
        bodyColor = tankConfig.bodyColor;
        turretColor = tankConfig.turretColor;
        trackColor = tankConfig.trackColor;
    }
    
    // Create tank body
    const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 6);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: bodyColor });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    tankGroup.add(body);
    
    // Create tank turret
    const turretGeometry = new THREE.BoxGeometry(3, 1, 3);
    const turretMaterial = new THREE.MeshPhongMaterial({ color: turretColor });
    const turret = new THREE.Mesh(turretGeometry, turretMaterial);
    turret.position.y = 2.25;
    tankGroup.add(turret);
    
    // Create tank cannon
    const cannonGeometry = new THREE.CylinderGeometry(0.3, 0.3, 4);
    const cannonMaterial = new THREE.MeshPhongMaterial({ color: turretColor });
    const cannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
    cannon.rotation.x = Math.PI / 2;
    cannon.position.set(0, 2.25, 3);
    tankGroup.add(cannon);
    
    // Create tank tracks
    const leftTrackGeometry = new THREE.BoxGeometry(1, 1, 6.5);
    const rightTrackGeometry = new THREE.BoxGeometry(1, 1, 6.5);
    const trackMaterial = new THREE.MeshPhongMaterial({ color: trackColor });
    
    const leftTrack = new THREE.Mesh(leftTrackGeometry, trackMaterial);
    leftTrack.position.set(-2, 0.5, 0);
    tankGroup.add(leftTrack);
    
    const rightTrack = new THREE.Mesh(rightTrackGeometry, trackMaterial);
    rightTrack.position.set(2, 0.5, 0);
    tankGroup.add(rightTrack);
    
    return tankGroup;
}

// Function to create a 3D bullet
function create3DBullet(weaponType) {
    const bulletConfig = WEAPON_TYPES[weaponType];
    const size = bulletConfig.bulletSize / 5; // Scale down for 3D
    
    const bulletGeometry = new THREE.SphereGeometry(size, 8, 8);
    const bulletMaterial = new THREE.MeshPhongMaterial({ 
        color: bulletConfig.bulletColor,
        emissive: bulletConfig.bulletColor,
        emissiveIntensity: 0.5
    });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Add a point light to make the bullet glow
    const light = new THREE.PointLight(bulletConfig.bulletColor, 1, 10);
    light.position.set(0, 0, 0);
    bullet.add(light);
    
    return bullet;
}

// Function to create the 3D environment
function setup3DEnvironment() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, CANVAS_WIDTH / CANVAS_HEIGHT, 0.1, 1000);
    camera.position.set(0, 30, -20);
    camera.lookAt(0, 0, 0);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
    renderer.shadowMap.enabled = true;
    
    // Add renderer to the DOM
    threeDContainer = document.getElementById('threeDContainer');
    threeDContainer.innerHTML = '';
    threeDContainer.appendChild(renderer.domElement);
    
    // Add lights
    ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Create terrain
    const terrainGeometry = new THREE.PlaneGeometry(200, 200, 32, 32);
    const terrainMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4a5568,
        roughness: 0.8,
        metalness: 0.2,
        flatShading: true
    });
    
    terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);
    
    // Add a grid helper for better orientation
    const gridHelper = new THREE.GridHelper(200, 50, 0x000000, 0x2c3e50);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);
    
    // Create a simple skybox
    const skyGeometry = new THREE.BoxGeometry(500, 500, 500);
    const skyMaterials = [
        new THREE.MeshBasicMaterial({ color: 0x000833, side: THREE.BackSide }),
        new THREE.MeshBasicMaterial({ color: 0x000833, side: THREE.BackSide }),
        new THREE.MeshBasicMaterial({ color: 0x090a1a, side: THREE.BackSide }),
        new THREE.MeshBasicMaterial({ color: 0x000833, side: THREE.BackSide }),
        new THREE.MeshBasicMaterial({ color: 0x000833, side: THREE.BackSide }),
        new THREE.MeshBasicMaterial({ color: 0x000833, side: THREE.BackSide })
    ];
    skybox = new THREE.Mesh(skyGeometry, skyMaterials);
    scene.add(skybox);
    
    // Create star particles for the sky
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1,
        sizeAttenuation: false
    });
    
    const starsVertices = [];
    for (let i = 0; i < 1000; i++) {
        const x = (Math.random() - 0.5) * 500;
        const y = (Math.random() - 0.5) * 500;
        const z = (Math.random() - 0.5) * 500;
        starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

// Function to update the 3D scene
function update3DScene() {
    if (gameMode !== '3d') return;
    
    // Update player tank position and rotation
    if (tankModels.player) {
        tankModels.player.position.x = player.x / 10 - CANVAS_WIDTH / 20;
        tankModels.player.position.z = player.y / 10 - CANVAS_HEIGHT / 20;
        tankModels.player.rotation.y = -player.rotation + Math.PI / 2;
    }
    
    // Update camera position to follow player
    if (camera) {
        const cameraOffset = new THREE.Vector3(0, 30, -20);
        cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -player.rotation + Math.PI / 2);
        camera.position.x = tankModels.player.position.x + cameraOffset.x;
        camera.position.y = tankModels.player.position.y + cameraOffset.y;
        camera.position.z = tankModels.player.position.z + cameraOffset.z;
        camera.lookAt(tankModels.player.position);
    }
    
    // Update enemy tanks
    enemies.forEach((enemy, index) => {
        if (enemyModels[index]) {
            enemyModels[index].position.x = enemy.x / 10 - CANVAS_WIDTH / 20;
            enemyModels[index].position.z = enemy.y / 10 - CANVAS_HEIGHT / 20;
            enemyModels[index].rotation.y = -enemy.rotation + Math.PI / 2;
        }
    });
    
    // Update bullets
    bullets.forEach((bullet, index) => {
        if (bulletModels[index]) {
            bulletModels[index].position.x = bullet.x / 10 - CANVAS_WIDTH / 20;
            bulletModels[index].position.z = bullet.y / 10 - CANVAS_HEIGHT / 20;
            bulletModels[index].position.y = 2; // Keep bullets at turret height
        }
    });
    
    // Render the scene
    renderer.render(scene, camera);
}

// Function to detect device type
function detectDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTabletDevice = /ipad|tablet/i.test(userAgent) || 
                          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    isMobile = isMobileDevice && !isTabletDevice;
    isTablet = isTabletDevice;
    
    // Show appropriate controls instructions
    if (isMobile || isTablet) {
        document.getElementById('desktopControls').style.display = 'none';
        document.getElementById('mobileControls').style.display = 'block';
    }
    
    console.log(`Device detected: ${isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}`);
}

// Set up mobile touch controls
function setupMobileControls() {
    const joystick = document.getElementById('joystick');
    const joystickKnob = document.getElementById('joystickKnob');
    const fireButton = document.getElementById('fireButton');
    const bombButton = document.getElementById('bombButton');
    
    if (!joystick || !joystickKnob || !fireButton || !bombButton) {
        console.error("Mobile control elements not found");
        return;
    }
    
    // Get joystick center position
    const joystickRect = joystick.getBoundingClientRect();
    joystickCenter = {
        x: joystickRect.left + joystickRect.width / 2,
        y: joystickRect.top + joystickRect.height / 2
    };
    
    // Set max radius based on joystick size (somewhat smaller than actual size)
    joystickMaxRadius = joystickRect.width * 0.4;
    
    // Joystick touch events
    joystick.addEventListener('touchstart', handleJoystickStart);
    joystick.addEventListener('touchmove', handleJoystickMove);
    joystick.addEventListener('touchend', handleJoystickEnd);
    
    // Fire button event
    fireButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys[' '] = true;
    });
    
    fireButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys[' '] = false;
    });
    
    // Bomb button event
    bombButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['b'] = true;
    });
    
    bombButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys['b'] = false;
    });
    
    // Show mobile controls
    document.getElementById('mobileTouchControls').style.display = 'block';
}

// Joystick touch handlers
function handleJoystickStart(e) {
    e.preventDefault();
    joystickActive = true;
    updateJoystickPosition(e.touches[0]);
}

function handleJoystickMove(e) {
    e.preventDefault();
    if (joystickActive) {
        updateJoystickPosition(e.touches[0]);
    }
}

function handleJoystickEnd(e) {
    e.preventDefault();
    joystickActive = false;
    resetJoystick();
}

function updateJoystickPosition(touch) {
    // Get touch position relative to joystick center
    const joystickRect = document.getElementById('joystick').getBoundingClientRect();
    joystickCenter = {
        x: joystickRect.left + joystickRect.width / 2,
        y: joystickRect.top + joystickRect.height / 2
    };
    
    const touchX = touch.clientX;
    const touchY = touch.clientY;
    
    // Calculate distance from center
    const dx = touchX - joystickCenter.x;
    const dy = touchY - joystickCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize to joystick max radius
    if (distance > joystickMaxRadius) {
        joystickPosition.x = dx * joystickMaxRadius / distance;
        joystickPosition.y = dy * joystickMaxRadius / distance;
    } else {
        joystickPosition.x = dx;
        joystickPosition.y = dy;
    }
    
    // Update joystick knob position
    const joystickKnob = document.getElementById('joystickKnob');
    if (joystickKnob) {
        joystickKnob.style.transform = `translate(calc(-50% + ${joystickPosition.x}px), calc(-50% + ${joystickPosition.y}px))`;
    }
    
    // Update joystick vector (normalized -1 to 1)
    joystickVector.x = joystickPosition.x / joystickMaxRadius;
    joystickVector.y = joystickPosition.y / joystickMaxRadius;
    
    // Update keys based on joystick position
    updateKeysFromJoystick();
}

function resetJoystick() {
    joystickPosition = { x: 0, y: 0 };
    joystickVector = { x: 0, y: 0 };
    
    // Reset joystick knob position
    const joystickKnob = document.getElementById('joystickKnob');
    if (joystickKnob) {
        joystickKnob.style.transform = 'translate(-50%, -50%)';
    }
    
    // Reset movement keys
    keys.ArrowUp = false;
    keys.ArrowDown = false;
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
    keys.w = false;
    keys.s = false;
    keys.a = false;
    keys.d = false;
}

function updateKeysFromJoystick() {
    // Reset all movement keys
    keys.ArrowUp = false;
    keys.ArrowDown = false;
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
    keys.w = false;
    keys.s = false;
    keys.a = false;
    keys.d = false;
    
    // Set keys based on joystick position
    if (joystickVector.y < -0.3) {
        keys.ArrowUp = true;
        keys.w = true;
    }
    if (joystickVector.y > 0.3) {
        keys.ArrowDown = true;
        keys.s = true;
    }
    if (joystickVector.x < -0.3) {
        keys.ArrowLeft = true;
        keys.a = true;
    }
    if (joystickVector.x > 0.3) {
        keys.ArrowRight = true;
        keys.d = true;
    }
}

// Add window resize event listener to handle orientation changes
window.addEventListener('resize', function() {
    // Recalculate joystick center position if on mobile
    if (isMobile || isTablet) {
        const joystick = document.getElementById('joystick');
        if (joystick) {
            const joystickRect = joystick.getBoundingClientRect();
            joystickCenter = {
                x: joystickRect.left + joystickRect.width / 2,
                y: joystickRect.top + joystickRect.height / 2
            };
            joystickMaxRadius = joystickRect.width * 0.4;
        }
    }
    
    // Update device detection
    detectDevice();
    
    // Update controls visibility
    if (isMobile || isTablet) {
        document.getElementById('mobileTouchControls').style.display = 'block';
        document.getElementById('desktopControls').style.display = 'none';
        document.getElementById('mobileControls').style.display = 'block';
    } else {
        document.getElementById('mobileTouchControls').style.display = 'none';
        document.getElementById('desktopControls').style.display = 'block';
        document.getElementById('mobileControls').style.display = 'none';
    }
});

// Override resetGame to also reset joystick on mobile
const originalResetGame = resetGame;
resetGame = function() {
    // Reset joystick if on mobile
    if (isMobile || isTablet) {
        resetJoystick();
    }
    
    // Call the original resetGame function
    originalResetGame();
};
  