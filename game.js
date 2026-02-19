// Snake game with powerups and obstacles
let snake, food, cursors, score = 0, scoreText, gameOver = false;
let obstacles, powerups, snakeBody = [], direction = 'right', nextDirection = 'right';
let powerupActive = false, powerupTimer = 0;
let lastMoveTime = 0; // Track when snake last moved

// Music and sound variables
let synth, bassSynth, leadSynth, reverb, gain;
let musicStarted = false;

function preload() {
    // Create simple textures programmatically
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Snake head texture (blue square)
    graphics.fillStyle(0x00d4ff);
    graphics.fillRect(0, 0, 20, 20);
    graphics.generateTexture('snake', 20, 20);
    
    // Food texture (red circle)
    graphics.clear();
    graphics.fillStyle(0xff0000);
    graphics.fillCircle(10, 10, 10);
    graphics.generateTexture('food', 20, 20);
    
    // Obstacle texture (gray square)
    graphics.clear();
    graphics.fillStyle(0x666666);
    graphics.fillRect(0, 0, 20, 20);
    graphics.generateTexture('obstacle', 20, 20);
    
    // Powerup texture (gold star)
    graphics.clear();
    graphics.fillStyle(0xffd700);
    const star = new Phaser.Geom.Polygon([10,0, 12,7, 20,7, 14,12, 16,20, 10,15, 4,20, 6,12, 0,7, 8,7]);
    graphics.fillPoints(star.points);
    graphics.generateTexture('powerup', 20, 20);
}

function create() {
    // Background
    this.cameras.main.setBackgroundColor('#1a1a2e');
    
    // Initialize groups
    obstacles = this.physics.add.staticGroup();
    powerups = this.physics.add.group();
    
    // Create snake
    snake = this.physics.add.sprite(400, 300, 'snake');
    snake.setCollideWorldBounds(true);
    snakeBody = [];
    for (let i = 0; i < 3; i++) {
        const segment = this.add.rectangle(400 - (i + 1) * 20, 300, 18, 18, 0x0099cc);
        snakeBody.push(segment);
    }
    
    // Create food
    food = this.physics.add.sprite(200, 200, 'food');
    alignToGrid(food);
    
    // Create obstacles aligned to grid
    const gridSize = 20;
    const cols = Math.floor(800 / gridSize);
    const rows = Math.floor(600 / gridSize);
    for (let i = 0; i < 8; i++) {
        const x = Phaser.Math.Between(2, cols - 3) * gridSize + gridSize / 2;
        const y = Phaser.Math.Between(2, rows - 3) * gridSize + gridSize / 2;
        const obstacle = obstacles.create(x, y, 'obstacle').setOrigin(0.5, 0.5);
        alignToGrid(obstacle);
    }
    
    // Create powerup aligned to grid
    const powerup = powerups.create(
        Phaser.Math.Between(2, cols - 3) * gridSize + gridSize / 2,
        Phaser.Math.Between(2, rows - 3) * gridSize + gridSize / 2,
        'powerup'
    );
    powerup.setOrigin(0.5, 0.5);
    alignToGrid(powerup);
    
    // Score text
    scoreText = this.add.text(16, 16, 'Score: 0', {
        fontSize: '24px',
        fill: '#ffffff',
        fontFamily: 'Arial'
    });
    
    // Controls
    cursors = this.input.keyboard.createCursorKeys();
    
    // Collisions
    this.physics.add.overlap(snake, food, eatFood, null, this);
    this.physics.add.overlap(snake, powerups, collectPowerup, null, this);
    this.physics.add.collider(snake, obstacles, hitObstacle, null, this);
    
    // Initialize music
    initMusic();
    
    // Start music on first user interaction
    this.input.keyboard.once('keydown', () => {
        if (!musicStarted) {
            Tone.start();
            startMusic();
            musicStarted = true;
        }
    });
}

function update(time, delta) {
    if (gameOver) return;
    
    // Handle input
    if (cursors.left.isDown && direction !== 'right') nextDirection = 'left';
    if (cursors.right.isDown && direction !== 'left') nextDirection = 'right';
    if (cursors.up.isDown && direction !== 'down') nextDirection = 'up';
    if (cursors.down.isDown && direction !== 'up') nextDirection = 'down';
    
    // Control speed: only move if enough time has passed
    const moveDelay = powerupActive ? 120 : 200; // milliseconds between moves
    if (time - lastMoveTime < moveDelay) return;
    lastMoveTime = time;
    
    // Move snake
    direction = nextDirection;
    
    // Update snake position
    const prevX = snake.x;
    const prevY = snake.y;
    
    switch (direction) {
        case 'left': snake.x -= 20; break;
        case 'right': snake.x += 20; break;
        case 'up': snake.y -= 20; break;
        case 'down': snake.y += 20; break;
    }
    
    // Update snake body
    for (let i = snakeBody.length - 1; i > 0; i--) {
        snakeBody[i].x = snakeBody[i - 1].x;
        snakeBody[i].y = snakeBody[i - 1].y;
    }
    if (snakeBody.length > 0) {
        snakeBody[0].x = prevX;
        snakeBody[0].y = prevY;
    }
    
    // Check wall collision
    if (snake.x < 0 || snake.x > 800 || snake.y < 0 || snake.y > 600) {
        gameOver = true;
        this.add.text(400, 300, 'GAME OVER', {
            fontSize: '48px',
            fill: '#ff0000',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        stopMusic();
    }
    
    // Check self collision
    for (let segment of snakeBody) {
        if (Math.abs(snake.x - segment.x) < 10 && Math.abs(snake.y - segment.y) < 10) {
            gameOver = true;
            this.add.text(400, 300, 'GAME OVER', {
                fontSize: '48px',
                fill: '#ff0000',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
            stopMusic();
        }
    }
    
    // Update powerup timer
    if (powerupActive) {
        powerupTimer -= delta;
        if (powerupTimer <= 0) {
            powerupActive = false;
            snake.setTint(0xffffff);
        }
    }
}

function initMusic() {
    // Create reverb effect
    reverb = new Tone.Reverb(1.2).toDestination();
    
    // Master gain to control overall volume - much quieter now
    gain = new Tone.Gain(-36).toDestination();
    
    // Bass synth for low-end groove
    bassSynth = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        filter: { frequency: 400 },
        envelope: { attack: 0.1, decay: 0.2, sustain: 0.4, release: 0.8 }
    }).connect(reverb).connect(gain);
    
    // Chord synth for harmony
    synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.3, release: 0.8 }
    }).connect(reverb).connect(gain);
    
    // Lead synth for melody
    leadSynth = new Tone.MonoSynth({
        oscillator: { type: 'square' },
        filter: { frequency: 800 },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.2, release: 0.5 }
    }).connect(reverb).connect(gain);
}

function startMusic() {
    // Set tempo
    Tone.Transport.bpm.value = 120;
    
    // Bass pattern - driving 8th notes
    const bassLoop = new Tone.Loop((time) => {
        bassSynth.triggerAttackRelease('C2', '8n', time);
    }, '4n').start(0);
    
    // Chord progression - I-vi-IV-V
    const chordPattern = ['C4', 'A3', 'F3', 'G3'];
    let chordIndex = 0;
    const chordLoop = new Tone.Loop((time) => {
        synth.triggerAttackRelease(chordPattern[chordIndex], '2n', time);
        chordIndex = (chordIndex + 1) % chordPattern.length;
    }, '2n').start(0);
    
    // Melody - upbeat arpeggio
    const melodyNotes = ['C5', 'E5', 'G5', 'C6', 'G5', 'E5', 'C5', 'G4'];
    let melodyIndex = 0;
    const melodyLoop = new Tone.Loop((time) => {
        leadSynth.triggerAttackRelease(melodyNotes[melodyIndex], '8n', time);
        melodyIndex = (melodyIndex + 1) % melodyNotes.length;
    }, '8n').start('4n');
    
    // Start transport
    Tone.Transport.start();
}

function stopMusic() {
    Tone.Transport.stop();
}

function playSound(type) {
    if (!musicStarted) return;
    
    const now = Tone.now();
    switch (type) {
        case 'eat':
            // Happy ascending notes - quieter
            synth.volume.value = -42;
            synth.triggerAttackRelease(['C5', 'E5'], '8n', now);
            break;
        case 'powerup':
            // Magical sparkle sound - quieter
            leadSynth.volume.value = -42;
            leadSynth.triggerAttackRelease('G6', '16n', now);
            leadSynth.triggerAttackRelease('C7', '16n', now + 0.1);
            break;
        case 'gameover':
            // Sad descending notes - quieter
            leadSynth.volume.value = -42;
            leadSynth.triggerAttackRelease('C5', '4n', now);
            leadSynth.triggerAttackRelease('G4', '4n', now + 0.3);
            leadSynth.triggerAttackRelease('C4', '2n', now + 0.6);
            break;
    }
}

function alignToGrid(obj) {
    const gridSize = 20;
    obj.x = Math.round(obj.x / gridSize) * gridSize;
    obj.y = Math.round(obj.y / gridSize) * gridSize;
}

function eatFood(snake, food) {
    const gridSize = 20;
    const cols = Math.floor(800 / gridSize);
    const rows = Math.floor(600 / gridSize);
    food.x = Phaser.Math.Between(2, cols - 3) * gridSize + gridSize / 2;
    food.y = Phaser.Math.Between(2, rows - 3) * gridSize + gridSize / 2;
    alignToGrid(food);
    score += 10;
    scoreText.setText('Score: ' + score);
    
    // Grow snake
    const lastSegment = snakeBody[snakeBody.length - 1] || snake;
    const newSegment = this.add.rectangle(lastSegment.x, lastSegment.y, 18, 18, 0x0099cc);
    snakeBody.push(newSegment);
    
    // Play eat sound
    playSound('eat');
}

function collectPowerup(snake, powerup) {
    powerup.destroy();
    powerupActive = true;
    powerupTimer = 5000;
    snake.setTint(0xffd700);
    score += 50;
    scoreText.setText('Score: ' + score);
    
    // Play powerup sound
    playSound('powerup');
    
    // Spawn new powerup after delay
    this.time.delayedCall(10000, () => {
        if (!gameOver) {
            const gridSize = 20;
            const cols = Math.floor(800 / gridSize);
            const rows = Math.floor(600 / gridSize);
            const newPowerup = powerups.create(
                Phaser.Math.Between(2, cols - 3) * gridSize + gridSize / 2,
                Phaser.Math.Between(2, rows - 3) * gridSize + gridSize / 2,
                'powerup'
            );
            newPowerup.setOrigin(0.5, 0.5);
            alignToGrid(newPowerup);
        }
    });
}

function hitObstacle(snake, obstacle) {
    if (!powerupActive) {
        gameOver = true;
        this.add.text(400, 300, 'GAME OVER', {
            fontSize: '48px',
            fill: '#ff0000',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        stopMusic();
        playSound('gameover');
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: { preload, create, update }
};

// Initialize game
const game = new Phaser.Game(config);