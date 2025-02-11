// Prevent arrow key scrolling
window.addEventListener("keydown", function(e) {
    if([37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const startButton = document.getElementById('startButton');

// Decreased cell size for smaller grid
const cellSize = 20;
let score = 0;
let lives = 3;
let isGameRunning = false;

// Power Pellet duration in milliseconds
const POWER_PELLET_DURATION = 10000;

// Pac-Man object with reduced radius
let pacman = {
    x: cellSize * 1.5,
    y: cellSize * 1.5,
    radius: 6, // Reduced from 13 to 6
    angle: 0.2,
    speed: 2,
    direction: 0,
    nextDirection: 0,
    isPowered: false,
    powerTimer: null
};

// Ghost class with enhanced behaviors and reduced radius
class Ghost {
    constructor(x, y, color) {
        this.initialX = x;
        this.initialY = y;
        this.x = x;
        this.y = y;
        this.color = color;
        this.speed = 1.5;
        this.direction = this.getRandomDirection();
        this.state = 'normal'; // 'normal', 'frightened', 'eaten'
        this.radius = 6; // Reduced from 13 to 6
    }

    getRandomDirection() {
        return Math.floor(Math.random() * 4);
    }

    draw() {
        ctx.beginPath();
        ctx.fillStyle = this.state === 'frightened' ? 'lightblue' : this.color;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }

    move() {
        if (this.state === 'eaten') {
            // Move towards the spawn point
            this.moveTowards(this.initialX, this.initialY);
            // Check if reached spawn point
            if (distance(this.x, this.y, this.initialX, this.initialY) < this.speed) {
                this.state = 'normal';
            }
            return;
        }

        if (this.state === 'frightened') {
            this.frightenedMove();
        } else {
            this.normalMove();
        }
    }

    normalMove() {
        const preferredDirection = this.getChaseDirection();
        this.attemptDirectionChange(preferredDirection);
        this.updatePosition();
    }

    frightenedMove() {
        const preferredDirection = this.getFleeDirection();
        this.attemptDirectionChange(preferredDirection);
        this.updatePosition();
    }

    getChaseDirection() {
        const deltaX = pacman.x - this.x;
        const deltaY = pacman.y - this.y;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            return deltaX > 0 ? 0 : 2; // Right or Left
        } else {
            return deltaY > 0 ? 1 : 3; // Down or Up
        }
    }

    getFleeDirection() {
        const deltaX = this.x - pacman.x;
        const deltaY = this.y - pacman.y;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            return deltaX > 0 ? 0 : 2; // Right or Left
        } else {
            return deltaY > 0 ? 1 : 3; // Down or Up
        }
    }

    attemptDirectionChange(preferredDirection) {
        if (!this.isDirectionBlocked(preferredDirection)) {
            this.direction = preferredDirection;
        } else {
            const directions = [0, 1, 2, 3].filter(dir => dir !== (this.direction + 2) % 4); // Prevent immediate reversal
            // Shuffle directions to add randomness
            for (let i = directions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [directions[i], directions[j]] = [directions[j], directions[i]];
            }
            for (let dir of directions) {
                if (!this.isDirectionBlocked(dir)) {
                    this.direction = dir;
                    break;
                }
            }
        }
    }

    updatePosition() {
        let newX = this.x;
        let newY = this.y;

        switch (this.direction) {
            case 0: newX += this.speed; break; // Right
            case 1: newY += this.speed; break; // Down
            case 2: newX -= this.speed; break; // Left
            case 3: newY -= this.speed; break; // Up
        }

        if (!isWall(newX, newY, this.radius)) {
            this.x = newX;
            this.y = newY;
        } else {
            // Choose a new random direction if blocked
            this.direction = this.getRandomDirection();
        }
    }

    moveTowards(targetX, targetY) {
        const deltaX = targetX - this.x;
        const deltaY = targetY - this.y;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            this.direction = deltaX > 0 ? 0 : 2; // Right or Left
        } else {
            this.direction = deltaY > 0 ? 1 : 3; // Down or Up
        }
    }

    isDirectionBlocked(direction) {
        let testX = this.x;
        let testY = this.y;

        switch (direction) {
            case 0: testX += this.speed; break; // Right
            case 1: testY += this.speed; break; // Down
            case 2: testX -= this.speed; break; // Left
            case 3: testY -= this.speed; break; // Up
        }

        // Include buffer to prevent overlapping walls
        return isWall(testX, testY, this.radius + 1);
    }

    enterFrightenedState() {
        if (this.state !== 'eaten') {
            this.state = 'frightened';
        }
    }

    exitFrightenedState() {
        if (this.state === 'frightened') {
            this.state = 'normal';
        }
    }

    eatGhost() {
        this.state = 'eaten';
        this.x = this.initialX;
        this.y = this.initialY;
    }
}

// Utility function to calculate distance between two points
function distance(x1, y1, x2, y2) {
    return Math.sqrt(
        Math.pow(x1 - x2, 2) +
        Math.pow(y1 - y2, 2)
    );
}

// Initialize ghosts with adjusted spawn positions
let ghosts = [
    new Ghost(cellSize * 14.5, cellSize * 8.5, 'red'),
    new Ghost(cellSize * 14.5, cellSize * 9.5, 'pink'),   // Changed to (14.5, 9.5)
    new Ghost(cellSize * 9.5, cellSize * 9.5, 'cyan'),    // Changed to (9.5, 9.5)
    new Ghost(cellSize * 5.5, cellSize * 5.5, 'orange')
];

// Larger, more complex map (20x20)
// Use '2' to represent power pellets
const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,1,1,1,0,1,1,1,1,0,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,2,1,0,1,0,1,1,1,0,0,1,1,1,0,1,0,1,0,1],
    [1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1],
    [1,0,1,0,1,0,1,1,1,1,1,1,1,1,0,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,0,2,2,0,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,1,1,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,2,0,1],
    [1,1,1,0,1,1,1,0,1,1,1,1,0,1,1,1,0,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,0,1,1,1,1,0,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Initialize dots
let dots = [];
let powerPellets = [];
initializeDots();

// Draw Pac-Man
function drawPacman() {
    ctx.beginPath();
    ctx.arc(pacman.x, pacman.y, pacman.radius, 
        pacman.direction * Math.PI/2 + pacman.angle,
        pacman.direction * Math.PI/2 + 2 * Math.PI - pacman.angle);
    ctx.lineTo(pacman.x, pacman.y);
    ctx.fillStyle = 'yellow';
    ctx.fill();
    ctx.closePath();
}

// Draw regular dots and power pellets
function drawDots() {
    // Draw regular dots
    ctx.fillStyle = 'white';
    dots.forEach(dot => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    });

    // Draw power pellets
    ctx.fillStyle = 'white';
    powerPellets.forEach(pellet => {
        ctx.beginPath();
        ctx.arc(pellet.x, pellet.y, 6, 0, Math.PI * 2); // Larger radius for power pellets
        ctx.fill();
        ctx.closePath();
    });
}

// Draw the walls based on the map array
function drawWalls() {
    for(let row = 0; row < map.length; row++) {
        for(let col = 0; col < map[row].length; col++) {
            if(map[row][col] === 1) {
                ctx.fillStyle = 'blue';
                ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
            }
        }
    }
}

// Check if the next Pac-Man position is a wall
function isWall(nx, ny, buffer = 0) {
    const col = Math.floor(nx / cellSize);
    const row = Math.floor(ny / cellSize);
    // Prevent out-of-bounds access
    if(row < 0 || row >= map.length || col < 0 || col >= map[0].length) return true;
    return map[row][col] === 1;
}

// Check collision with dots and power pellets
function checkCollision() {
    // Check regular dots
    dots = dots.filter(dot => {
        const distanceToPacman = distance(dot.x, dot.y, pacman.x, pacman.y);
        if (distanceToPacman < pacman.radius) {
            score += 10;
            scoreElement.textContent = `Score: ${score}`;
            return false;
        }
        return true;
    });

    // Check power pellets
    powerPellets = powerPellets.filter(pellet => {
        const distanceToPacman = distance(pellet.x, pellet.y, pacman.x, pacman.y);
        if (distanceToPacman < pacman.radius) {
            score += 50;
            scoreElement.textContent = `Score: ${score}`;
            activatePowerPellet();
            return false;
        }
        return true;
    });

    if (dots.length === 0 && powerPellets.length === 0) {
        initializeDots(); // Reset dots and power pellets
    }
}

// Activate power pellet effect
function activatePowerPellet() {
    pacman.isPowered = true;
    // Change all ghosts to frightened state
    ghosts.forEach(ghost => {
        ghost.enterFrightenedState();
    });

    // Clear any existing timer
    if (pacman.powerTimer) {
        clearTimeout(pacman.powerTimer);
    }

    // Set a timer to deactivate power pellet after duration
    pacman.powerTimer = setTimeout(() => {
        pacman.isPowered = false;
        ghosts.forEach(ghost => {
            ghost.exitFrightenedState();
        });
    }, POWER_PELLET_DURATION);
}

// Ghosts respond to power pellet state
function handleGhostEaten(ghost) {
    if (ghost.state === 'frightened') {
        ghost.eatGhost();
        score += 200;
        scoreElement.textContent = `Score: ${score}`;
    }
}

// Initialize dots and power pellets based on the map
function initializeDots() {
    dots = [];
    powerPellets = [];
    for(let row = 0; row < map.length; row++) {
        for(let col = 0; col < map[row].length; col++) {
            if(map[row][col] === 0) {  // Regular dot
                dots.push({
                    x: col * cellSize + cellSize/2,
                    y: row * cellSize + cellSize/2
                });
            } else if(map[row][col] === 2) { // Power pellet
                powerPellets.push({
                    x: col * cellSize + cellSize/2,
                    y: row * cellSize + cellSize/2
                });
            }
        }
    }
}

// Revised update function with enhanced mechanics
function update() {
    if (!isGameRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw everything
    drawWalls();
    drawDots();
    drawPacman();

    // Move and draw ghosts
    ghosts.forEach(ghost => {
        ghost.move();
        ghost.draw();

        // Check for collision with ghosts
        const distanceToGhost = distance(ghost.x, ghost.y, pacman.x, pacman.y);

        if (distanceToGhost < pacman.radius + ghost.radius) {
            if (ghost.state === 'frightened') {
                handleGhostEaten(ghost);
            } else if (ghost.state === 'normal') {
                loseLife();
            }
        }
    });

    // Move Pac-Man in the current direction
    movePacman();

    // Check dot and power pellet collisions
    checkCollision();

    requestAnimationFrame(update);
}

// Function to move Pac-Man
function movePacman() {
    // Attempt to change direction if nextDirection is set
    if (pacman.nextDirection !== pacman.direction) {
        let canChange = false;
        let testX = pacman.x;
        let testY = pacman.y;

        switch(pacman.nextDirection) {
            case 0: // Right
                testX += pacman.speed;
                canChange = !isWall(testX + pacman.radius, testY);
                break;
            case 1: // Down
                testY += pacman.speed;
                canChange = !isWall(testX, testY + pacman.radius);
                break;
            case 2: // Left
                testX -= pacman.speed;
                canChange = !isWall(testX - pacman.radius, testY);
                break;
            case 3: // Up
                testY -= pacman.speed;
                canChange = !isWall(testX, testY - pacman.radius);
                break;
        }

        if (canChange) {
            pacman.direction = pacman.nextDirection;
        }
    }

    // Move Pac-Man in the current direction
    let newX = pacman.x;
    let newY = pacman.y;
    let canMove = false;

    switch(pacman.direction) {
        case 0: // Right
            newX += pacman.speed;
            canMove = !isWall(newX + pacman.radius, pacman.y);
            break;
        case 1: // Down
            newY += pacman.speed;
            canMove = !isWall(pacman.x, newY + pacman.radius);
            break;
        case 2: // Left
            newX -= pacman.speed;
            canMove = !isWall(newX - pacman.radius, pacman.y);
            break;
        case 3: // Up
            newY -= pacman.speed;
            canMove = !isWall(pacman.x, newY - pacman.radius);
            break;
    }

    if (canMove) {
        pacman.x = newX;
        pacman.y = newY;
    }
}

// Lose a life and reset Pac-Man's position
function loseLife() {
    lives--;
    livesElement.textContent = `Lives: ${lives}`;
    if (lives === 0) {
        gameOver();
    } else {
        resetPositions();
    }
}

// Function to reset Pac-Man and ghosts positions after losing a life
function resetPositions() {
    // Reset Pac-Man position and direction
    pacman.x = cellSize * 1.5;
    pacman.y = cellSize * 1.5;
    pacman.direction = 0;
    pacman.nextDirection = 0;
    pacman.isPowered = false;
    if (pacman.powerTimer) {
        clearTimeout(pacman.powerTimer);
    }

    // Reset ghosts to their initial positions and states
    ghosts.forEach(ghost => {
        ghost.x = ghost.initialX;
        ghost.y = ghost.initialY;
        ghost.state = 'normal';
    });
}

// Game Over function
function gameOver() {
    isGameRunning = false;
    ctx.fillStyle = 'red';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2);
}

// Keydown event listener for direction changes
document.addEventListener('keydown', (e) => {
    if (!isGameRunning) return;

    switch(e.key) {
        case 'ArrowRight': pacman.nextDirection = 0; break;
        case 'ArrowDown': pacman.nextDirection = 1; break;
        case 'ArrowLeft': pacman.nextDirection = 2; break;
        case 'ArrowUp': pacman.nextDirection = 3; break;
    }
});

// Start button event listener
startButton.addEventListener('click', () => {
    score = 0;
    lives = 3;
    scoreElement.textContent = `Score: ${score}`;
    livesElement.textContent = `Lives: ${lives}`;
    pacman.x = cellSize * 1.5;
    pacman.y = cellSize * 1.5;
    pacman.direction = 0;
    pacman.nextDirection = 0;
    pacman.isPowered = false;
    if (pacman.powerTimer) {
        clearTimeout(pacman.powerTimer);
    }
    initializeDots();

    // Reset ghosts to their starting positions and states
    ghosts = [
        new Ghost(cellSize * 14.5, cellSize * 8.5, 'red'),
        new Ghost(cellSize * 14.5, cellSize * 9.5, 'pink'),   // Changed to (14.5, 9.5)
        new Ghost(cellSize * 9.5, cellSize * 9.5, 'cyan'),    // Changed to (9.5, 9.5)
        new Ghost(cellSize * 5.5, cellSize * 5.5, 'orange')
    ];

    isGameRunning = true;
    update();
});