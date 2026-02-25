// Stats, log, and leaderboard — all persisted in localStorage per subject

import { SCORE_BASE, STREAK_MAX_BONUS } from './config.js';

const LOG_MAX = 100;
const BOARD_MAX = 10;

export class StatsManager {
    constructor() {
        this.currentStreak = 0;
        this.currentScore = 0;
        this._subjectId = null;
    }

    // ── Session lifecycle ────────────────────────────────────────────

    startSession(subjectId) {
        this._subjectId = subjectId;
        this.currentStreak = 0;
        this.currentScore = 0;
    }

    recordAnswer(correct, level) {
        if (correct) {
            this.currentStreak++;
            const bonus = 1 + Math.min(this.currentStreak * 0.1, STREAK_MAX_BONUS);
            this.currentScore += Math.round(SCORE_BASE * level * bonus);
        } else {
            this.currentStreak = 0;
        }

        // Update persistent stats
        const stats = this.getStats(this._subjectId);
        stats.totalAnswered++;
        if (correct) stats.totalCorrect++;
        if (this.currentStreak > stats.bestStreak) {
            stats.bestStreak = this.currentStreak;
        }
        this._saveStats(this._subjectId, stats);
    }

    logWrongAnswer(question, selectedIndex) {
        const log = this.getLog(this._subjectId);
        log.unshift({
            question: question.question,
            playerAnswer: question.choices[selectedIndex],
            correctAnswer: question.choices[question.correct],
            explanation: question.explanation || '',
            date: new Date().toISOString(),
        });
        // Cap at LOG_MAX
        if (log.length > LOG_MAX) log.length = LOG_MAX;
        this._saveLog(this._subjectId, log);
    }

    addScore(amount) {
        this.currentScore += amount;
    }

    endSession(levelsCompleted) {
        const stats = this.getStats(this._subjectId);
        stats.gamesPlayed++;
        if (this.currentScore > stats.bestScore) {
            stats.bestScore = this.currentScore;
        }
        this._saveStats(this._subjectId, stats);

        // Leaderboard entry
        const board = this.getLeaderboard(this._subjectId);
        board.push({
            score: this.currentScore,
            levelsCompleted,
            date: new Date().toISOString(),
        });
        board.sort((a, b) => b.score - a.score);
        if (board.length > BOARD_MAX) board.length = BOARD_MAX;
        this._saveLeaderboard(this._subjectId, board);
    }

    // ── Getters ──────────────────────────────────────────────────────

    getStats(id) {
        const key = `subjectquiz_stats_${id}`;
        try {
            const raw = localStorage.getItem(key);
            if (raw) return JSON.parse(raw);
        } catch { /* corrupted data */ }
        return { totalAnswered: 0, totalCorrect: 0, bestStreak: 0, gamesPlayed: 0, bestScore: 0 };
    }

    getLog(id) {
        const key = `subjectquiz_log_${id}`;
        try {
            const raw = localStorage.getItem(key);
            if (raw) return JSON.parse(raw);
        } catch { /* corrupted data */ }
        return [];
    }

    clearLog(id) {
        localStorage.removeItem(`subjectquiz_log_${id}`);
    }

    getLeaderboard(id) {
        const key = `subjectquiz_board_${id}`;
        try {
            const raw = localStorage.getItem(key);
            if (raw) return JSON.parse(raw);
        } catch { /* corrupted data */ }
        return [];
    }

    // ── Private persistence ──────────────────────────────────────────

    _saveStats(id, stats) {
        localStorage.setItem(`subjectquiz_stats_${id}`, JSON.stringify(stats));
    }

    _saveLog(id, log) {
        localStorage.setItem(`subjectquiz_log_${id}`, JSON.stringify(log));
    }

    _saveLeaderboard(id, board) {
        localStorage.setItem(`subjectquiz_board_${id}`, JSON.stringify(board));
    }
}
