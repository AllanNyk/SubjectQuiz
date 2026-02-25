import { CANVAS_W, CANVAS_H, RESULT_DISPLAY_MS, COMBAT_TIMER_MS } from './config.js';
import { t } from './i18n.js';

export class CombatSystem {
    constructor() {
        this.active = false;
        this.question = null;
        this.enemy = null;
        this.selectedAnswer = -1;
        this.result = null;       // 'correct' | 'wrong' | null
        this.resultTimer = 0;
        this.resultStartTime = 0;
        this.hoverIndex = -1;     // which answer button is hovered
        this.level = 1;

        // Timer mode
        this.timedMode = false;
        this.timerStart = 0;

        // Boss mode
        this.isBossMode = false;
        this.bossCase = null;
        this.bossQuestionIndex = 0;
        this.bossTotalQuestions = 0;
        this.showingCaseIntro = true;
    }

    start(question, enemy, level, timedMode = false, lang = 'en') {
        this.active = true;
        this.question = question;
        this.enemy = enemy;
        this.selectedAnswer = -1;
        this.result = null;
        this.resultTimer = 0;
        this.hoverIndex = -1;
        this.level = level || 1;
        this.isBossMode = false;
        this._dismissed = false;
        this.timedMode = timedMode;
        this.timerStart = Date.now();
        this.lang = lang;
    }

    startBoss(bossCase, enemy, level, timedMode = false, lang = 'en') {
        this.active = true;
        this.enemy = enemy;
        this.level = level || 1;
        this.isBossMode = true;
        this.bossCase = bossCase;
        this.bossQuestionIndex = 0;
        this.bossTotalQuestions = bossCase.questions.length;
        this.showingCaseIntro = true;
        this.question = null;
        this.selectedAnswer = -1;
        this.result = null;
        this.resultTimer = 0;
        this.hoverIndex = -1;
        this._dismissed = false;
        this.timedMode = timedMode;
        this.timerStart = 0;
        this.lang = lang;
    }

    selectAnswer(index) {
        if (!this.active || this.result !== null) return;
        if (index < 0 || index >= this.question.choices.length) return;

        this.selectedAnswer = index;
        this.result = index === this.question.correct ? 'correct' : 'wrong';
        this.resultStartTime = Date.now();
    }

    // Dismiss the result screen early (keypress, click, or tap)
    dismiss() {
        if (this.result) {
            this._dismissed = true;
        }
    }

    // Dismiss the boss case intro screen
    dismissIntro() {
        if (this.isBossMode && this.showingCaseIntro) {
            this.showingCaseIntro = false;
            this._loadBossQuestion();
        }
    }

    _loadBossQuestion() {
        this.question = this.bossCase.questions[this.bossQuestionIndex];
        this.selectedAnswer = -1;
        this.result = null;
        this.hoverIndex = -1;
        this._dismissed = false;
        this.timerStart = Date.now();
    }

    // Returns 'correct', 'wrong', 'boss_defeated', 'boss_failed', or null
    update() {
        // Timer expiry — auto-submit as wrong if time runs out
        if (this.timedMode && this.result === null && this.timerStart > 0 &&
            Date.now() - this.timerStart >= COMBAT_TIMER_MS) {
            this.result = 'wrong';
            this.selectedAnswer = -1;
            this.resultStartTime = Date.now();
        }

        if (!this.result) return null;
        if (!this._dismissed && Date.now() - this.resultStartTime < RESULT_DISPLAY_MS) return null;

        this._dismissed = false;

        if (this.isBossMode) {
            if (this.result === 'wrong') {
                this.active = false;
                return 'boss_failed';
            }
            // Correct answer in boss mode — advance to next question
            this.bossQuestionIndex++;
            if (this.bossQuestionIndex >= this.bossTotalQuestions) {
                this.active = false;
                return 'boss_defeated';
            }
            // Load next boss question
            this._loadBossQuestion();
            return null;
        }

        // Regular combat
        const r = this.result;
        this.active = false;
        return r;
    }

    // Check if a canvas click hits an answer button; returns index or -1
    getClickedAnswer(canvasX, canvasY) {
        for (let i = 0; i < 4; i++) {
            const rect = this._answerRect(i);
            if (canvasX >= rect.x && canvasX <= rect.x + rect.w &&
                canvasY >= rect.y && canvasY <= rect.y + rect.h) {
                return i;
            }
        }
        return -1;
    }

    updateHover(canvasX, canvasY) {
        this.hoverIndex = this.getClickedAnswer(canvasX, canvasY);
    }

    _answerRect(index) {
        const panelX = 80;
        const panelW = CANVAS_W - 160;
        const col = index % 2;
        const row = Math.floor(index / 2);
        const btnW = (panelW - 30) / 2;
        const btnH = 56;
        const startY = 310;
        return {
            x: panelX + 15 + col * (btnW + 10),
            y: startY + row * (btnH + 10),
            w: btnW,
            h: btnH,
        };
    }

    // ── Rendering ──────────────────────────────────────────────────────

    render(ctx) {
        if (!this.active) return;

        // Boss case intro screen
        if (this.isBossMode && this.showingCaseIntro) {
            this._renderBossIntro(ctx);
            return;
        }

        // Dim overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        const panelX = 80;
        const panelY = 30;
        const panelW = CANVAS_W - 160;
        const panelH = CANVAS_H - 60;

        // Panel background
        ctx.fillStyle = '#1c1c2e';
        ctx.fillRect(panelX, panelY, panelW, panelH);

        // Boss mode: gold border; regular: normal border
        if (this.isBossMode) {
            ctx.strokeStyle = '#cc9944';
            ctx.lineWidth = 3;
        } else {
            ctx.strokeStyle = '#4a4a6a';
            ctx.lineWidth = 2;
        }
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        // Enemy portrait area
        this._drawEnemyPortrait(ctx, panelX + panelW / 2, panelY + 70);

        // Header text
        ctx.fillStyle = '#cc9944';
        ctx.font = 'bold 16px "Palatino Linotype", "Book Antiqua", Palatino, serif';
        ctx.textAlign = 'center';
        if (this.isBossMode) {
            ctx.fillText(
                `${this.bossCase.title} — ${t('combat.bossQuestion', this.lang)} ${this.bossQuestionIndex + 1} ${t('combat.bossQuestionOf', this.lang)} ${this.bossTotalQuestions}`,
                panelX + panelW / 2, panelY + 130
            );
        } else {
            ctx.fillText(t('combat.foeChallenge', this.lang), panelX + panelW / 2, panelY + 130);
        }

        // Question text (word-wrapped)
        ctx.fillStyle = '#e8e0d0';
        ctx.font = '17px "Palatino Linotype", "Book Antiqua", Palatino, serif';
        ctx.textAlign = 'left';
        this._wrapText(ctx, this.question.question,
            panelX + 20, panelY + 160, panelW - 40, 24);

        // Answer buttons
        for (let i = 0; i < this.question.choices.length; i++) {
            this._drawAnswerButton(ctx, i);
        }

        // Countdown bar (timed mode, question active)
        if (this.timedMode && this.result === null) {
            this._drawCountdownBar(ctx, panelX, panelY, panelW);
        }

        // Result feedback
        if (this.result) {
            this._drawResult(ctx, panelX, panelY, panelW, panelH);
        }
    }

    _renderBossIntro(ctx) {
        // Dim overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        const panelX = 60;
        const panelY = 40;
        const panelW = CANVAS_W - 120;
        const panelH = CANVAS_H - 80;

        // Panel
        ctx.fillStyle = '#1c1c2e';
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = '#cc9944';
        ctx.lineWidth = 3;
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        // Inner gold border
        ctx.strokeStyle = 'rgba(204, 153, 68, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12);

        // "CASE" header
        ctx.fillStyle = '#cc9944';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t('combat.caseHeading', this.lang), panelX + panelW / 2, panelY + 40);

        // Case title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px "Palatino Linotype", "Book Antiqua", Palatino, serif';
        ctx.fillText(this.bossCase.title, panelX + panelW / 2, panelY + 80);

        // Context (word-wrapped)
        ctx.fillStyle = '#ccccaa';
        ctx.font = '16px "Palatino Linotype", "Book Antiqua", Palatino, serif';
        ctx.textAlign = 'left';
        this._wrapText(ctx, this.bossCase.context,
            panelX + 30, panelY + 120, panelW - 60, 24, 12);

        // Dismiss hint
        ctx.fillStyle = '#777788';
        ctx.font = '13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t('combat.pressToBegin', this.lang), panelX + panelW / 2, panelY + panelH - 25);
    }

    _drawEnemyPortrait(ctx, cx, cy) {
        if (this.isBossMode) {
            // Golden question mark (larger than regular)
            ctx.save();
            ctx.shadowColor = 'rgba(204, 153, 68, 0.6)';
            ctx.shadowBlur = 14;
            ctx.font = 'bold 64px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeStyle = 'rgba(30, 20, 0, 0.7)';
            ctx.lineWidth = 3;
            ctx.strokeText('?', cx, cy);
            ctx.fillStyle = '#cc9944';
            ctx.fillText('?', cx, cy);
            ctx.restore();
        } else {
            // Regular enemy: question mark
            ctx.save();
            ctx.shadowColor = 'rgba(200, 210, 255, 0.5)';
            ctx.shadowBlur = 10;
            ctx.font = 'bold 48px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeStyle = 'rgba(30, 30, 40, 0.7)';
            ctx.lineWidth = 3;
            ctx.strokeText('?', cx, cy);
            ctx.fillStyle = '#dddde8';
            ctx.fillText('?', cx, cy);
            ctx.restore();
        }
    }

    _drawAnswerButton(ctx, index) {
        const rect = this._answerRect(index);
        const isSelected = this.selectedAnswer === index;
        const isCorrect = index === this.question.correct;
        const isHovered = this.hoverIndex === index && this.result === null;

        // Button background
        if (this.result) {
            if (isCorrect) {
                ctx.fillStyle = '#1a4a1a';
            } else if (isSelected && !isCorrect) {
                ctx.fillStyle = '#4a1a1a';
            } else {
                ctx.fillStyle = '#252538';
            }
        } else if (isHovered) {
            ctx.fillStyle = '#353560';
        } else {
            ctx.fillStyle = '#252538';
        }
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

        // Border
        if (this.result) {
            if (isCorrect) {
                ctx.strokeStyle = '#33cc33';
            } else if (isSelected && !isCorrect) {
                ctx.strokeStyle = '#cc3333';
            } else {
                ctx.strokeStyle = '#3a3a5a';
            }
        } else if (isHovered) {
            ctx.strokeStyle = '#8888cc';
        } else {
            ctx.strokeStyle = '#3a3a5a';
        }
        ctx.lineWidth = isSelected || (this.result && isCorrect) ? 2 : 1;
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

        // Number prefix
        ctx.fillStyle = '#8888aa';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${index + 1}.`, rect.x + 10, rect.y + 22);

        // Answer text
        ctx.fillStyle = '#d8d0c8';
        ctx.font = '14px "Palatino Linotype", "Book Antiqua", Palatino, serif';
        this._wrapText(ctx, this.question.choices[index],
            rect.x + 32, rect.y + 18, rect.w - 44, 18, 2);
    }

    _drawResult(ctx, px, py, pw, ph) {
        const isCorrect = this.result === 'correct';

        // Full-panel overlay so explanation has room
        const bannerX = px + 10;
        const bannerY = py + 10;
        const bannerW = pw - 20;
        const bannerH = ph - 20;

        ctx.fillStyle = isCorrect ? 'rgba(12, 50, 12, 0.97)' : 'rgba(55, 12, 12, 0.97)';
        ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
        ctx.strokeStyle = isCorrect ? '#33cc33' : '#cc3333';
        ctx.lineWidth = 2;
        ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

        // Result heading
        ctx.fillStyle = isCorrect ? '#66ff66' : '#ff6666';
        ctx.font = 'bold 26px "Palatino Linotype", "Book Antiqua", Palatino, serif';
        ctx.textAlign = 'center';
        ctx.fillText(
            isCorrect ? t('combat.correct', this.lang) : t('combat.wrong', this.lang),
            px + pw / 2, bannerY + 50
        );

        // Correct answer reminder (for wrong answers)
        if (!isCorrect) {
            ctx.fillStyle = '#ddaa66';
            ctx.font = '15px "Palatino Linotype", "Book Antiqua", Palatino, serif';
            ctx.textAlign = 'center';
            const correctText = t('combat.correctAnswer', this.lang) + ' ' + this.question.choices[this.question.correct];
            this._wrapText(ctx, correctText,
                bannerX + bannerW / 2, bannerY + 85, bannerW - 60, 20, 2, 'center');
        }

        // Explanation (fully word-wrapped)
        if (this.question.explanation) {
            ctx.fillStyle = '#ccccaa';
            ctx.font = '15px "Palatino Linotype", "Book Antiqua", Palatino, serif';
            const explY = isCorrect ? bannerY + 100 : bannerY + 130;
            this._wrapText(ctx, this.question.explanation,
                bannerX + 30, explY, bannerW - 60, 22, 8, 'left');
        }

        // Dismiss hint
        ctx.fillStyle = '#777788';
        ctx.font = '13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t('combat.pressToContinue', this.lang), px + pw / 2, bannerY + bannerH - 18);
    }

    _drawCountdownBar(ctx, panelX, panelY, panelW) {
        const elapsed = Date.now() - this.timerStart;
        const remaining = Math.max(0, COMBAT_TIMER_MS - elapsed);
        const fraction = remaining / COMBAT_TIMER_MS;

        const barX = panelX + 10;
        const barY = panelY + 6;
        const barW = panelW - 20;
        const barH = 8;

        // Background track
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barW, barH);

        // Color: green → yellow → red
        let r, g;
        if (fraction > 0.5) {
            // green to yellow
            const t = (fraction - 0.5) * 2;
            r = Math.round(255 * (1 - t));
            g = 200;
        } else {
            // yellow to red
            const t = fraction * 2;
            r = 255;
            g = Math.round(200 * t);
        }
        ctx.fillStyle = `rgb(${r}, ${g}, 30)`;
        ctx.fillRect(barX, barY, barW * fraction, barH);

        // Border
        ctx.strokeStyle = '#4a4a6a';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        // Seconds text
        const secs = Math.ceil(remaining / 1000);
        ctx.fillStyle = fraction < 0.3 ? '#ff4444' : '#aaaacc';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${secs}${t('combat.timerSuffix', this.lang)}`, panelX + panelW - 14, barY + barH + 14);
    }

    // ── Text helpers ───────────────────────────────────────────────────

    _wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines, align) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        let lineCount = 0;
        const limit = maxLines || 99;
        const prevAlign = ctx.textAlign;
        if (align) ctx.textAlign = align;

        for (const word of words) {
            const testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > maxWidth && line !== '') {
                lineCount++;
                if (lineCount >= limit) {
                    ctx.fillText(line.trim() + '...', x, currentY);
                    ctx.textAlign = prevAlign;
                    return currentY + lineHeight;
                }
                ctx.fillText(line.trim(), x, currentY);
                line = word + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line.trim(), x, currentY);
        ctx.textAlign = prevAlign;
        return currentY + lineHeight;
    }
}
