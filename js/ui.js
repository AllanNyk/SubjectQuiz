import { CANVAS_W, CANVAS_H, PLAYER_MAX_HP, CORRECT_ANSWERS_TO_WIN, LOG_PER_PAGE, TIMER_PRESETS, LEVEL_DISPLAY_NAMES } from './config.js';
import { t } from './i18n.js';

const SERIF = '"Palatino Linotype", "Book Antiqua", Palatino, serif';

export class UI {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    // ── HUD (drawn during EXPLORING state) ─────────────────────────────

    renderHUD(player, correctAnswers, levelNum, subjectName, levelName, score, streak, lang = 'en', keysToWin = CORRECT_ANSWERS_TO_WIN) {
        const ctx = this.ctx;

        // Bottom bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, CANVAS_H - 40, CANVAS_W, 40);
        ctx.strokeStyle = '#4a4a6a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_H - 40);
        ctx.lineTo(CANVAS_W, CANVAS_H - 40);
        ctx.stroke();

        // Health hearts
        const heartY = CANVAS_H - 28;
        for (let i = 0; i < PLAYER_MAX_HP; i++) {
            const hx = 15 + i * 28;
            if (i < player.hp) {
                this._drawHeart(ctx, hx, heartY, 10, '#ff3344');
            } else {
                this._drawHeart(ctx, hx, heartY, 10, '#333');
            }
        }

        // Keys progress
        this.drawKeyIcon(ctx, 110, CANVAS_H - 24);
        const allKeys = correctAnswers >= keysToWin;
        ctx.fillStyle = allKeys ? '#cc9944' : '#cccc88';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${t('hud.keys', lang)} ${correctAnswers}/${keysToWin}`, 132, CANVAS_H - 18);

        // Level info
        ctx.fillStyle = '#8888bb';
        ctx.textAlign = 'center';
        ctx.fillText(`${t('hud.level', lang)} ${levelNum}`, CANVAS_W / 2, CANVAS_H - 18);

        // Score and streak (right side)
        ctx.fillStyle = '#cc9944';
        ctx.textAlign = 'right';
        ctx.font = '14px monospace';
        ctx.fillText(`${t('hud.score', lang)} ${score}`, CANVAS_W - 15, CANVAS_H - 24);
        ctx.fillStyle = streak > 0 ? '#66cc66' : '#666';
        ctx.font = '12px monospace';
        ctx.fillText(`${t('hud.streak', lang)} ${streak}`, CANVAS_W - 15, CANVAS_H - 10);

        // Controls hint (top-left)
        const controlsText = t('hud.controls', lang);
        ctx.font = '11px monospace';
        const controlsWidth = ctx.measureText(controlsText).width + 16;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, controlsWidth, 24);
        ctx.fillStyle = '#777';
        ctx.textAlign = 'left';
        ctx.fillText(controlsText, 8, 16);

        // Compass direction (bottom bar, after keys)
        const arrows = ['\u25B2', '\u25B6', '\u25BC', '\u25C0']; // N E S W
        ctx.fillStyle = '#8888bb';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(arrows[player.facing], 250, CANVAS_H - 17);
    }

    _drawHeart(ctx, x, y, size, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y - size * 0.2);
        ctx.bezierCurveTo(x, y - size * 0.6, x - size, y - size * 0.6, x - size, y - size * 0.1);
        ctx.bezierCurveTo(x - size, y + size * 0.3, x, y + size * 0.6, x, y + size * 0.8);
        ctx.bezierCurveTo(x, y + size * 0.6, x + size, y + size * 0.3, x + size, y - size * 0.1);
        ctx.bezierCurveTo(x + size, y - size * 0.6, x, y - size * 0.6, x, y - size * 0.2);
        ctx.fill();
    }

    drawKeyIcon(ctx, x, y) {
        ctx.strokeStyle = '#cc9944';
        ctx.lineWidth = 2;
        // Key bow (circle)
        ctx.beginPath();
        ctx.arc(x + 4, y + 2, 4, 0, Math.PI * 2);
        ctx.stroke();
        // Key shaft
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 2);
        ctx.lineTo(x + 16, y + 2);
        ctx.stroke();
        // Key teeth
        ctx.beginPath();
        ctx.moveTo(x + 13, y + 2);
        ctx.lineTo(x + 13, y + 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 16, y + 2);
        ctx.lineTo(x + 16, y + 5);
        ctx.stroke();
    }

    drawKeyIconScaled(ctx, cx, cy, scale, glowAlpha) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        if (glowAlpha > 0) {
            ctx.shadowColor = '#cc9944';
            ctx.shadowBlur = 16 * glowAlpha;
        }
        this.drawKeyIcon(ctx, -8, -2);
        ctx.restore();
    }

    // ── Menu screen ────────────────────────────────────────────────────

    renderMenu(subjects, selectedIndex) {
        const ctx = this.ctx;

        // Background
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Decorative border
        ctx.strokeStyle = '#3a3a5a';
        ctx.lineWidth = 3;
        ctx.strokeRect(20, 20, CANVAS_W - 40, CANVAS_H - 40);
        ctx.strokeStyle = '#2a2a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(25, 25, CANVAS_W - 50, CANVAS_H - 50);

        // Title
        ctx.fillStyle = '#cc9944';
        ctx.font = `bold 52px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.fillText('Subject Quiz', CANVAS_W / 2, 100);

        // Author credit
        ctx.fillStyle = '#555577';
        ctx.font = `13px ${SERIF}`;
        ctx.fillText('Made by Allan Sj\u00F8lin', CANVAS_W / 2, 132);

        // Subject selection label
        ctx.fillStyle = '#aaaacc';
        ctx.font = `16px ${SERIF}`;
        ctx.fillText('Choose your subject:', CANVAS_W / 2, 180);

        // Subject buttons
        const btnW = 300;
        const btnH = 38;
        const startY = 198;
        for (let i = 0; i < subjects.length; i++) {
            const bx = (CANVAS_W - btnW) / 2;
            const by = startY + i * (btnH + 8);

            ctx.fillStyle = i === selectedIndex ? '#2a2a5a' : '#1a1a2e';
            ctx.fillRect(bx, by, btnW, btnH);
            ctx.strokeStyle = i === selectedIndex ? '#8888cc' : '#3a3a5a';
            ctx.lineWidth = i === selectedIndex ? 2 : 1;
            ctx.strokeRect(bx, by, btnW, btnH);

            ctx.fillStyle = i === selectedIndex ? '#ffffff' : '#aaaacc';
            ctx.font = `16px ${SERIF}`;
            ctx.textAlign = 'center';
            ctx.fillText(subjects[i].name, CANVAS_W / 2, by + 25);
        }

        // Action buttons row
        const actionY = startY + subjects.length * (btnH + 8) + 24;
        const actions = [
            { label: 'Start Game', key: 'Enter' },
            { label: 'The Log',    key: 'L' },
            { label: 'Scores',     key: 'B' },
        ];
        const actionBtnW = 160;
        const actionBtnH = 40;
        const gap = 18;
        const totalW = actions.length * actionBtnW + (actions.length - 1) * gap;
        const actionStartX = (CANVAS_W - totalW) / 2;

        for (let i = 0; i < actions.length; i++) {
            const ax = actionStartX + i * (actionBtnW + gap);
            const colors = i === 0
                ? { bg: '#2a3a2a', border: '#55aa55', text: '#88dd88' }
                : { bg: '#1a1a2e', border: '#4a4a6a', text: '#aaaacc' };

            ctx.fillStyle = colors.bg;
            ctx.fillRect(ax, actionY, actionBtnW, actionBtnH);
            ctx.strokeStyle = colors.border;
            ctx.lineWidth = i === 0 ? 2 : 1;
            ctx.strokeRect(ax, actionY, actionBtnW, actionBtnH);

            ctx.fillStyle = colors.text;
            ctx.font = `bold 15px ${SERIF}`;
            ctx.textAlign = 'center';
            ctx.fillText(actions[i].label, ax + actionBtnW / 2, actionY + 18);
            ctx.fillStyle = '#666688';
            ctx.font = '11px monospace';
            ctx.fillText(`[${actions[i].key}]`, ax + actionBtnW / 2, actionY + 34);
        }

        // Controls hint
        ctx.fillStyle = '#444466';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('W/S or Up/Down to select subject', CANVAS_W / 2, CANVAS_H - 50);
        ctx.fillText('WASD to move  |  1-4 to answer  |  ESC to quit', CANVAS_W / 2, CANVAS_H - 34);

        // Texture credit (bottom-left)
        ctx.fillStyle = '#333355';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('All textures by Screaming Brain Studios', 30, CANVAS_H - 28);
    }

    // Returns { type: 'subject'|'start'|'log'|'leaderboard'|'timer', index }
    getMenuClickedAction(canvasX, canvasY, subjects) {
        const btnW = 300;
        const btnH = 38;
        const startY = 198;
        const bx = (CANVAS_W - btnW) / 2;

        // Check subject buttons
        for (let i = 0; i < subjects.length; i++) {
            const by = startY + i * (btnH + 8);
            if (canvasX >= bx && canvasX <= bx + btnW &&
                canvasY >= by && canvasY <= by + btnH) {
                return { type: 'subject', index: i };
            }
        }

        // Check action buttons
        const actionY = startY + subjects.length * (btnH + 8) + 24;
        const actionBtnW = 160;
        const actionBtnH = 40;
        const gap = 18;
        const totalW = 3 * actionBtnW + 2 * gap;
        const actionStartX = (CANVAS_W - totalW) / 2;
        const types = ['start', 'log', 'leaderboard'];

        for (let i = 0; i < 3; i++) {
            const ax = actionStartX + i * (actionBtnW + gap);
            if (canvasX >= ax && canvasX <= ax + actionBtnW &&
                canvasY >= actionY && canvasY <= actionY + actionBtnH) {
                return { type: types[i] };
            }
        }

        return null;
    }

    // ── Settings screen ────────────────────────────────────────────────

    renderSettings(timedMode, timerDurationMs, lang = 'en', startLevel = 1, maxLevel = 7, difficulty = 'normal') {
        const ctx = this.ctx;

        // Background
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Decorative border
        ctx.strokeStyle = '#3a3a5a';
        ctx.lineWidth = 3;
        ctx.strokeRect(20, 20, CANVAS_W - 40, CANVAS_H - 40);
        ctx.strokeStyle = '#2a2a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(25, 25, CANVAS_W - 50, CANVAS_H - 50);

        // Title
        ctx.fillStyle = '#cc9944';
        ctx.font = `bold 36px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.fillText(t('settings.title', lang), CANVAS_W / 2, 90);

        // Objective description
        ctx.fillStyle = '#8888aa';
        ctx.font = `14px ${SERIF}`;
        ctx.textAlign = 'center';
        this._wrapText(ctx, t('settings.objective', lang), CANVAS_W / 2, 118, CANVAS_W - 100, 18);

        // Difficulty toggle button
        const diffW = 280;
        const diffH = 36;
        const diffX = (CANVAS_W - diffW) / 2;
        const diffY = 160;
        const isHard = difficulty === 'hard';

        ctx.fillStyle = isHard ? '#2a1a2a' : '#1a1a2e';
        ctx.fillRect(diffX, diffY, diffW, diffH);
        ctx.strokeStyle = isHard ? '#cc44cc' : '#3a3a5a';
        ctx.lineWidth = isHard ? 2 : 1;
        ctx.strokeRect(diffX, diffY, diffW, diffH);

        const diffLabel = isHard ? t('settings.diffHard', lang) : t('settings.diffNormal', lang);
        ctx.fillStyle = isHard ? '#cc88cc' : '#aaaacc';
        ctx.font = `bold 15px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.fillText(`${t('settings.difficulty', lang)} ${diffLabel}`, CANVAS_W / 2, diffY + 24);

        // [G] hint
        ctx.fillStyle = '#666688';
        ctx.font = '11px monospace';
        ctx.fillText('[G]', CANVAS_W / 2, diffY + diffH + 12);

        // Timer toggle button
        const toggleW = 220;
        const toggleH = 44;
        const toggleX = (CANVAS_W - toggleW) / 2;
        const toggleY = 220;

        ctx.fillStyle = timedMode ? '#2a2a1a' : '#1a1a2e';
        ctx.fillRect(toggleX, toggleY, toggleW, toggleH);
        ctx.strokeStyle = timedMode ? '#cc9944' : '#3a3a5a';
        ctx.lineWidth = timedMode ? 2 : 1;
        ctx.strokeRect(toggleX, toggleY, toggleW, toggleH);

        ctx.fillStyle = timedMode ? '#cc9944' : '#aaaacc';
        ctx.font = `bold 18px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.fillText(timedMode ? 'Timer: ON' : 'Timer: OFF', CANVAS_W / 2, toggleY + 29);

        // [T] hint
        ctx.fillStyle = '#666688';
        ctx.font = '11px monospace';
        ctx.fillText('[T]', CANVAS_W / 2, toggleY + toggleH + 14);

        // Duration row (only when timer is ON)
        if (timedMode) {
            const rowY = 300;
            const btnSize = 44;
            const displayW = 140;
            const displayH = 44;
            const totalRowW = btnSize + 10 + displayW + 10 + btnSize;
            const rowStartX = (CANVAS_W - totalRowW) / 2;

            // Current preset index
            const presetIdx = TIMER_PRESETS.indexOf(timerDurationMs);
            const atMin = presetIdx <= 0;
            const atMax = presetIdx >= TIMER_PRESETS.length - 1;

            // Minus button
            const minusX = rowStartX;
            ctx.fillStyle = atMin ? '#151520' : '#1a1a2e';
            ctx.fillRect(minusX, rowY, btnSize, btnSize);
            ctx.strokeStyle = atMin ? '#2a2a3a' : '#4a4a6a';
            ctx.lineWidth = 1;
            ctx.strokeRect(minusX, rowY, btnSize, btnSize);
            ctx.fillStyle = atMin ? '#444455' : '#aaaacc';
            ctx.font = `bold 24px ${SERIF}`;
            ctx.textAlign = 'center';
            ctx.fillText('\u2212', minusX + btnSize / 2, rowY + 31);

            // Duration display
            const dispX = minusX + btnSize + 10;
            ctx.fillStyle = '#1c1c2e';
            ctx.fillRect(dispX, rowY, displayW, displayH);
            ctx.strokeStyle = '#4a4a6a';
            ctx.lineWidth = 1;
            ctx.strokeRect(dispX, rowY, displayW, displayH);
            const secs = timerDurationMs / 1000;
            ctx.fillStyle = '#cc9944';
            ctx.font = `bold 20px ${SERIF}`;
            ctx.textAlign = 'center';
            ctx.fillText(`${secs} ${t('settings.seconds', lang)}`, dispX + displayW / 2, rowY + 29);

            // Plus button
            const plusX = dispX + displayW + 10;
            ctx.fillStyle = atMax ? '#151520' : '#1a1a2e';
            ctx.fillRect(plusX, rowY, btnSize, btnSize);
            ctx.strokeStyle = atMax ? '#2a2a3a' : '#4a4a6a';
            ctx.lineWidth = 1;
            ctx.strokeRect(plusX, rowY, btnSize, btnSize);
            ctx.fillStyle = atMax ? '#444455' : '#aaaacc';
            ctx.font = `bold 24px ${SERIF}`;
            ctx.textAlign = 'center';
            ctx.fillText('+', plusX + btnSize / 2, rowY + 31);

            // [W/S] hint
            ctx.fillStyle = '#666688';
            ctx.font = '11px monospace';
            ctx.fillText('[W/S]', CANVAS_W / 2, rowY + btnSize + 14);
        }

        // Level selector row
        const levelRowY = timedMode ? 370 : 300;
        const levelBtnSize = 44;
        const levelDisplayW = 300;
        const levelDisplayH = 44;
        const levelTotalW = levelBtnSize + 10 + levelDisplayW + 10 + levelBtnSize;
        const levelRowStartX = (CANVAS_W - levelTotalW) / 2;

        const atMinLevel = startLevel <= 1;
        const atMaxLevel = startLevel >= maxLevel;

        // Label
        ctx.fillStyle = '#aaaacc';
        ctx.font = `bold 15px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.fillText(t('settings.startLevel', lang), CANVAS_W / 2, levelRowY - 8);

        // Minus button
        const levelMinusX = levelRowStartX;
        ctx.fillStyle = atMinLevel ? '#151520' : '#1a1a2e';
        ctx.fillRect(levelMinusX, levelRowY, levelBtnSize, levelBtnSize);
        ctx.strokeStyle = atMinLevel ? '#2a2a3a' : '#4a4a6a';
        ctx.lineWidth = 1;
        ctx.strokeRect(levelMinusX, levelRowY, levelBtnSize, levelBtnSize);
        ctx.fillStyle = atMinLevel ? '#444455' : '#aaaacc';
        ctx.font = `bold 24px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.fillText('\u2212', levelMinusX + levelBtnSize / 2, levelRowY + 31);

        // Level display
        const levelDispX = levelMinusX + levelBtnSize + 10;
        ctx.fillStyle = '#1c1c2e';
        ctx.fillRect(levelDispX, levelRowY, levelDisplayW, levelDisplayH);
        ctx.strokeStyle = '#4a4a6a';
        ctx.lineWidth = 1;
        ctx.strokeRect(levelDispX, levelRowY, levelDisplayW, levelDisplayH);
        const levelName = LEVEL_DISPLAY_NAMES[startLevel] || `Level ${startLevel}`;
        ctx.fillStyle = '#cc9944';
        ctx.font = `bold 18px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.fillText(`${startLevel}: ${levelName}`, levelDispX + levelDisplayW / 2, levelRowY + 29);

        // Plus button
        const levelPlusX = levelDispX + levelDisplayW + 10;
        ctx.fillStyle = atMaxLevel ? '#151520' : '#1a1a2e';
        ctx.fillRect(levelPlusX, levelRowY, levelBtnSize, levelBtnSize);
        ctx.strokeStyle = atMaxLevel ? '#2a2a3a' : '#4a4a6a';
        ctx.lineWidth = 1;
        ctx.strokeRect(levelPlusX, levelRowY, levelBtnSize, levelBtnSize);
        ctx.fillStyle = atMaxLevel ? '#444455' : '#aaaacc';
        ctx.font = `bold 24px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.fillText('+', levelPlusX + levelBtnSize / 2, levelRowY + 31);

        // [A/D] hint
        ctx.fillStyle = '#666688';
        ctx.font = '11px monospace';
        ctx.fillText('[A/D]', CANVAS_W / 2, levelRowY + levelBtnSize + 14);

        // Bottom buttons: Start Game and Back
        const bottomY = levelRowY + levelBtnSize + 26;
        const startW = 200;
        const startH = 40;
        const backW = 120;
        const backH = 40;
        const gap = 20;
        const totalBtnW = startW + gap + backW;
        const btnStartX = (CANVAS_W - totalBtnW) / 2;

        // Start Game button (green-tinted)
        ctx.fillStyle = '#2a3a2a';
        ctx.fillRect(btnStartX, bottomY, startW, startH);
        ctx.strokeStyle = '#55aa55';
        ctx.lineWidth = 2;
        ctx.strokeRect(btnStartX, bottomY, startW, startH);
        ctx.fillStyle = '#88dd88';
        ctx.font = `bold 18px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.fillText(t('settings.start', lang), btnStartX + startW / 2, bottomY + 27);

        // Back button
        const backX = btnStartX + startW + gap;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(backX, bottomY, backW, backH);
        ctx.strokeStyle = '#4a4a6a';
        ctx.lineWidth = 1;
        ctx.strokeRect(backX, bottomY, backW, backH);
        ctx.fillStyle = '#aaaacc';
        ctx.font = `bold 16px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.fillText(t('settings.back', lang), backX + backW / 2, bottomY + 27);

        // Keyboard hints
        ctx.fillStyle = '#444466';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t('settings.hintKeys', lang), CANVAS_W / 2, bottomY + startH + 20);
    }

    // Returns { type: 'toggle_difficulty' | 'toggle_timer' | 'timer_minus' | 'timer_plus' | 'level_minus' | 'level_plus' | 'start' | 'back' } or null
    getSettingsClickedAction(canvasX, canvasY, timedMode) {
        // Difficulty toggle button
        const diffW = 280;
        const diffH = 36;
        const diffX = (CANVAS_W - diffW) / 2;
        const diffY = 160;

        if (canvasX >= diffX && canvasX <= diffX + diffW &&
            canvasY >= diffY && canvasY <= diffY + diffH) {
            return { type: 'toggle_difficulty' };
        }

        // Timer toggle button
        const toggleW = 220;
        const toggleH = 44;
        const toggleX = (CANVAS_W - toggleW) / 2;
        const toggleY = 220;

        if (canvasX >= toggleX && canvasX <= toggleX + toggleW &&
            canvasY >= toggleY && canvasY <= toggleY + toggleH) {
            return { type: 'toggle_timer' };
        }

        // Duration row (only when timer is ON)
        if (timedMode) {
            const rowY = 300;
            const btnSize = 44;
            const displayW = 140;
            const totalRowW = btnSize + 10 + displayW + 10 + btnSize;
            const rowStartX = (CANVAS_W - totalRowW) / 2;

            const minusX = rowStartX;
            if (canvasX >= minusX && canvasX <= minusX + btnSize &&
                canvasY >= rowY && canvasY <= rowY + btnSize) {
                return { type: 'timer_minus' };
            }

            const plusX = minusX + btnSize + 10 + displayW + 10;
            if (canvasX >= plusX && canvasX <= plusX + btnSize &&
                canvasY >= rowY && canvasY <= rowY + btnSize) {
                return { type: 'timer_plus' };
            }
        }

        // Level selector row
        const levelRowY = timedMode ? 370 : 300;
        const levelBtnSize = 44;
        const levelDisplayW = 300;
        const levelTotalW = levelBtnSize + 10 + levelDisplayW + 10 + levelBtnSize;
        const levelRowStartX = (CANVAS_W - levelTotalW) / 2;

        const levelMinusX = levelRowStartX;
        if (canvasX >= levelMinusX && canvasX <= levelMinusX + levelBtnSize &&
            canvasY >= levelRowY && canvasY <= levelRowY + levelBtnSize) {
            return { type: 'level_minus' };
        }

        const levelPlusX = levelMinusX + levelBtnSize + 10 + levelDisplayW + 10;
        if (canvasX >= levelPlusX && canvasX <= levelPlusX + levelBtnSize &&
            canvasY >= levelRowY && canvasY <= levelRowY + levelBtnSize) {
            return { type: 'level_plus' };
        }

        // Bottom buttons
        const bottomY = levelRowY + levelBtnSize + 26;
        const startW = 200;
        const startH = 40;
        const backW = 120;
        const backH = 40;
        const gap = 20;
        const totalBtnW = startW + gap + backW;
        const btnStartX = (CANVAS_W - totalBtnW) / 2;

        if (canvasX >= btnStartX && canvasX <= btnStartX + startW &&
            canvasY >= bottomY && canvasY <= bottomY + startH) {
            return { type: 'start' };
        }

        const backX = btnStartX + startW + gap;
        if (canvasX >= backX && canvasX <= backX + backW &&
            canvasY >= bottomY && canvasY <= bottomY + backH) {
            return { type: 'back' };
        }

        return null;
    }

    // ── The Log screen ──────────────────────────────────────────────────

    renderLog(log, subjectName, page, totalPages, lang = 'en') {
        const ctx = this.ctx;

        // Background
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Border
        ctx.strokeStyle = '#3a3a5a';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, CANVAS_W - 40, CANVAS_H - 40);

        // Header
        ctx.fillStyle = '#cc9944';
        ctx.font = `bold 28px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.fillText(t('log.title', lang), CANVAS_W / 2, 62);

        ctx.fillStyle = '#8877aa';
        ctx.font = `italic 15px ${SERIF}`;
        ctx.fillText(`${t('log.subtitle', lang)} ${subjectName}`, CANVAS_W / 2, 84);

        if (log.length === 0) {
            ctx.fillStyle = '#666688';
            ctx.font = `18px ${SERIF}`;
            ctx.fillText(t('log.empty1', lang), CANVAS_W / 2, 250);
            ctx.fillText(t('log.empty2', lang), CANVAS_W / 2, 278);
        } else {
            // Paginated entries
            const startIdx = page * LOG_PER_PAGE;
            const entries = log.slice(startIdx, startIdx + LOG_PER_PAGE);
            const entryH = 88;
            const entryStartY = 100;

            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                const ey = entryStartY + i * (entryH + 6);

                // Entry background
                ctx.fillStyle = '#141425';
                ctx.fillRect(40, ey, CANVAS_W - 80, entryH);
                ctx.strokeStyle = '#2a2a4a';
                ctx.lineWidth = 1;
                ctx.strokeRect(40, ey, CANVAS_W - 80, entryH);

                // Question text (truncated)
                ctx.fillStyle = '#d8d0c8';
                ctx.font = `14px ${SERIF}`;
                ctx.textAlign = 'left';
                const qText = entry.question.length > 85
                    ? entry.question.substring(0, 85) + '...'
                    : entry.question;
                ctx.fillText(qText, 52, ey + 18);

                // Your answer (red)
                ctx.fillStyle = '#cc4444';
                ctx.font = `13px ${SERIF}`;
                const yourText = `${t('log.yourAnswer', lang)} ${entry.playerAnswer}`;
                const trimYour = yourText.length > 60 ? yourText.substring(0, 60) + '...' : yourText;
                ctx.fillText(trimYour, 52, ey + 38);

                // Correct answer (green)
                ctx.fillStyle = '#44cc44';
                const correctText = `${t('log.correct', lang)} ${entry.correctAnswer}`;
                const trimCorrect = correctText.length > 60 ? correctText.substring(0, 60) + '...' : correctText;
                ctx.fillText(trimCorrect, 52, ey + 56);

                // Explanation (dimmer)
                if (entry.explanation) {
                    ctx.fillStyle = '#888877';
                    ctx.font = `12px ${SERIF}`;
                    const expText = entry.explanation.length > 95
                        ? entry.explanation.substring(0, 95) + '...'
                        : entry.explanation;
                    ctx.fillText(expText, 52, ey + 76);
                }
            }

            // Page indicator
            ctx.fillStyle = '#888';
            ctx.font = '13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${t('log.page', lang)} ${page + 1} ${t('log.pageOf', lang)} ${totalPages}`, CANVAS_W / 2, CANVAS_H - 68);
        }

        // Bottom buttons
        this._drawLogButtons(ctx, log.length > 0, lang);
    }

    _drawLogButtons(ctx, hasEntries, lang = 'en') {
        const btnH = 32;
        const btnY = CANVAS_H - 55;

        // [< Prev]  [Clear Log]  [Next >]  [Back]
        const buttons = [];
        if (hasEntries) {
            buttons.push({ label: t('log.prev', lang), x: 60, w: 100 });
            buttons.push({ label: t('log.clearLog', lang), x: 180, w: 120, type: 'clear' });
            buttons.push({ label: t('log.next', lang), x: 320, w: 100 });
        }
        buttons.push({ label: t('log.back', lang), x: CANVAS_W - 160, w: 120 });

        for (const btn of buttons) {
            ctx.fillStyle = btn.type === 'clear' ? '#2a1a1a' : '#1a1a2e';
            ctx.fillRect(btn.x, btnY, btn.w, btnH);
            ctx.strokeStyle = btn.type === 'clear' ? '#884444' : '#4a4a6a';
            ctx.lineWidth = 1;
            ctx.strokeRect(btn.x, btnY, btn.w, btnH);

            ctx.fillStyle = '#aaaacc';
            ctx.font = `13px ${SERIF}`;
            ctx.textAlign = 'center';
            ctx.fillText(btn.label, btn.x + btn.w / 2, btnY + 21);
        }
    }

    // Returns 'prev'|'next'|'clear'|'back'|null
    getLogClickedAction(canvasX, canvasY, hasEntries) {
        const btnH = 32;
        const btnY = CANVAS_H - 55;

        const _hit = (x, w) =>
            canvasX >= x && canvasX <= x + w &&
            canvasY >= btnY && canvasY <= btnY + btnH;

        if (hasEntries) {
            if (_hit(60, 100)) return 'prev';
            if (_hit(180, 120)) return 'clear';
            if (_hit(320, 100)) return 'next';
        }
        if (_hit(CANVAS_W - 160, 120)) return 'back';

        return null;
    }

    // ── Leaderboard / Scores screen ─────────────────────────────────────

    renderLeaderboard(board, stats, subjectName, lang = 'en') {
        const ctx = this.ctx;

        // Background
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Border
        ctx.strokeStyle = '#3a3a5a';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, CANVAS_W - 40, CANVAS_H - 40);

        // Header
        ctx.fillStyle = '#cc9944';
        ctx.font = `bold 28px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.fillText(t('lb.title', lang), CANVAS_W / 2, 62);

        ctx.fillStyle = '#8877aa';
        ctx.font = `italic 15px ${SERIF}`;
        ctx.fillText(subjectName, CANVAS_W / 2, 84);

        // ── Stats summary (left half) ────
        const statsX = 60;
        const statsY = 110;
        ctx.fillStyle = '#aaaacc';
        ctx.font = `bold 16px ${SERIF}`;
        ctx.textAlign = 'left';
        ctx.fillText(t('lb.yourStats', lang), statsX, statsY);

        ctx.font = `14px ${SERIF}`;
        const accuracy = stats.totalAnswered > 0
            ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0;
        const lines = [
            `${t('lb.gamesPlayed', lang).padEnd(17)} ${stats.gamesPlayed}`,
            `${t('lb.totalAnswered', lang).padEnd(17)} ${stats.totalAnswered}`,
            `${t('lb.totalCorrect', lang).padEnd(17)} ${stats.totalCorrect}`,
            `${t('lb.accuracy', lang).padEnd(17)} ${accuracy}%`,
            `${t('lb.bestStreak', lang).padEnd(17)} ${stats.bestStreak}`,
            `${t('lb.bestScore', lang).padEnd(17)} ${stats.bestScore}`,
        ];
        for (let i = 0; i < lines.length; i++) {
            ctx.fillStyle = '#9999bb';
            ctx.fillText(lines[i], statsX, statsY + 26 + i * 22);
        }

        // ── Leaderboard table (right half) ────
        const tableX = 410;
        const tableY = 110;
        ctx.fillStyle = '#aaaacc';
        ctx.font = `bold 16px ${SERIF}`;
        ctx.textAlign = 'left';
        ctx.fillText(t('lb.top10', lang), tableX, tableY);

        if (board.length === 0) {
            ctx.fillStyle = '#666688';
            ctx.font = `14px ${SERIF}`;
            ctx.fillText(t('lb.noScores', lang), tableX, tableY + 30);
        } else {
            // Table header
            ctx.fillStyle = '#888899';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(t('lb.tableHeader', lang), tableX, tableY + 26);

            ctx.font = '13px monospace';
            for (let i = 0; i < board.length; i++) {
                const entry = board[i];
                const rank = String(i + 1).padStart(2, ' ');
                const score = String(entry.score).padStart(7, ' ');
                const lvls = String(entry.levelsCompleted).padStart(3, ' ');
                const date = entry.date ? entry.date.substring(0, 10) : '';

                ctx.fillStyle = i === 0 ? '#cc9944' : '#9999bb';
                ctx.fillText(
                    `${rank}  ${score}    ${lvls}   ${date}`,
                    tableX, tableY + 46 + i * 20
                );
            }
        }

        // Back button
        const btnX = CANVAS_W - 160;
        const btnY = CANVAS_H - 55;
        const btnW = 120;
        const btnH = 32;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.strokeStyle = '#4a4a6a';
        ctx.lineWidth = 1;
        ctx.strokeRect(btnX, btnY, btnW, btnH);
        ctx.fillStyle = '#aaaacc';
        ctx.font = `13px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.fillText(t('lb.back', lang), btnX + btnW / 2, btnY + 21);
    }

    // Returns 'back'|null
    getLeaderboardClickedAction(canvasX, canvasY) {
        const btnX = CANVAS_W - 160;
        const btnY = CANVAS_H - 55;
        const btnW = 120;
        const btnH = 32;
        if (canvasX >= btnX && canvasX <= btnX + btnW &&
            canvasY >= btnY && canvasY <= btnY + btnH) {
            return 'back';
        }
        return null;
    }

    // ── Victory screen ─────────────────────────────────────────────────

    renderVictory(levelNum, isLastLevel, score, particles, timestamp, lang = 'en') {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Victory particles (behind text)
        if (particles && particles.length > 0) {
            const ts = (timestamp || 0) * 0.001;
            for (const p of particles) {
                const shimmer = 0.7 + 0.3 * Math.sin(ts * 3.0 + p.phase);
                ctx.fillStyle = `rgba(204, 153, 68, ${p.alpha * shimmer})`;
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            }
        }

        ctx.fillStyle = '#cc9944';
        ctx.font = `bold 40px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.fillText(t('victory.title', lang), CANVAS_W / 2, 170);

        ctx.fillStyle = '#aaaacc';
        ctx.font = `20px ${SERIF}`;
        ctx.fillText(`${t('victory.conquered', lang)} ${levelNum}!`, CANVAS_W / 2, 215);

        // Score display
        ctx.fillStyle = '#cc9944';
        ctx.font = `bold 22px ${SERIF}`;
        ctx.fillText(`${t('victory.score', lang)} ${score}`, CANVAS_W / 2, 260);

        if (isLastLevel) {
            ctx.fillStyle = '#66ff66';
            ctx.font = `bold 24px ${SERIF}`;
            ctx.fillText(t('victory.mastered', lang), CANVAS_W / 2, 310);
            ctx.fillStyle = '#888';
            ctx.font = '16px monospace';
            ctx.fillText(t('victory.returnMenu', lang), CANVAS_W / 2, 360);
        } else {
            ctx.fillStyle = '#888';
            ctx.font = '16px monospace';
            ctx.fillText(t('victory.continue', lang), CANVAS_W / 2, 320);
        }
    }

    // ── Game Over screen ───────────────────────────────────────────────

    renderGameOver(correctAnswers, score, lang = 'en') {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.fillStyle = '#cc3333';
        ctx.font = `bold 44px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.fillText(t('gameover.title', lang), CANVAS_W / 2, 170);

        ctx.fillStyle = '#aaaacc';
        ctx.font = `18px ${SERIF}`;
        ctx.fillText(t('gameover.subtitle', lang), CANVAS_W / 2, 215);

        ctx.fillStyle = '#888';
        ctx.font = '16px monospace';
        ctx.fillText(`${t('gameover.answered', lang)} ${correctAnswers} ${t('gameover.correctly', lang)}`, CANVAS_W / 2, 265);

        // Score display
        ctx.fillStyle = '#cc9944';
        ctx.font = `bold 20px ${SERIF}`;
        ctx.fillText(`${t('gameover.finalScore', lang)} ${score}`, CANVAS_W / 2, 305);

        ctx.fillStyle = '#888';
        ctx.font = '16px monospace';
        ctx.fillText(t('gameover.returnMenu', lang), CANVAS_W / 2, 350);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        for (const word of words) {
            const test = line ? line + ' ' + word : word;
            if (ctx.measureText(test).width > maxWidth && line) {
                ctx.fillText(line, x, y);
                line = word;
                y += lineHeight;
            } else {
                line = test;
            }
        }
        if (line) ctx.fillText(line, x, y);
    }
}
