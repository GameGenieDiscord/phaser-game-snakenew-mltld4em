// Snake game with powerups and obstacles
let snake, food, cursors, score = 0, scoreText, gameOver = false;
let obstacles, powerups, snakeBody = [], direction = 'right', nextDirection = 'right';
let powerupActive = false, powerupTimer = 0;

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
    
    // Create obstacles
    for (let i = 0; i < 8; i++) {
        const x = Phaser.Math.Between(50, 750);
        const y = Phaser.Math.Between(50, 550);
        obstacles.create(x, y, 'obstacle');
    }
    
    // Create powerup
    const powerup = powerups.create(Phaser.Math.Between(50, 750), Phaser.Math.Between(50, 550), 'powerup');
    
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
}

function update(time, delta) {
    if (gameOver) return;
    
    // Handle input
    if (cursors.left.isDown && direction !== 'right') nextDirection = 'left';
    if (cursors.right.isDown && direction !== 'left') nextDirection = 'right';
    if (cursors.up.isDown && direction !== 'down') nextDirection = 'up';
    if (cursors.down.isDown && direction !== 'up') nextDirection = 'down';
    
    // Move snake
    direction = nextDirection;
    const speed = powerupActive ? 300 : 200;
    
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

function eatFood(snake, food) {
    food.x = Phaser.Math.Between(20, 780);
    food.y = Phaser.Math.Between(20, 580);
    score += 10;
    scoreText.setText('Score: ' + score);
    
    // Grow snake
    const lastSegment = snakeBody[snakeBody.length - 1] || snake;
    const newSegment = this.add.rectangle(lastSegment.x, lastSegment.y, 18, 18, 0x0099cc);
    snakeBody.push(newSegment);
}

function collectPowerup(snake, powerup) {
    powerup.destroy();
    powerupActive = true;
    powerupTimer = 5000;
    snake.setTint(0xffd700);
    score += 50;
    scoreText.setText('Score: ' + score);
    
    // Spawn new powerup after delay
    this.time.delayedCall(10000, () => {
        if (!gameOver) {
            powerups.create(Phaser.Math.Between(50, 750), Phaser.Math.Between(50, 550), 'powerup');
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