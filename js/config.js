// All game constants — tune gameplay and visuals here

export const CANVAS_W = 800;
export const CANVAS_H = 500;

// Grid & map
export const TILE_FLOOR = 0;
export const TILE_WALL = 1;
export const TILE_BOSS_DOOR = 2;
export const TILE_STAIRS = 3;
export const MAP_SIZE = 16;

// Player
export const PLAYER_MAX_HP = 3;
export const CORRECT_ANSWERS_TO_WIN = 10;

// Directions: index into DX/DY arrays
export const DIR_N = 0;
export const DIR_E = 1;
export const DIR_S = 2;
export const DIR_W = 3;
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];

// Rendering — perspective frames for each depth level
// Each frame is the visible corridor rectangle at that distance from the player
export const MAX_DEPTH = 5;
// 50% corridor ratio — matches SBS texture pack composite proportions
// Each depth's opening is 50% of the parent frame (center piece = 50% of composite)
export const FRAMES = [
    { l: 0,   r: 800, t: 0,   b: 500 },  // depth 0 — player cell (screen edge)
    { l: 200, r: 600, t: 125, b: 375 },   // depth 1 — 400×250
    { l: 300, r: 500, t: 188, b: 312 },   // depth 2 — 200×124
    { l: 350, r: 450, t: 219, b: 281 },   // depth 3 — 100×62
    { l: 375, r: 425, t: 234, b: 266 },   // depth 4 — 50×32
    { l: 388, r: 412, t: 242, b: 258 },   // depth 5 — farthest visible
];

// Colors
export const COLOR_CEILING = '#000000';
export const COLOR_FLOOR   = '#000000';
export const COLOR_WALL_FRONT = { r: 130, g: 110, b: 90 };
export const COLOR_WALL_LEFT  = { r: 105, g: 88,  b: 72 };
export const COLOR_WALL_RIGHT = { r: 150, g: 128, b: 105 };
export const COLOR_WALL_LINE  = 'rgba(0,0,0,0.15)';

// Minimap
export const MINIMAP_SIZE = 130;
export const MINIMAP_MARGIN = 10;

// Combat UI
export const COMBAT_OVERLAY_ALPHA = 0.88;
export const RESULT_DISPLAY_MS = 10000;
export const DEFAULT_TIMER_MS = 10000;
export const TIMER_PRESETS = [5000, 10000, 15000, 20000, 30000];

// Scoring
export const SCORE_BASE = 100;
export const STREAK_MAX_BONUS = 1.0;
export const LOG_PER_PAGE = 4;

// Boss system
export const BOSS_CASE_QUESTIONS = 4;
export const BOSS_SCORE_MULTIPLIER = 3;

// Flying key animation
export const FLYING_KEY_MS       = 450;   // flight duration
export const FLYING_KEY_GLOW_MS  = 300;   // glow pulse after arrival
export const FLYING_KEY_SCALE    = 2.5;   // start size (shrinks to 1.0)

// Movement/turn tween
export const TWEEN_MOVE_MS = 0; // set to 0 right now, maybe this movement/turn tween is not a good idea afterall
export const TWEEN_TURN_MS = 0; // set to 0 right now, maybe this movement/turn tween is not a good idea afterall
export const TWEEN_MOVE_PX = 50;    // ~10% of CANVAS_H
export const TWEEN_TURN_PX = 25;   // ~12.5% of CANVAS_W

// Brick textures (per depth level, 0 = nearest)
export const BRICK_ROWS_BY_DEPTH = [6, 5, 4, 3, 3, 2];
export const BRICK_COLS_BY_DEPTH = [8, 6, 5, 4, 3, 2];
export const BRICK_SHADE_RANGE  = 0.08;

// Enemy colors per difficulty
export const ENEMY_COLORS = [
    { robe: '#2b3a7c', hood: '#1e2a5e', eyes: '#ff4444' },  // level 1 — Legal Scholar
    { robe: '#7c2b2b', hood: '#5e1e1e', eyes: '#ffaa00' },  // level 2 — Opposing Counsel
    { robe: '#1a1a1a', hood: '#0d0d0d', eyes: '#ff0000' },  // level 3 — The Judge
];

// Level display names (for level selector UI)
export const LEVEL_DISPLAY_NAMES = {
    1: 'Generel viden',
    2: 'Generel viden',
    3: 'Generel viden',
    4: 'Kapitel 1 - Indledning',
    5: 'Kapitel 2 - Domstolssystemets opbygning',
    6: 'Kapitel 3 - EMK',
    7: 'Kapitel 4 - EU-ret',
};

// Boss colors per level
export const BOSS_COLORS = [
    { robe: '#4a0e4a', hood: '#2d082d', eyes: '#ff00ff', crown: '#cc9944' },
    { robe: '#6b1010', hood: '#3d0808', eyes: '#ff6600', crown: '#cc9944' },
    { robe: '#0a0a0a', hood: '#000000', eyes: '#ffffff', crown: '#ffcc00' },
];
