const canvas = document.getElementById('tetris-canvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');

const BLOCK_SIZE = 30;
const ROWS = 20;
const COLS = 10;

ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
nextCtx.scale(BLOCK_SIZE, BLOCK_SIZE);
holdCtx.scale(BLOCK_SIZE, BLOCK_SIZE);

const COLORS = [
    null,
    '#00ffff', // I (Cyan)
    '#ffff00', // O (Yellow)
    '#800080', // T (Purple)
    '#00ff00', // S (Green)
    '#ff0000', // Z (Red)
    '#0000ff', // J (Blue)
    '#ffa500'  // L (Orange)
];

const SHAPES = [
    [],
    [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]], // I
    [[2, 2], [2, 2]],                                         // O
    [[0, 3, 0], [3, 3, 3], [0, 0, 0]],                        // T
    [[0, 4, 4], [4, 4, 0], [0, 0, 0]],                        // S
    [[5, 5, 0], [0, 5, 5], [0, 0, 0]],                        // Z
    [[6, 0, 0], [6, 6, 6], [0, 0, 0]],                        // J
    [[0, 0, 7], [7, 7, 7], [0, 0, 0]]                         // L
];

let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let currentPiece = null;
let nextPiece = null;
let holdPiece = null;
let canHold = true;

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

let score = 0;
let level = 1;
let lines = 0;
let isGameOver = false;
let isPaused = false;
let requestAnimationId = null;

const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const gameOverScreen = document.getElementById('game-over-screen');
const pauseScreen = document.getElementById('pause-screen');
const finalScoreElement = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const pauseBtn = document.getElementById('pause-btn');

function togglePause() {
    if (isGameOver) return;
    isPaused = !isPaused;
    if (isPaused) {
        pauseScreen.classList.remove('hidden');
        pauseBtn.textContent = 'RESUME';
    } else {
        pauseScreen.classList.add('hidden');
        pauseBtn.textContent = 'PAUSE';
    }
}

pauseBtn.addEventListener('click', () => {
    pauseBtn.blur();
    togglePause();
});

restartBtn.addEventListener('click', () => {
    resetGame();
});

function updateUI() {
    scoreElement.textContent = score;
    levelElement.textContent = level;
    linesElement.textContent = lines;
    dropInterval = Math.max(100, 1000 - (level - 1) * 100);
}

function createPiece() {
    const type = Math.floor(Math.random() * 7) + 1;
    return {
        x: 0,
        y: 0,
        shape: JSON.parse(JSON.stringify(SHAPES[type])),
        type: type
    };
}

function spawnPiece() {
    if (!nextPiece) {
        nextPiece = createPiece();
    }
    currentPiece = nextPiece;
    currentPiece.x = Math.floor(COLS / 2) - Math.floor(currentPiece.shape[0].length / 2);
    currentPiece.y = 0;
    
    nextPiece = createPiece();
    drawNext();
    canHold = true;
    
    if (collide(board, currentPiece)) {
        gameOver();
    }
}

function hold() {
    if (!canHold) return;
    
    if (holdPiece === null) {
        holdPiece = {
            shape: JSON.parse(JSON.stringify(SHAPES[currentPiece.type])),
            type: currentPiece.type
        };
        spawnPiece();
    } else {
        const temp = {
            shape: JSON.parse(JSON.stringify(SHAPES[currentPiece.type])),
            type: currentPiece.type
        };
        currentPiece = {
            ...holdPiece,
            x: Math.floor(COLS / 2) - Math.floor(holdPiece.shape[0].length / 2),
            y: 0
        };
        holdPiece = temp;
    }
    drawHold();
    canHold = false;
    dropCounter = 0;
}

function gameOver() {
    isGameOver = true;
    cancelAnimationFrame(requestAnimationId);
    finalScoreElement.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

function resetGame() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 1000;
    isGameOver = false;
    isPaused = false;
    holdPiece = null;
    nextPiece = null;
    canHold = true;
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    pauseBtn.textContent = 'PAUSE';
    
    updateUI();
    drawHold();
    spawnPiece();
    
    lastTime = performance.now();
    dropCounter = 0;
    if (requestAnimationId) cancelAnimationFrame(requestAnimationId);
    requestAnimationId = requestAnimationFrame(update);
}

function collide(b, p) {
    const m = p.shape;
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
               (b[y + p.y] && b[y + p.y][x + p.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(b, p) {
    p.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                b[y + p.y][x + p.x] = value;
            }
        });
    });
}

function sweep() {
    let linesCleared = 0;
    outer: for (let y = board.length - 1; y >= 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y; 
        linesCleared++;
    }
    
    if (linesCleared > 0) {
        const lineScores = [0, 100, 300, 500, 800];
        score += lineScores[linesCleared] * level;
        lines += linesCleared;
        level = Math.floor(lines / 10) + 1;
        updateUI();
    }
}

function getGhostPiece() {
    const ghost = { ...currentPiece, shape: currentPiece.shape };
    while (!collide(board, ghost)) {
        ghost.y++;
    }
    ghost.y--;
    return ghost;
}

function drawBlock(context, x, y, colorIndex) {
    context.fillStyle = COLORS[colorIndex];
    context.fillRect(x, y, 1, 1);
    
    context.fillStyle = 'rgba(255,255,255,0.3)';
    context.fillRect(x, y, 1, 0.1);
    context.fillRect(x, y, 0.1, 1);
    
    context.fillStyle = 'rgba(0,0,0,0.4)';
    context.fillRect(x, y + 0.9, 1, 0.1);
    context.fillRect(x + 0.9, y, 0.1, 1);
}

function drawNext() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (nextPiece) {
        const offsetX = (4 - nextPiece.shape[0].length) / 2;
        const offsetY = (4 - nextPiece.shape.length) / 2 + 1; 
        nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(nextCtx, offsetX + x, offsetY + y, value);
                }
            });
        });
    }
}

function drawHold() {
    holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (holdPiece) {
        const offsetX = (4 - holdPiece.shape[0].length) / 2;
        const offsetY = (4 - holdPiece.shape.length) / 2;
        holdPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(holdCtx, offsetX + x, offsetY + y, value);
                }
            });
        });
    }
}

function draw() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(0, 0, COLS, ROWS);
    
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
    ctx.lineWidth = 0.05;
    for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r); ctx.lineTo(COLS, r); ctx.stroke(); }
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c, 0); ctx.lineTo(c, ROWS); ctx.stroke(); }

    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawBlock(ctx, x, y, value);
            }
        });
    });

    if (currentPiece) {
        // ゴーストブロック描画
        const ghost = getGhostPiece();
        ctx.globalAlpha = 0.2;
        ghost.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(ctx, ghost.x + x, ghost.y + y, value);
                }
            });
        });
        ctx.globalAlpha = 1.0;

        // 現在のブロック描画
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(ctx, currentPiece.x + x, currentPiece.y + y, value);
                }
            });
        });
    }
}

function update(time = performance.now()) {
    if (isGameOver) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;

    if (!isPaused) {
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            moveDown();
        }
        draw();
    }
    requestAnimationId = requestAnimationFrame(update);
}

function moveDown() {
    currentPiece.y++;
    if (collide(board, currentPiece)) {
        currentPiece.y--;
        merge(board, currentPiece);
        sweep();
        spawnPiece();
    }
    dropCounter = 0;
}

function moveLeft() {
    currentPiece.x--;
    if (collide(board, currentPiece)) {
        currentPiece.x++;
    }
}

function moveRight() {
    currentPiece.x++;
    if (collide(board, currentPiece)) {
        currentPiece.x--;
    }
}

function hardDrop() {
    score += getGhostPiece().y - currentPiece.y; // ハードドロップボーナス
    currentPiece = getGhostPiece();
    merge(board, currentPiece);
    sweep();
    spawnPiece();
    dropCounter = 0;
    updateUI();
}

function rotate() {
    const pos = currentPiece.x;
    let offset = 1;
    const rotatedShape = currentPiece.shape[0].map((val, index) => 
        currentPiece.shape.map(row => row[index]).reverse()
    );
    const previousShape = currentPiece.shape;
    currentPiece.shape = rotatedShape;
    
    while (collide(board, currentPiece)) {
        currentPiece.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (Math.abs(offset) > currentPiece.shape[0].length) {
            currentPiece.shape = previousShape;
            currentPiece.x = pos;
            return;
        }
    }
}

document.addEventListener('keydown', event => {
    if (isGameOver) return;
    
    if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
        togglePause();
        return;
    }

    if (isPaused) return;
    
    switch(event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            moveLeft();
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            moveRight();
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            moveDown();
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
            rotate();
            break;
        case ' ':
            hardDrop();
            break;
        case 'Shift':
        case 'c':
        case 'C':
            hold();
            break;
    }
});

// ゲーム開始
resetGame();

// --- Mobile Controls Logic ---
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnDown = document.getElementById('btn-down');
const btnRotate = document.getElementById('btn-rotate');
const btnDrop = document.getElementById('btn-drop');
const btnHold = document.getElementById('btn-hold');

let moveInterval = null;
let moveTimeout = null;

function startMove(action) {
    if (isGameOver || isPaused) return;
    action();
    // 最初の押し込みから連続移動開始までのディレイ
    moveTimeout = setTimeout(() => {
        moveInterval = setInterval(() => {
            if (!isGameOver && !isPaused) action();
        }, 100); // 連続移動の速度
    }, 200);
}

function stopMove() {
    clearTimeout(moveTimeout);
    clearInterval(moveInterval);
}

const addTouchEvents = (btn, action, continuous = false) => {
    if (!btn) return;
    
    const handleStart = (e) => {
        e.preventDefault();
        if (continuous) {
            startMove(action);
        } else {
            if (!isGameOver && !isPaused) action();
        }
        btn.classList.add('active');
    };

    const handleEnd = (e) => {
        e.preventDefault();
        if (continuous) stopMove();
        btn.classList.remove('active');
    };

    // Touch events for mobile
    btn.addEventListener('touchstart', handleStart, { passive: false });
    btn.addEventListener('touchend', handleEnd, { passive: false });
    btn.addEventListener('touchcancel', handleEnd, { passive: false });

    // Mouse events for desktop fallback
    btn.addEventListener('mousedown', handleStart);
    btn.addEventListener('mouseup', handleEnd);
    btn.addEventListener('mouseleave', handleEnd);
};

addTouchEvents(btnLeft, moveLeft, true);
addTouchEvents(btnRight, moveRight, true);
addTouchEvents(btnDown, moveDown, true);
addTouchEvents(btnRotate, rotate, false);
addTouchEvents(btnDrop, hardDrop, false);
addTouchEvents(btnHold, hold, false);
