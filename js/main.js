import { CANVAS_W, CANVAS_H, CORRECT_ANSWERS_TO_WIN, LOG_PER_PAGE, SCORE_BASE, BOSS_SCORE_MULTIPLIER, TWEEN_MOVE_MS, TWEEN_TURN_MS, TWEEN_MOVE_PX, TWEEN_TURN_PX, FLYING_KEY_MS, FLYING_KEY_GLOW_MS, FLYING_KEY_SCALE, MINIMAP_SIZE, MINIMAP_MARGIN } from './config.js';
import { GameMap } from './map.js';
import { Player } from './player.js';
import { EnemyManager } from './enemy.js';
import { Renderer } from './renderer.js';
import { CombatSystem } from './combat.js';
import { QuestionLoader } from './questionLoader.js';
import { InputHandler } from './input.js';
import { UI } from './ui.js';
import { StatsManager } from './stats.js';
import { TextureLoader } from './textureLoader.js';
import { t } from './i18n.js';

// ── Game states ────────────────────────────────────────────────────

const STATE_MENU         = 'MENU';
const STATE_EXPLORING    = 'EXPLORING';
const STATE_COMBAT       = 'COMBAT';
const STATE_BOSS_COMBAT  = 'BOSS_COMBAT';
const STATE_VICTORY      = 'VICTORY';
const STATE_GAME_OVER    = 'GAME_OVER';
const STATE_LOG          = 'LOG';
const STATE_LEADERBOARD  = 'LEADERBOARD';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.canvas.width = CANVAS_W;
        this.canvas.height = CANVAS_H;

        this.renderer = new Renderer(this.canvas);
        this.textureLoader = new TextureLoader();
        this.renderer.setTextureLoader(this.textureLoader);
        this.combat = new CombatSystem();
        this.questionLoader = new QuestionLoader();
        this.input = new InputHandler();
        this.ui = new UI(this.canvas);
        this.stats = new StatsManager();

        this.state = STATE_MENU;
        this.map = null;
        this.player = null;
        this.enemies = null;
        this.visited = null;   // fog of war
        this.currentLevel = 1;
        this.correctAnswers = 0;
        this.timedMode = false;
        this.subjects = [];
        this.selectedSubject = 0;

        // Log pagination
        this.logPage = 0;

        // Animation state
        this.flashType = null;   // 'damage' | 'correct'
        this.flashAlpha = 0;
        this._lastTime = 0;

        // Screen shake
        this.shakeTime = 0;
        this.shakeIntensity = 0;

        // Movement/turn tween
        this.tween = null;  // { offsetX, offsetY, elapsed, duration }

        // Victory particles
        this.victoryParticles = [];

        // Flying key animation
        this.flyingKey = null;              // { elapsed, startX, startY }
        this.hudKeyGlow = 0;                // remaining glow ms
        this._pendingKeyIncrement = false;  // delay correctAnswers++ until arrival

        // Popup message
        this.popupMessage = null;           // { text, elapsed }
        this.popupDuration = 1500;          // ms to show

        // Enlarged minimap
        this.showBigMap = false;

        // Canvas click/hover
        this.canvas.addEventListener('click', (e) => this._onClick(e));
        this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));

        // Touch support
        this._touchStartX = 0;
        this._touchStartY = 0;
        this._touchStartTime = 0;
        this.canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });

        this._animFrame = null;
    }

    async init() {
        // Fire-and-forget: textures load in background, procedural fallback until ready
        this.textureLoader.load().catch(err => console.warn('Texture loading failed:', err));

        this.subjects = await this.questionLoader.loadSubjectList();
        this.state = STATE_MENU;
        this._loop();
    }

    // ── Game loop ──────────────────────────────────────────────────────

    _loop(timestamp = 0) {
        const dt = Math.min(timestamp - this._lastTime, 50);
        this._lastTime = timestamp;

        this._update(dt, timestamp);
        this._render(dt, timestamp);
        this._animFrame = requestAnimationFrame((t) => this._loop(t));
    }

    _update(dt, timestamp) {
        // Fade flash overlay (time-based)
        if (this.flashAlpha > 0) {
            this.flashAlpha = Math.max(0, this.flashAlpha - dt * 0.002);
        }

        // Decay screen shake
        if (this.shakeTime > 0) {
            this.shakeTime = Math.max(0, this.shakeTime - dt);
        }

        // Advance movement/turn tween
        if (this.tween) {
            this.tween.elapsed += dt;
            if (this.tween.elapsed >= this.tween.duration) this.tween = null;
        }

        // Flying key animation
        if (this.flyingKey) {
            this.flyingKey.elapsed += dt;
            if (this.flyingKey.elapsed >= FLYING_KEY_MS) {
                this.flyingKey = null;
                this.correctAnswers++;
                this._pendingKeyIncrement = false;
                this.hudKeyGlow = FLYING_KEY_GLOW_MS;
            }
        }
        if (this.hudKeyGlow > 0) {
            this.hudKeyGlow = Math.max(0, this.hudKeyGlow - dt);
        }

        // Popup message decay
        if (this.popupMessage) {
            this.popupMessage.elapsed += dt;
            if (this.popupMessage.elapsed >= this.popupDuration) {
                this.popupMessage = null;
            }
        }

        switch (this.state) {
            case STATE_MENU:
                this._updateMenu();
                break;
            case STATE_EXPLORING:
                this._updateExploring();
                break;
            case STATE_COMBAT:
                this._updateCombat();
                break;
            case STATE_BOSS_COMBAT:
                this._updateBossCombat();
                break;
            case STATE_VICTORY:
            case STATE_GAME_OVER:
                this._updateEndScreen();
                break;
            case STATE_LOG:
                this._updateLog();
                break;
            case STATE_LEADERBOARD:
                this._updateLeaderboard();
                break;
        }
    }

    _render(dt, timestamp) {
        const ctx = this.canvas.getContext('2d');

        switch (this.state) {
            case STATE_MENU:
                this.ui.renderMenu(this.subjects, this.selectedSubject, this.timedMode);
                break;

            case STATE_EXPLORING: {
                // Accumulate offsets from shake + tween
                const shaking = this.shakeTime > 0;
                let ox = 0, oy = 0;

                if (shaking) {
                    const progress = this.shakeTime / 200;
                    const magnitude = this.shakeIntensity * progress;
                    ox += Math.sin(timestamp * 0.05) * magnitude;
                    oy += Math.cos(timestamp * 0.07) * magnitude * 0.6;
                }

                if (this.tween) {
                    const t = Math.min(this.tween.elapsed / this.tween.duration, 1);
                    const eased = 1 - (1 - t) * (1 - t); // ease-out quadratic
                    ox += this.tween.offsetX * (1 - eased);
                    oy += this.tween.offsetY * (1 - eased);
                }

                const needsTransform = shaking || this.tween;
                if (needsTransform) { ctx.save(); ctx.translate(ox, oy); }

                this.renderer.renderDungeon(this.map, this.player, this.enemies, this.visited, timestamp, this.currentLevel);
                this.ui.renderHUD(
                    this.player, this.correctAnswers, this.currentLevel,
                    this.questionLoader.getSubjectName(),
                    this.map.name,
                    this.stats.currentScore,
                    this.stats.currentStreak,
                    this.questionLoader.getLanguage()
                );

                if (needsTransform) { ctx.restore(); }

                // Flying key overlay (not affected by shake/tween)
                this._renderFlyingKey(ctx);
                if (this.hudKeyGlow > 0) {
                    const glowAlpha = 0.8 * (this.hudKeyGlow / FLYING_KEY_GLOW_MS);
                    this.ui.drawKeyIconScaled(ctx, 118, CANVAS_H - 24, 1.0, glowAlpha);
                }

                // Popup message
                if (this.popupMessage) {
                    this._renderPopup(ctx);
                }

                // Big minimap overlay
                if (this.showBigMap) {
                    this.renderer.renderBigMap(ctx, this.map, this.player, this.enemies, this.visited);
                }
                break;
            }

            case STATE_COMBAT:
            case STATE_BOSS_COMBAT:
                this.renderer.renderDungeon(this.map, this.player, this.enemies, this.visited, timestamp, this.currentLevel);
                this.combat.render(ctx);
                break;

            case STATE_VICTORY:
                this._updateVictoryParticles(dt, timestamp);
                this.ui.renderVictory(
                    this.currentLevel,
                    this.currentLevel >= Math.min(GameMap.totalLevels(), this.questionLoader.maxLevel()),
                    this.stats.currentScore,
                    this.victoryParticles,
                    timestamp,
                    this.questionLoader.getLanguage()
                );
                break;

            case STATE_GAME_OVER:
                this.ui.renderGameOver(this.correctAnswers, this.stats.currentScore, this.questionLoader.getLanguage());
                break;

            case STATE_LOG: {
                const subId = this.subjects[this.selectedSubject].id;
                const log = this.stats.getLog(subId);
                const totalPages = Math.max(1, Math.ceil(log.length / LOG_PER_PAGE));
                this.ui.renderLog(
                    log,
                    this.subjects[this.selectedSubject].name,
                    this.logPage,
                    totalPages,
                    this.questionLoader.getLanguage()
                );
                break;
            }

            case STATE_LEADERBOARD: {
                const subId = this.subjects[this.selectedSubject].id;
                this.ui.renderLeaderboard(
                    this.stats.getLeaderboard(subId),
                    this.stats.getStats(subId),
                    this.subjects[this.selectedSubject].name,
                    this.questionLoader.getLanguage()
                );
                break;
            }
        }

        // Flash overlay (on top of everything)
        if (this.flashAlpha > 0) {
            if (this.flashType === 'damage') {
                this.renderer.drawDamageFlash(this.flashAlpha);
            } else if (this.flashType === 'correct') {
                this.renderer.drawCorrectFlash(this.flashAlpha);
            }
        }
    }

    // ── State: MENU ────────────────────────────────────────────────────

    _updateMenu() {
        let action = this.input.poll();
        while (action) {
            if (action === 'FORWARD') {
                this.selectedSubject = Math.max(0, this.selectedSubject - 1);
            } else if (action === 'BACKWARD') {
                this.selectedSubject = Math.min(this.subjects.length - 1, this.selectedSubject + 1);
            } else if (action === 'CONFIRM') {
                this._startGame();
                return;
            } else if (action === 'LOG') {
                this.logPage = 0;
                this.state = STATE_LOG;
                this.input.flush();
                return;
            } else if (action === 'LEADERBOARD') {
                this.state = STATE_LEADERBOARD;
                this.input.flush();
                return;
            } else if (action === 'TOGGLE_TIMER') {
                this.timedMode = !this.timedMode;
            }
            action = this.input.poll();
        }
    }

    async _startGame() {
        try {
            await this.questionLoader.loadSubject(this.subjects[this.selectedSubject].id);
        } catch (err) {
            console.error('Failed to load questions:', err);
            return;
        }
        this.currentLevel = 1;
        this.correctAnswers = 0;
        this.stats.startSession(this.subjects[this.selectedSubject].id);
        this._initLevel();
    }

    _initLevel() {
        this.map = new GameMap(this.currentLevel - 1); // 0-indexed
        const sp = this.map.startPos;
        this.player = new Player(sp.x, sp.y, sp.facing);
        this.enemies = new EnemyManager(this.map.enemyPositions, this.map.bossPos);
        this.correctAnswers = 0;
        this.flyingKey = null;
        this.hudKeyGlow = 0;
        this._pendingKeyIncrement = false;
        this.popupMessage = null;
        this.showBigMap = false;

        // Fog of war
        this.visited = Array.from({ length: this.map.height }, () =>
            new Array(this.map.width).fill(false)
        );
        this._revealAround(sp.x, sp.y);

        this.state = STATE_EXPLORING;
        this.input.flush();
    }

    _revealAround(x, y) {
        // Reveal a 3x3 area around the position
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.map.width && ny >= 0 && ny < this.map.height) {
                    this.visited[ny][nx] = true;
                }
            }
        }
    }

    // ── State: EXPLORING ───────────────────────────────────────────────

    _startTween(offsetX, offsetY, duration) {
        this.tween = { offsetX, offsetY, elapsed: 0, duration };
    }

    _updateExploring() {
        if (this.tween) return; // block input during tween

        const action = this.input.poll();
        if (!action) return;

        // Big minimap — any input dismisses, or M toggles
        if (this.showBigMap) {
            this.showBigMap = false;
            this.input.flush();
            return;
        }
        if (action === 'MINIMAP') {
            this.showBigMap = true;
            return;
        }

        if (action === 'FORWARD') {
            const pos = this.player.getForwardPos();

            // Boss door check
            if (this.map.isBossDoor(pos.x, pos.y)) {
                const lang = this.questionLoader.getLanguage();
                if (this.correctAnswers >= CORRECT_ANSWERS_TO_WIN) {
                    this.map.openBossDoor();
                    this.flashType = 'correct';
                    this.flashAlpha = 0.3;
                    this.popupMessage = { text: t('door.opened', lang), elapsed: 0 };
                } else {
                    this.popupMessage = { text: t('door.locked', lang), elapsed: 0 };
                }
                return;
            }

            if (this.map.isWall(pos.x, pos.y)) return;

            const enemy = this.enemies.getAt(pos.x, pos.y);
            if (enemy) {
                if (enemy.isBoss) {
                    this._startBossCombat(enemy);
                } else {
                    this._startCombat(enemy);
                }
                return;
            }

            // Stairs check — move onto them, then handle
            if (this.map.isStairs(pos.x, pos.y)) {
                this.player.moveForward();
                this._revealAround(this.player.x, this.player.y);
                this._handleStairs();
                return;
            }

            this.player.moveForward();
            this._revealAround(this.player.x, this.player.y);
            this._startTween(0, TWEEN_MOVE_PX, TWEEN_MOVE_MS);

        } else if (action === 'BACKWARD') {
            const pos = this.player.getBackwardPos();
            if (this.map.isWall(pos.x, pos.y)) return;
            if (this.enemies.getAt(pos.x, pos.y)) return; // can't back into enemy

            if (this.map.isStairs(pos.x, pos.y)) {
                this.player.moveBackward();
                this._revealAround(this.player.x, this.player.y);
                this._handleStairs();
                return;
            }

            this.player.moveBackward();
            this._revealAround(this.player.x, this.player.y);
            this._startTween(0, -TWEEN_MOVE_PX, TWEEN_MOVE_MS);

        } else if (action === 'TURN_LEFT') {
            this.player.turnLeft();
            this._startTween(TWEEN_TURN_PX, 0, TWEEN_TURN_MS);

        } else if (action === 'TURN_RIGHT') {
            this.player.turnRight();
            this._startTween(-TWEEN_TURN_PX, 0, TWEEN_TURN_MS);

        } else if (action === 'DEBUG_LEVEL1' || action === 'DEBUG_LEVEL2' || action === 'DEBUG_LEVEL3') {
            const target = action === 'DEBUG_LEVEL1' ? 1 : action === 'DEBUG_LEVEL2' ? 2 : 3;
            if (this.questionLoader.hasLevel(target)) {
                this.currentLevel = target;
                this._initLevel();
                console.log(`Debug: skipped to level ${target}`);
            }

        } else if (action === 'ESCAPE') {
            this.tween = null;
            this.state = STATE_MENU;
            this.input.flush();
        }
    }

    // ── State: COMBAT ──────────────────────────────────────────────────

    _startCombat(enemy) {
        this.tween = null;
        const question = this.questionLoader.getQuestion(this.currentLevel);
        if (!question) {
            console.error('No questions available!');
            return;
        }
        this.combat.start(question, enemy, this.currentLevel, this.timedMode, this.questionLoader.getLanguage());
        this.state = STATE_COMBAT;
        this.input.flush();
    }

    _updateCombat() {
        // Check for keyboard input
        const action = this.input.poll();
        if (action) {
            if (this.combat.result !== null) {
                // Any key dismisses the result screen
                this.combat.dismiss();
            } else if (action.startsWith('ANSWER_')) {
                const idx = parseInt(action.split('_')[1]);
                this.combat.selectAnswer(idx);
            }
        }

        // Check if result display is done (timeout or dismissed)
        const result = this.combat.update();
        if (result) {
            this._resolveCombat(result);
        }
    }

    _resolveCombat(result) {
        if (result === 'correct') {
            this.enemies.kill(this.combat.enemy);
            this._pendingKeyIncrement = true;
            this._startFlyingKey();
            this.flashType = 'correct';
            this.flashAlpha = 0.35;
            this.stats.recordAnswer(true, this.currentLevel);
        } else {
            this.stats.recordAnswer(false, this.currentLevel);
            this.stats.logWrongAnswer(this.combat.question, this.combat.selectedAnswer);

            const dead = this.player.takeDamage();
            this.flashType = 'damage';
            this.flashAlpha = 0.5;
            this.shakeTime = 200;
            this.shakeIntensity = 6;

            if (dead) {
                this.stats.endSession(this.currentLevel - 1);
                this.state = STATE_GAME_OVER;
                this.input.flush();
                return;
            }
        }
        this.state = STATE_EXPLORING;
        this.input.flush();
    }

    // ── State: BOSS_COMBAT ──────────────────────────────────────────────

    _startBossCombat(enemy) {
        this.tween = null;
        const bossCase = this.questionLoader.getBossCase(this.currentLevel);
        if (!bossCase) {
            console.error('No boss case available for level', this.currentLevel);
            return;
        }
        this.combat.startBoss(bossCase, enemy, this.currentLevel, this.timedMode, this.questionLoader.getLanguage());
        this.state = STATE_BOSS_COMBAT;
        this.input.flush();
    }

    _updateBossCombat() {
        const action = this.input.poll();
        if (action) {
            if (this.combat.showingCaseIntro) {
                this.combat.dismissIntro();
            } else if (this.combat.result !== null) {
                this.combat.dismiss();
            } else if (action.startsWith('ANSWER_')) {
                const idx = parseInt(action.split('_')[1]);
                this.combat.selectAnswer(idx);
            }
        }

        const result = this.combat.update();
        if (result) {
            this._resolveBossCombat(result);
        }
    }

    _resolveBossCombat(result) {
        if (result === 'boss_defeated') {
            this.enemies.kill(this.combat.enemy);
            this.map.revealStairs();
            this.flashType = 'correct';
            this.flashAlpha = 0.5;
            // Bonus score for boss
            const bonus = SCORE_BASE * this.currentLevel * BOSS_SCORE_MULTIPLIER;
            this.stats.addScore(bonus);
            this.state = STATE_EXPLORING;
            this.input.flush();
        } else if (result === 'boss_failed') {
            this.stats.logWrongAnswer(this.combat.question, this.combat.selectedAnswer);

            const dead = this.player.takeDamage();
            this.flashType = 'damage';
            this.flashAlpha = 0.5;
            this.shakeTime = 300;
            this.shakeIntensity = 8;

            if (dead) {
                this.stats.endSession(this.currentLevel - 1);
                this.state = STATE_GAME_OVER;
                this.input.flush();
                return;
            }
            this.state = STATE_EXPLORING;
            this.input.flush();
        }
    }

    _handleStairs() {
        this.tween = null;
        this.stats.endSession(this.currentLevel);
        this._initVictoryParticles();
        this.state = STATE_VICTORY;
        this.input.flush();
    }

    // ── Flying key animation ──────────────────────────────────────────

    _startFlyingKey() {
        // If a previous key is still in flight, resolve it immediately
        if (this.flyingKey && this._pendingKeyIncrement) {
            this.correctAnswers++;
            this._pendingKeyIncrement = false;
        }
        this.flyingKey = { elapsed: 0, startX: CANVAS_W / 2, startY: 220 };
        this._pendingKeyIncrement = true;
    }

    _renderFlyingKey(ctx) {
        if (!this.flyingKey) return;
        const t = this.flyingKey.elapsed / FLYING_KEY_MS;
        const eased = 1 - (1 - t) * (1 - t); // ease-out quadratic

        const endX = 118, endY = CANVAS_H - 24;
        const x = this.flyingKey.startX + (endX - this.flyingKey.startX) * eased;
        const y = this.flyingKey.startY + (endY - this.flyingKey.startY) * eased;
        const scale = FLYING_KEY_SCALE + (1.0 - FLYING_KEY_SCALE) * eased;
        const trailAlpha = 0.6 * (1 - t);

        this.ui.drawKeyIconScaled(ctx, x, y, scale, trailAlpha);
    }

    // ── Popup message ─────────────────────────────────────────────────

    _renderPopup(ctx) {
        const msg = this.popupMessage;
        const alpha = Math.min(1, 1 - (msg.elapsed - this.popupDuration * 0.6) / (this.popupDuration * 0.4));
        if (alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.font = 'bold 20px "Palatino Linotype", "Book Antiqua", Palatino, serif';
        ctx.textAlign = 'center';
        const tw = ctx.measureText(msg.text).width + 40;
        const bx = (CANVAS_W - tw) / 2;
        const by = CANVAS_H / 2 - 40;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(bx, by, tw, 40);
        ctx.strokeStyle = '#4a4a6a';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, tw, 40);
        ctx.fillStyle = '#e8e0d0';
        ctx.fillText(msg.text, CANVAS_W / 2, by + 27);
        ctx.restore();
    }

    // ── State: VICTORY / GAME_OVER ─────────────────────────────────────

    _updateEndScreen() {
        const action = this.input.poll();
        if (action === 'CONFIRM') {
            if (this.state === STATE_VICTORY) {
                const maxLvl = Math.min(GameMap.totalLevels(), this.questionLoader.maxLevel());
                if (this.currentLevel < maxLvl) {
                    this.currentLevel++;
                    this._initLevel();
                } else {
                    this.state = STATE_MENU;
                }
            } else {
                this.state = STATE_MENU;
            }
            this.input.flush();
        }
    }

    // ── State: LOG ──────────────────────────────────────────────────────

    _updateLog() {
        let action = this.input.poll();
        while (action) {
            if (action === 'ESCAPE' || action === 'BACK') {
                this.state = STATE_MENU;
                this.input.flush();
                return;
            } else if (action === 'TURN_LEFT') {
                this.logPage = Math.max(0, this.logPage - 1);
            } else if (action === 'TURN_RIGHT') {
                const subId = this.subjects[this.selectedSubject].id;
                const log = this.stats.getLog(subId);
                const totalPages = Math.max(1, Math.ceil(log.length / LOG_PER_PAGE));
                this.logPage = Math.min(totalPages - 1, this.logPage + 1);
            }
            action = this.input.poll();
        }
    }

    // ── State: LEADERBOARD ──────────────────────────────────────────────

    _updateLeaderboard() {
        let action = this.input.poll();
        while (action) {
            if (action === 'ESCAPE' || action === 'BACK') {
                this.state = STATE_MENU;
                this.input.flush();
                return;
            }
            action = this.input.poll();
        }
    }

    // ── Victory particles ─────────────────────────────────────────────

    _initVictoryParticles() {
        this.victoryParticles = [];
        for (let i = 0; i < 40; i++) {
            this.victoryParticles.push({
                x: Math.random() * CANVAS_W,
                y: Math.random() * CANVAS_H,
                vx: (Math.random() - 0.5) * 20,
                vy: -15 - Math.random() * 30,
                size: 2 + Math.random() * 4,
                alpha: 0.3 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2,
            });
        }
    }

    _updateVictoryParticles(dt, timestamp) {
        const s = dt / 1000;
        for (const p of this.victoryParticles) {
            p.x += p.vx * s + Math.sin(timestamp * 0.002 + p.phase) * 0.5;
            p.y += p.vy * s;
            // Wrap around
            if (p.y < -10) p.y = CANVAS_H + 10;
            if (p.x < -10) p.x = CANVAS_W + 10;
            if (p.x > CANVAS_W + 10) p.x = -10;
        }
    }

    // ── Mouse handling ─────────────────────────────────────────────────

    _canvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }

    _onClick(e) {
        const { x, y } = this._canvasCoords(e);
        this._handlePointer(x, y);
    }

    _onMouseMove(e) {
        if ((this.state === STATE_COMBAT || this.state === STATE_BOSS_COMBAT) && this.combat.active) {
            const { x, y } = this._canvasCoords(e);
            this.combat.updateHover(x, y);
        }
    }

    // ── Touch handling ─────────────────────────────────────────────────

    _canvasCoordsFromTouch(touch) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY,
        };
    }

    _onTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this._touchStartX = touch.clientX;
        this._touchStartY = touch.clientY;
        this._touchStartTime = Date.now();
    }

    _onTouchEnd(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const dx = touch.clientX - this._touchStartX;
        const dy = touch.clientY - this._touchStartY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const elapsed = Date.now() - this._touchStartTime;

        // Tap (short distance, short time) — treat like a click
        if (dist < 30 && elapsed < 400) {
            const coords = this._canvasCoordsFromTouch(touch);
            this._handlePointer(coords.x, coords.y);
            return;
        }

        // Swipe (only in EXPLORING state)
        if (this.state === STATE_EXPLORING && dist > 40) {
            if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal swipe
                this.input.push(dx > 0 ? 'TURN_RIGHT' : 'TURN_LEFT');
            } else {
                // Vertical swipe
                this.input.push(dy < 0 ? 'FORWARD' : 'BACKWARD');
            }
        }
    }

    // Shared logic for click and tap
    _handlePointer(x, y) {
        if (this.state === STATE_MENU) {
            const result = this.ui.getMenuClickedAction(x, y, this.subjects);
            if (!result) return;

            if (result.type === 'subject') {
                this.selectedSubject = result.index;
            } else if (result.type === 'start') {
                this._startGame();
            } else if (result.type === 'log') {
                this.logPage = 0;
                this.state = STATE_LOG;
                this.input.flush();
            } else if (result.type === 'leaderboard') {
                this.state = STATE_LEADERBOARD;
                this.input.flush();
            } else if (result.type === 'timer') {
                this.timedMode = !this.timedMode;
            }

        } else if (this.state === STATE_EXPLORING) {
            // Big map dismiss on click/tap
            if (this.showBigMap) {
                this.showBigMap = false;
                return;
            }
            // Click on minimap area to enlarge
            const mmX = CANVAS_W - MINIMAP_SIZE - MINIMAP_MARGIN - 3;
            const mmY = MINIMAP_MARGIN - 3;
            const mmS = MINIMAP_SIZE + 6;
            if (x >= mmX && x <= mmX + mmS && y >= mmY && y <= mmY + mmS) {
                this.showBigMap = true;
            }

        } else if (this.state === STATE_COMBAT && this.combat.active) {
            if (this.combat.result !== null) {
                this.combat.dismiss();
            } else {
                const ansIdx = this.combat.getClickedAnswer(x, y);
                if (ansIdx >= 0) {
                    this.combat.selectAnswer(ansIdx);
                }
            }

        } else if (this.state === STATE_BOSS_COMBAT && this.combat.active) {
            if (this.combat.showingCaseIntro) {
                this.combat.dismissIntro();
            } else if (this.combat.result !== null) {
                this.combat.dismiss();
            } else {
                const ansIdx = this.combat.getClickedAnswer(x, y);
                if (ansIdx >= 0) {
                    this.combat.selectAnswer(ansIdx);
                }
            }

        } else if (this.state === STATE_VICTORY || this.state === STATE_GAME_OVER) {
            this.input.push('CONFIRM');

        } else if (this.state === STATE_LOG) {
            const subId = this.subjects[this.selectedSubject].id;
            const hasEntries = this.stats.getLog(subId).length > 0;
            const logAction = this.ui.getLogClickedAction(x, y, hasEntries);
            if (logAction === 'prev') {
                this.logPage = Math.max(0, this.logPage - 1);
            } else if (logAction === 'next') {
                const log = this.stats.getLog(subId);
                const totalPages = Math.max(1, Math.ceil(log.length / LOG_PER_PAGE));
                this.logPage = Math.min(totalPages - 1, this.logPage + 1);
            } else if (logAction === 'clear') {
                this.stats.clearLog(subId);
                this.logPage = 0;
            } else if (logAction === 'back') {
                this.state = STATE_MENU;
                this.input.flush();
            }

        } else if (this.state === STATE_LEADERBOARD) {
            const lbAction = this.ui.getLeaderboardClickedAction(x, y);
            if (lbAction === 'back') {
                this.state = STATE_MENU;
                this.input.flush();
            }
        }
    }
}

// ── Bootstrap ──────────────────────────────────────────────────────

const game = new Game();
game.init().catch(err => console.error('Game init failed:', err));
