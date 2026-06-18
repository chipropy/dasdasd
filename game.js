// =========================================================================
//              ASTEROIDS ULTRA - VERSIÓN MEJORADA Y PULIDA
// =========================================================================

// ======================== CONFIGURACIÓN GLOBAL ========================
const CONFIG = {
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 700,
    PLAYER_SIZE: 30,
    ENEMY_SIZE: 40,
    BULLET_SPEED: 8,
    PLAYER_SPEED: 0.3,
    FRICTION: 0.98,
    ROTATION_SPEED: 0.15,
};

// ======================== REFERENCIAS DEL DOM ========================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-value');
const livesDisplay = document.getElementById('lives-value');
const levelDisplay = document.getElementById('level-value');
const comboDisplay = document.getElementById('combo-display');
const gameWrapper = document.getElementById('game-wrapper');
const touchControlsDiv = document.getElementById('touch-controls');
const gameTitle = document.getElementById('game-title');
const pauseButton = document.getElementById('pause-button');

// Vistas principales
const mainMenu = document.getElementById('main-menu-view');
const editsMenu = document.getElementById('edits-view');
const videoPlayerView = document.getElementById('video-player-view');
const allViews = [mainMenu, editsMenu, videoPlayerView, gameWrapper];

// Botones de menú
const mainStartButton = document.getElementById('main-start-button');
const editsButton = document.getElementById('edits-button');
const backToMainMenuButton = document.getElementById('back-to-main-menu-button');
const backToEditsButton = document.getElementById('back-to-edits-button');
const videoItems = document.querySelectorAll('.video-item');
const videoPlayer = document.getElementById('edit-video-player');

// Ajustes y Dev Menu
const mainSettingsButton = document.getElementById('main-settings-button');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsButton = document.getElementById('close-settings-button');
const musicVolumeSlider = document.getElementById('music-volume-slider');
const sfxVolumeSlider = document.getElementById('sfx-volume-slider');
const musicVolumeLabel = document.getElementById('music-volume-label');
const sfxVolumeLabel = document.getElementById('sfx-volume-label');
const devMenu = document.getElementById('dev-menu');
const closeDevMenuButton = document.getElementById('close-dev-menu');

// Controles táctiles
const dpadUp = document.getElementById('dpad-up');
const dpadLeft = document.getElementById('dpad-left');
const dpadRight = document.getElementById('dpad-right');
const shootButton = document.getElementById('shoot-button');
const parryButton = document.getElementById('parry-button');

// Audio
const bgMusic = document.getElementById('bgMusic');
const shotSound = document.getElementById('shotSound');
const killSound = document.getElementById('killSound');

// ======================== VARIABLES DE ESTADO ========================
let gameRunning = false;
let isPaused = false;
let isGodMode = false;
let score = 0;
let lives = 3;
let level = 1;
let combo = 0;
let comboTimer = 0;
let animationFrameId = null;

let player = {
    x: CONFIG.CANVAS_WIDTH / 2,
    y: CONFIG.CANVAS_HEIGHT / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    width: CONFIG.PLAYER_SIZE,
    height: CONFIG.PLAYER_SIZE,
    shooting: false,
    shieldActive: false,
    shieldTimer: 0,
    invincible: false,
    invincibilityTimer: 0
};

let bullets = [];
let enemies = [];
let particles = [];
let screenShakeIntensity = 0;
let musicVolume = 0.7;
let sfxVolume = 0.5;

// Teclas presionadas
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false,
    ' ': false,
    'Shift': false
};

// ======================== SISTEMA DE PARTÍCULAS ========================
class Particle {
    constructor(x, y, vx, vy, color, life, size = 3) {
        this.x = x;
        this.y = y;
        this.vx = vx + (Math.random() - 0.5) * 0.5;
        this.vy = vy + (Math.random() - 0.5) * 0.5;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = size;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy *= 0.98;
        this.vx *= 0.98;
        this.life--;
        this.rotation += this.rotationSpeed;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    isAlive() {
        return this.life > 0;
    }
}

function createExplosion(x, y, count = 15, color = '#00ff88') {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 2 + Math.random() * 3;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        particles.push(new Particle(x, y, vx, vy, color, 20 + Math.random() * 15, 4));
    }
}

function createTrail(x, y, vx, vy, color = '#00ff88', count = 3) {
    for (let i = 0; i < count; i++) {
        const vel = (Math.random() - 0.5) * 0.5;
        particles.push(new Particle(x, y, -vx * 0.3, -vy * 0.3, color, 10 + Math.random() * 10, 2));
    }
}

// ======================== EFECTOS DE PANTALLA ========================
function triggerScreenShake(intensity = 5, duration = 10) {
    screenShakeIntensity = Math.max(screenShakeIntensity, intensity);
}

function drawScreenShake() {
    if (screenShakeIntensity > 0) {
        const offsetX = (Math.random() - 0.5) * screenShakeIntensity;
        const offsetY = (Math.random() - 0.5) * screenShakeIntensity;
        ctx.translate(offsetX, offsetY);
        screenShakeIntensity *= 0.95;
    }
}

// ======================== SISTEMA DE JUGADOR ========================
function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // Cuerpo principal
    ctx.fillStyle = player.shieldActive ? '#00ffff' : '#00ff88';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-10, -12);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fill();

    // Glow
    if (!player.invincible || (Math.floor(player.invincibilityTimer / 5) % 2 === 0)) {
        ctx.strokeStyle = player.shieldActive ? '#00ffff' : '#00ff88';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
    }

    // Escudo
    if (player.shieldActive) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, 35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

function movePlayer() {
    const moving = keys.ArrowUp || keys.w;
    
    if (moving) {
        player.vx += Math.cos(player.angle) * CONFIG.PLAYER_SPEED;
        player.vy += Math.sin(player.angle) * CONFIG.PLAYER_SPEED;
        createTrail(player.x, player.y, player.vx, player.vy);
    }

    if (keys.ArrowLeft || keys.a) {
        player.angle -= CONFIG.ROTATION_SPEED;
    }
    if (keys.ArrowRight || keys.d) {
        player.angle += CONFIG.ROTATION_SPEED;
    }

    // Aplicar fricción
    player.vx *= CONFIG.FRICTION;
    player.vy *= CONFIG.FRICTION;

    // Movimiento
    player.x += player.vx;
    player.y += player.vy;

    // Límites del canvas
    const margin = 30;
    if (player.x < margin) player.x = CONFIG.CANVAS_WIDTH - margin;
    if (player.x > CONFIG.CANVAS_WIDTH - margin) player.x = margin;
    if (player.y < margin) player.y = CONFIG.CANVAS_HEIGHT - margin;
    if (player.y > CONFIG.CANVAS_HEIGHT - margin) player.y = margin;

    // Actualizar escudo
    if (player.shieldActive) {
        player.shieldTimer--;
        if (player.shieldTimer <= 0) {
            player.shieldActive = false;
        }
    }

    // Invincibilidad parpadeante
    if (player.invincible) {
        player.invincibilityTimer--;
        if (player.invincibilityTimer <= 0) {
            player.invincible = false;
        }
    }
}

// ======================== SISTEMA DE DISPARO ========================
function shoot() {
    if (!gameRunning || isPaused) return;

    const bulletSpeed = CONFIG.BULLET_SPEED;
    const bullet = {
        x: player.x + Math.cos(player.angle) * 20,
        y: player.y + Math.sin(player.angle) * 20,
        vx: Math.cos(player.angle) * bulletSpeed + player.vx * 0.5,
        vy: Math.sin(player.angle) * bulletSpeed + player.vy * 0.5,
        life: 180,
        color: '#ffff00'
    };

    bullets.push(bullet);
    
    // Sonido
    playSound(shotSound);
    
    // Partículas
    createTrail(bullet.x, bullet.y, bullet.vx, bullet.vy, '#ffff00', 2);
    
    // Retroalimentación
    triggerScreenShake(2);
}

function updateBullets() {
    bullets = bullets.filter(b => {
        b.x += b.vx;
        b.y += b.vy;
        b.life--;

        // Dibujar
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Trail
        createTrail(b.x, b.y, b.vx, b.vy, b.color, 1);

        return b.life > 0 && b.x > 0 && b.x < CONFIG.CANVAS_WIDTH && b.y > 0 && b.y < CONFIG.CANVAS_HEIGHT;
    });
}

// ======================== SISTEMA DE ENEMIGOS ========================
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.size = CONFIG.ENEMY_SIZE;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.health = 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;

        // Rebote en límites
        const margin = this.size;
        if (this.x - margin < 0 || this.x + margin > CONFIG.CANVAS_WIDTH) this.vx *= -1;
        if (this.y - margin < 0 || this.y + margin > CONFIG.CANVAS_HEIGHT) this.vy *= -1;

        this.x = Math.max(margin, Math.min(CONFIG.CANVAS_WIDTH - margin, this.x));
        this.y = Math.max(margin, Math.min(CONFIG.CANVAS_HEIGHT - margin, this.y));
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Cuerpo
        ctx.fillStyle = '#ff6688';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            const x = Math.cos(angle) * this.size;
            const y = Math.sin(angle) * this.size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        // Glow
        ctx.strokeStyle = '#ff88aa';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    isHitBy(bullet) {
        const dx = this.x - bullet.x;
        const dy = this.y - bullet.y;
        return Math.sqrt(dx * dx + dy * dy) < this.size + 4;
    }
}

function spawnEnemies() {
    const spawnCount = Math.min(3 + level, 8);
    for (let i = 0; i < spawnCount; i++) {
        let x, y;
        do {
            x = Math.random() * CONFIG.CANVAS_WIDTH;
            y = Math.random() * CONFIG.CANVAS_HEIGHT;
        } while (Math.abs(x - player.x) < 150 && Math.abs(y - player.y) < 150);

        enemies.push(new Enemy(x, y));
    }
}

function updateEnemies() {
    enemies.forEach(enemy => {
        enemy.update();
        enemy.draw(ctx);
    });

    // Colisiones con balas
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (enemies[j].isHitBy(bullets[i])) {
                // Explosión
                createExplosion(enemies[j].x, enemies[j].y, 20, '#ff6688');
                playSound(killSound);

                // Puntuación
                score += 10 + combo * 5;
                combo++;
                comboTimer = 120;

                // Actualizar UI
                updateScoreAndLevel();

                // Vibración
                triggerScreenShake(5);

                // Remover
                enemies.splice(j, 1);
                bullets.splice(i, 1);
                break;
            }
        }
    }

    // Colisiones con el jugador
    enemies = enemies.filter(enemy => {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 40) {
            if (player.shieldActive) {
                // Rebote
                enemy.vx *= -1;
                enemy.vy *= -1;
                createExplosion(enemy.x, enemy.y, 10, '#00ffff');
                triggerScreenShake(3);
                return false; // Destruir enemigo
            } else if (!player.invincible) {
                // Daño
                lives--;
                player.invincible = true;
                player.invincibilityTimer = 120;
                createExplosion(player.x, player.y, 15, '#ff0088');
                triggerScreenShake(10);
                playSound(killSound);
                updateScoreAndLevel();

                if (lives <= 0) {
                    gameOver();
                }
                return false;
            }
        }
        return true;
    });
}

// ======================== SISTEMA DE ESCUDO ========================
function activateShield() {
    if (!gameRunning || isPaused || player.shieldActive) return;
    player.shieldActive = true;
    player.shieldTimer = 180;
    createExplosion(player.x, player.y, 20, '#00ffff');
    playSound(shotSound);
}

// ======================== AUDIO ========================
function playSound(sound) {
    if (!sound) return;
    try {
        sound.volume = sfxVolume;
        sound.currentTime = 0;
        const playPromise = sound.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => console.warn('Audio play rejected:', e));
        }
    } catch (e) {
        console.warn('Error playing sound:', e);
    }
}

function setMusicVolume(value, save = false) {
    musicVolume = value;
    bgMusic.volume = value;
    if (save) localStorage.setItem('musicVolume', value);
}

function setSfxVolume(value, save = false) {
    sfxVolume = value;
    if (save) localStorage.setItem('sfxVolume', value);
}

function loadSettings() {
    const savedMusicVolume = localStorage.getItem('musicVolume');
    const savedSfxVolume = localStorage.getItem('sfxVolume');

    if (savedMusicVolume) {
        musicVolumeSlider.value = savedMusicVolume * 100;
        musicVolumeLabel.textContent = Math.round(savedMusicVolume * 100);
        setMusicVolume(parseFloat(savedMusicVolume));
    }

    if (savedSfxVolume) {
        sfxVolumeSlider.value = savedSfxVolume * 100;
        sfxVolumeLabel.textContent = Math.round(savedSfxVolume * 100);
        setSfxVolume(parseFloat(savedSfxVolume));
    }
}

// ======================== CICLO PRINCIPAL DE JUEGO ========================
function updateScoreAndLevel() {
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    levelDisplay.textContent = level;

    // Mostrar combo
    if (combo > 1) {
        comboDisplay.textContent = 'x' + combo;
        comboDisplay.style.display = 'block';
        comboTimer--;
        if (comboTimer <= 0) {
            combo = 0;
            comboDisplay.style.display = 'none';
        }
    }

    // Subir nivel cada 100 puntos
    level = Math.floor(score / 100) + 1;
}

function gameLoop() {
    if (!gameRunning || isPaused) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }

    // Limpiar canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Malla de fondo
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CONFIG.CANVAS_WIDTH; i += 100) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, CONFIG.CANVAS_HEIGHT);
        ctx.stroke();
    }
    for (let i = 0; i <= CONFIG.CANVAS_HEIGHT; i += 100) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(CONFIG.CANVAS_WIDTH, i);
        ctx.stroke();
    }

    // Screen shake
    ctx.save();
    drawScreenShake();

    // Actualizar y dibujar
    movePlayer();
    updateBullets();
    updateEnemies();

    // Partículas
    particles = particles.filter(p => {
        p.update();
        p.draw(ctx);
        return p.isAlive();
    });

    // Jugador
    drawPlayer();

    ctx.restore();

    // Generar enemigos si no hay
    if (enemies.length === 0 && gameRunning && !isPaused) {
        spawnEnemies();
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

function startGame() {
    score = 0;
    lives = 3;
    level = 1;
    combo = 0;
    enemies = [];
    bullets = [];
    particles = [];
    gameRunning = true;
    isPaused = false;
    showView('game-wrapper');

    player.x = CONFIG.CANVAS_WIDTH / 2;
    player.y = CONFIG.CANVAS_HEIGHT / 2;
    player.vx = 0;
    player.vy = 0;
    player.invincible = true;
    player.invincibilityTimer = 120;
    player.shieldActive = false;

    updateScoreAndLevel();
    
    bgMusic.volume = musicVolume;
    bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.warn('Music play rejected:', e));

    pauseButton.style.display = 'flex';
    spawnEnemies();
    gameLoop();
}

function gameOver() {
    if (!gameRunning) return;
    gameRunning = false;
    bgMusic.pause();
    pauseButton.style.display = 'none';
    
    setTimeout(() => {
        showView('main-menu-view');
        mainStartButton.textContent = '► JUGAR DE NUEVO';
    }, 1000);
}

function togglePause(shouldPause = !isPaused) {
    if (!gameRunning) return;
    isPaused = shouldPause;
    if (isPaused) {
        bgMusic.pause();
    } else {
        bgMusic.play().catch(e => console.warn('Music play rejected:', e));
    }
}

function toggleDevMenu() {
    devMenu.style.display = devMenu.style.display === 'none' ? 'flex' : 'none';
}

// ======================== GESTIÓN DE VISTAS ========================
function showView(viewId) {
    allViews.forEach(view => view.style.display = 'none');
    
    const targetView = {
        'main-menu-view': mainMenu,
        'edits-view': editsMenu,
        'video-player-view': videoPlayerView,
        'game-wrapper': gameWrapper
    }[viewId];

    if (targetView) targetView.style.display = 'flex';
}

// ======================== EVENT LISTENERS ========================
function setupEventListeners() {
    // Teclas
    document.addEventListener('keydown', (e) => {
        if (e.key in keys) keys[e.key] = true;

        if (e.code === 'Space') {
            e.preventDefault();
            if (gameRunning && !isPaused) shoot();
        }
        if (e.key === 'Shift') {
            if (gameRunning && !isPaused) activateShield();
        }
        if (e.key === 'p' || e.key === 'P') {
            if (gameRunning) togglePause();
        }
        if (e.key === 'k' || e.key === 'K') {
            toggleDevMenu();
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key in keys) keys[e.key] = false;
    });

    // Botones de menú
    mainStartButton.addEventListener('click', startGame);
    editsButton.addEventListener('click', () => showView('edits-view'));
    mainSettingsButton.addEventListener('click', () => settingsModal.style.display = 'flex');
    closeSettingsButton.addEventListener('click', () => {
        settingsModal.style.display = 'none';
        if (gameRunning) togglePause(false);
    });
    backToMainMenuButton.addEventListener('click', () => showView('main-menu-view'));
    closeDevMenuButton.addEventListener('click', toggleDevMenu);
    pauseButton.addEventListener('click', togglePause);

    // Controles táctiles
    shootButton.addEventListener('mousedown', shoot);
    shootButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        shoot();
    });

    parryButton.addEventListener('mousedown', activateShield);
    parryButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        activateShield();
    });

    dpadUp.addEventListener('mousedown', () => keys.ArrowUp = true);
    dpadUp.addEventListener('mouseup', () => keys.ArrowUp = false);
    dpadUp.addEventListener('touchstart', (e) => { e.preventDefault(); keys.ArrowUp = true; });
    dpadUp.addEventListener('touchend', (e) => { e.preventDefault(); keys.ArrowUp = false; });

    dpadLeft.addEventListener('mousedown', () => keys.ArrowLeft = true);
    dpadLeft.addEventListener('mouseup', () => keys.ArrowLeft = false);
    dpadLeft.addEventListener('touchstart', (e) => { e.preventDefault(); keys.ArrowLeft = true; });
    dpadLeft.addEventListener('touchend', (e) => { e.preventDefault(); keys.ArrowLeft = false; });

    dpadRight.addEventListener('mousedown', () => keys.ArrowRight = true);
    dpadRight.addEventListener('mouseup', () => keys.ArrowRight = false);
    dpadRight.addEventListener('touchstart', (e) => { e.preventDefault(); keys.ArrowRight = true; });
    dpadRight.addEventListener('touchend', (e) => { e.preventDefault(); keys.ArrowRight = false; });

    // Slider de volumen
    musicVolumeSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        musicVolumeLabel.textContent = value;
        setMusicVolume(value / 100, true);
    });

    sfxVolumeSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        sfxVolumeLabel.textContent = value;
        setSfxVolume(value / 100, true);
    });

    // Videos
    videoItems.forEach(item => {
        item.addEventListener('click', () => {
            const videoSrc = item.getAttribute('data-video-src');
            videoPlayer.src = videoSrc;
            showView('video-player-view');
            videoPlayer.play();
        });
    });

    backToEditsButton.addEventListener('click', () => {
        videoPlayer.pause();
        videoPlayer.src = '';
        showView('edits-view');
    });

    // Dev Menu
    document.getElementById('dev-godmode').addEventListener('change', (e) => {
        isGodMode = e.target.checked;
        if (gameRunning) {
            player.invincible = isGodMode;
            player.invincibilityTimer = isGodMode ? 999999 : 0;
        }
    });

    document.getElementById('dev-apply-lives').addEventListener('click', () => {
        const newLives = parseInt(document.getElementById('dev-set-lives').value);
        if (!isNaN(newLives)) lives = newLives;
        updateScoreAndLevel();
    });

    document.getElementById('dev-apply-score').addEventListener('click', () => {
        const newScore = parseInt(document.getElementById('dev-set-score').value);
        if (!isNaN(newScore)) score = newScore;
        updateScoreAndLevel();
    });

    document.getElementById('dev-spawn-momo-1').addEventListener('click', () => {
        if (gameRunning) enemies.push(new Enemy(Math.random() * CONFIG.CANVAS_WIDTH, Math.random() * CONFIG.CANVAS_HEIGHT));
    });

    document.getElementById('dev-clear-enemies').addEventListener('click', () => {
        enemies = [];
        bullets = [];
    });

    document.getElementById('dev-game-over').addEventListener('click', gameOver);
    document.getElementById('dev-hit-player').addEventListener('click', () => {
        if (gameRunning && !player.invincible) {
            lives--;
            player.invincible = true;
            player.invincibilityTimer = 120;
            updateScoreAndLevel();
        }
    });

    document.getElementById('dev-next-level').addEventListener('click', () => {
        if (gameRunning) {
            score += 100;
            updateScoreAndLevel();
        }
    });

    document.getElementById('dev-spawn-powerup').addEventListener('click', () => {
        if (gameRunning) createExplosion(player.x + 100, player.y, 30, '#ffff00');
    });
}

// ======================== INICIALIZACIÓN ========================
window.addEventListener('load', () => {
    loadSettings();
    setupEventListeners();
    showView('main-menu-view');
    bgMusic.volume = musicVolume;
});
