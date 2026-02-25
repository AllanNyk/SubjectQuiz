import {
    CANVAS_W, CANVAS_H, MAX_DEPTH, FRAMES, DX, DY,
    COLOR_CEILING, COLOR_FLOOR,
    COLOR_WALL_FRONT, COLOR_WALL_LEFT, COLOR_WALL_RIGHT, COLOR_WALL_LINE,
    MINIMAP_SIZE, MINIMAP_MARGIN, ENEMY_COLORS,
    BRICK_ROWS_BY_DEPTH, BRICK_COLS_BY_DEPTH, BRICK_SHADE_RANGE,
    TILE_BOSS_DOOR, TILE_STAIRS,
} from './config.js';

// Deterministic spatial hash for window placement
function _hash(x, y) {
    return ((x * 73856093) ^ (y * 19349663)) >>> 0;
}

// Returns the window type for a wall cell, or null if no window
function _windowTypeAt(x, y) {
    if ((_hash(x, y) % 4) !== 0) return null;
    const types = ['windowA', 'windowB', 'windowC'];
    return types[_hash(x + 7, y + 13) % 3];
}

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this._t = 0; // current timestamp in seconds
        this._texLoader = null;
        this._brickTextures = this._generateBrickTextures();

        // Offscreen canvas for compositing SBS texture pieces at native resolution
        // Pieces have pre-baked perspective with transparency — compositing at 256×256
        // lets the alpha blend correctly before scaling to the frame on screen
        this._compositeCanvas = document.createElement('canvas');
        this._compositeCanvas.width = 256;
        this._compositeCanvas.height = 256;
        this._compositeCtx = this._compositeCanvas.getContext('2d');
    }

    setTextureLoader(loader) {
        this._texLoader = loader;
    }

    _texReady() {
        return this._texLoader?.isReady();
    }

    _texPack() {
        return Math.min((this._currentLevel || 1) - 1, 2);
    }

    // Pre-render brick textures for each depth (offscreen canvases) — procedural fallback
    _generateBrickTextures() {
        const textures = [];
        // Seeded pseudo-random for deterministic brick shading
        const seed = (n) => ((n * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

        for (let d = 0; d <= MAX_DEPTH; d++) {
            const f = FRAMES[d];
            const w = f.r - f.l;
            const h = f.b - f.t;
            if (w <= 0 || h <= 0) { textures.push(null); continue; }

            const offscreen = document.createElement('canvas');
            offscreen.width = w;
            offscreen.height = h;
            const octx = offscreen.getContext('2d');

            const rows = BRICK_ROWS_BY_DEPTH[d] || 2;
            const cols = BRICK_COLS_BY_DEPTH[d] || 2;
            const brickH = h / rows;
            const brickW = w / cols;

            // Draw per-brick shade variation
            for (let r = 0; r < rows; r++) {
                const offset = (r % 2 === 1) ? brickW * 0.5 : 0; // running bond
                for (let c = -1; c <= cols; c++) {
                    const bx = c * brickW + offset;
                    const by = r * brickH;
                    // Clip to canvas bounds
                    const clippedX = Math.max(0, bx);
                    const clippedW = Math.min(w, bx + brickW) - clippedX;
                    if (clippedW <= 0) continue;

                    const shade = (seed(r * 137 + c * 97 + d * 53) - 0.5) * 2 * BRICK_SHADE_RANGE;
                    if (shade > 0) {
                        octx.fillStyle = `rgba(255,255,255,${shade})`;
                    } else {
                        octx.fillStyle = `rgba(0,0,0,${-shade})`;
                    }
                    octx.fillRect(clippedX, by, clippedW, brickH);
                }
            }

            // Mortar lines (dark)
            octx.strokeStyle = 'rgba(0,0,0,0.25)';
            octx.lineWidth = 1;

            // Horizontal mortar
            for (let r = 1; r < rows; r++) {
                const ly = r * brickH;
                octx.beginPath();
                octx.moveTo(0, ly);
                octx.lineTo(w, ly);
                octx.stroke();
            }

            // Vertical mortar (with running bond offset)
            for (let r = 0; r < rows; r++) {
                const offset = (r % 2 === 1) ? brickW * 0.5 : 0;
                const by = r * brickH;
                for (let c = 1; c < cols + 1; c++) {
                    const lx = c * brickW + offset;
                    if (lx > 0 && lx < w) {
                        octx.beginPath();
                        octx.moveTo(lx, by);
                        octx.lineTo(lx, by + brickH);
                        octx.stroke();
                    }
                }
            }

            textures.push(offscreen);
        }
        return textures;
    }

    // ── Depth dimming + torch flicker overlay ────────────────────────

    _flickerFactor(depth) {
        const t = this._t;
        return (1 + (Math.sin(t * 3.7) * 0.015 + Math.sin(t * 7.3) * 0.01) * (1 - depth * 0.18));
    }

    _applyDepthDimming(ctx, depth, x, y, w, h) {
        const f = Math.max(0.3, 1 - depth * 0.13) * this._flickerFactor(depth);
        const darkness = 1 - f;
        if (darkness > 0.01) {
            ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
            ctx.fillRect(x, y, w, h);
        }
    }

    // ── Composite texture approach ─────────────────────────────────────
    // Draws floor, ceiling, and side wall textures by compositing all pieces
    // onto a 256×256 offscreen canvas first (where transparency blends correctly),
    // then scaling the result to the frame on screen.

    _drawDepthComposite(ctx, depth, hasLeftWall, hasRightWall, leftWinType, rightWinType) {
        const pack = this._texPack();
        const f = FRAMES[depth];
        const fw = f.r - f.l;
        const fh = f.b - f.t;
        if (fw <= 0 || fh <= 0) return;

        const oc = this._compositeCtx;
        oc.clearRect(0, 0, 256, 256);

        // Draw pieces at their native SBS composite positions.
        // The transparency in side/floor/ceiling textures handles overlap in corners.

        // Floor (Bottom): full width, bottom 25%
        const floorTex = this._texLoader.getWall(pack, 1, 'bottom');
        if (floorTex) oc.drawImage(floorTex, 0, 192, 256, 64);

        // Ceiling (Top): full width, top 25%
        const ceilTex = this._texLoader.getWall(pack, 1, 'top');
        if (ceilTex) oc.drawImage(ceilTex, 0, 0, 256, 64);

        // Left wall: left 25%, full height
        // Use window decoration piece if the side wall cell has a window
        if (hasLeftWall) {
            let leftTex = null;
            if (leftWinType) {
                leftTex = this._texLoader.getDecoration(pack, 1, leftWinType, 'left');
            }
            if (!leftTex) leftTex = this._texLoader.getWall(pack, 1, 'left');
            if (leftTex) oc.drawImage(leftTex, 0, 0, 64, 256);
        } else {
            // Open passage / turn — draw turn texture
            const turnTex = this._texLoader.getTurn(pack);
            if (turnTex) oc.drawImage(turnTex, 0, 0, 64, 256);
        }

        // Right wall: right 25%, full height
        if (hasRightWall) {
            let rightTex = null;
            if (rightWinType) {
                rightTex = this._texLoader.getDecoration(pack, 1, rightWinType, 'right');
            }
            if (!rightTex) rightTex = this._texLoader.getWall(pack, 1, 'right');
            if (rightTex) oc.drawImage(rightTex, 192, 0, 64, 256);
        } else {
            // Open passage / turn — flip left turn texture horizontally
            const turnTex = this._texLoader.getTurn(pack);
            if (turnTex) {
                oc.save();
                oc.translate(256, 0);
                oc.scale(-1, 1);
                oc.drawImage(turnTex, 0, 0, 64, 256);
                oc.restore();
            }
        }

        // Draw the composite to the main canvas, scaled to this depth's frame
        ctx.drawImage(this._compositeCanvas, f.l, f.t, fw, fh);

        // Depth dimming over the entire frame
        this._applyDepthDimming(ctx, depth, f.l, f.t, fw, fh);
    }

    // ── Main render entry ──────────────────────────────────────────────

    renderDungeon(map, player, enemies, visited, timestamp, currentLevel) {
        const ctx = this.ctx;
        this._t = (timestamp || 0) * 0.001; // store as seconds
        this._currentLevel = currentLevel || 1;

        // High-quality smoothing for texture scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Background: ceiling + floor
        ctx.fillStyle = COLOR_CEILING;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H / 2);
        ctx.fillStyle = COLOR_FLOOR;
        ctx.fillRect(0, CANVAS_H / 2, CANVAS_W, CANVAS_H / 2);

        const useTex = this._texReady();

        // Procedural floor/ceiling bands (only when textures aren't loaded)
        if (!useTex) {
            this._drawFloorBands(ctx);
        }

        // Determine view direction vectors
        const fwd  = player.facing;
        const left = (fwd + 3) % 4;
        const right = (fwd + 1) % 4;

        // First pass: find the max visible depth (stop at front wall)
        let maxVisible = MAX_DEPTH;
        for (let d = 1; d <= MAX_DEPTH; d++) {
            const cx = player.x + DX[fwd] * d;
            const cy = player.y + DY[fwd] * d;
            if (map.isWall(cx, cy)) {
                maxVisible = d;
                break;
            }
        }

        // Draw from farthest to nearest
        for (let d = maxVisible; d >= 1; d--) {
            const cx = player.x + DX[fwd] * d;
            const cy = player.y + DY[fwd] * d;

            // Check side walls at this depth
            const leftX = cx + DX[left];
            const leftY = cy + DY[left];
            const hasLeft = map.isWall(leftX, leftY);

            const rightX = cx + DX[right];
            const rightY = cy + DY[right];
            const hasRight = map.isWall(rightX, rightY);

            // Check if side wall cells have windows
            const lWin = hasLeft ? _windowTypeAt(leftX, leftY) : null;
            const rWin = hasRight ? _windowTypeAt(rightX, rightY) : null;

            if (map.isBossDoor(cx, cy)) {
                if (useTex) {
                    this._drawDepthComposite(ctx, d, hasLeft, hasRight, lWin, rWin);
                }
                this._drawBossDoor(ctx, d);
                continue;
            }

            if (map.isWall(cx, cy)) {
                if (useTex) {
                    this._drawDepthComposite(ctx, d, hasLeft, hasRight, lWin, rWin);
                }
                this._drawFrontWall(ctx, d, cx, cy);
                continue;
            }

            // Composite draws floor, ceiling, AND side walls together
            if (useTex) {
                this._drawDepthComposite(ctx, d, hasLeft, hasRight, lWin, rWin);
            } else {
                // Procedural fallback: draw side walls individually
                if (hasLeft) this._drawSideWall(ctx, d, 'left');
                if (hasRight) this._drawSideWall(ctx, d, 'right');
            }

            // Depth fog (after walls, before enemies)
            this._drawDepthFog(ctx, d);

            // Enemy at this depth
            const enemy = enemies.getAt(cx, cy);
            if (enemy) {
                if (enemy.isBoss) {
                    this._drawBossEnemy(ctx, d, player.facing);
                } else {
                    this._drawEnemy(ctx, d, player.facing);
                }
            }

            // Stairs at this depth
            if (map.isStairs(cx, cy)) {
                this._drawStairs(ctx, d);
            }
        }

        // Depth 0: composite handles floor/ceiling + side walls together
        const pl = player.x + DX[left];
        const plY = player.y + DY[left];
        const pr = player.x + DX[right];
        const prY = player.y + DY[right];
        const hasL0 = map.isWall(pl, plY);
        const hasR0 = map.isWall(pr, prY);
        if (useTex) {
            this._drawDepthComposite(ctx, 0, hasL0, hasR0,
                hasL0 ? _windowTypeAt(pl, plY) : null,
                hasR0 ? _windowTypeAt(pr, prY) : null);
        } else {
            if (hasL0) this._drawSideWall(ctx, 0, 'left');
            if (hasR0) this._drawSideWall(ctx, 0, 'right');
        }

        // Minimap
        this._drawMinimap(ctx, map, player, enemies, visited);
    }

    // ── Wall drawing ───────────────────────────────────────────────────

    _wallColor(base, depth) {
        const f = Math.max(0.3, 1 - depth * 0.13) * this._flickerFactor(depth);
        return `rgb(${base.r * f | 0}, ${base.g * f | 0}, ${base.b * f | 0})`;
    }

    _drawFrontWall(ctx, depth, cx, cy) {
        const f = FRAMES[depth];
        const w = f.r - f.l;
        const h = f.b - f.t;

        if (this._texReady()) {
            const pack = this._texPack();

            // Decide if this wall gets a window decoration
            const winType = _windowTypeAt(cx, cy);
            if (winType) {
                const decoTex = this._texLoader.getDecoration(pack, 1, winType, 'center');
                if (decoTex) {
                    ctx.drawImage(decoTex, f.l, f.t, w, h);
                    this._applyDepthDimming(ctx, depth, f.l, f.t, w, h);
                    return;
                }
            }

            // Stretch L1 center texture to fill the wall face
            const tex = this._texLoader.getWall(pack, 1, 'center');
            if (tex) {
                ctx.drawImage(tex, f.l, f.t, w, h);
                this._applyDepthDimming(ctx, depth, f.l, f.t, w, h);
                return;
            }
        }

        // Procedural fallback
        ctx.fillStyle = this._wallColor(COLOR_WALL_FRONT, depth);
        ctx.fillRect(f.l, f.t, w, h);
        const tex = this._brickTextures[depth];
        if (tex) {
            ctx.drawImage(tex, f.l, f.t);
        }
    }

    // Procedural side wall fallback (textured side walls use _drawDepthComposite)
    _drawSideWall(ctx, depth, side) {
        const near = FRAMES[depth];
        const far  = FRAMES[depth + 1];
        if (!far) return;

        const base = side === 'left' ? COLOR_WALL_LEFT : COLOR_WALL_RIGHT;
        ctx.fillStyle = this._wallColor(base, depth);

        ctx.beginPath();
        if (side === 'left') {
            ctx.moveTo(near.l, near.t);
            ctx.lineTo(far.l,  far.t);
            ctx.lineTo(far.l,  far.b);
            ctx.lineTo(near.l, near.b);
        } else {
            ctx.moveTo(near.r, near.t);
            ctx.lineTo(far.r,  far.t);
            ctx.lineTo(far.r,  far.b);
            ctx.lineTo(near.r, near.b);
        }
        ctx.closePath();
        ctx.fill();

        // Stone lines on side walls
        ctx.strokeStyle = COLOR_WALL_LINE;
        ctx.lineWidth = 1;
        const steps = 3;
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const y = near.t + (near.b - near.t) * t;
            const yFar = far.t + (far.b - far.t) * t;
            ctx.beginPath();
            if (side === 'left') {
                ctx.moveTo(near.l, y);
                ctx.lineTo(far.l,  yFar);
            } else {
                ctx.moveTo(near.r, y);
                ctx.lineTo(far.r,  yFar);
            }
            ctx.stroke();
        }
    }

    _drawDepthFog(ctx, depth) {
        if (depth < 2) return;
        const f = FRAMES[depth];
        const alpha = Math.min(0.4, (depth - 1) * 0.08);
        ctx.fillStyle = `rgba(5, 5, 15, ${alpha})`;
        ctx.fillRect(f.l, f.t, f.r - f.l, f.b - f.t);
    }

    // Procedural-only floor/ceiling bands (used when textures aren't loaded)
    _drawFloorBands(ctx) {
        const t = this._t;
        const flicker = 1 + (Math.sin(t * 3.7) * 0.015 + Math.sin(t * 7.3) * 0.01);

        for (let d = 0; d < MAX_DEPTH; d++) {
            const near = FRAMES[d];
            const far  = FRAMES[d + 1];
            const depthFlicker = flicker * (1 - d * 0.18);

            // Floor band
            const brightness = Math.max(15, 30 - d * 4) * depthFlicker;
            ctx.fillStyle = `rgb(${brightness + 10 | 0}, ${brightness + 8 | 0}, ${brightness | 0})`;
            ctx.beginPath();
            ctx.moveTo(near.l, near.b);
            ctx.lineTo(near.r, near.b);
            ctx.lineTo(far.r,  far.b);
            ctx.lineTo(far.l,  far.b);
            ctx.closePath();
            ctx.fill();

            // Ceiling band
            const cb = Math.max(10, 22 - d * 3) * depthFlicker;
            ctx.fillStyle = `rgb(${cb | 0}, ${cb | 0}, ${(cb + 10) | 0})`;
            ctx.beginPath();
            ctx.moveTo(near.l, near.t);
            ctx.lineTo(near.r, near.t);
            ctx.lineTo(far.r,  far.t);
            ctx.lineTo(far.l,  far.t);
            ctx.closePath();
            ctx.fill();
        }

        // Floor grid lines
        ctx.strokeStyle = 'rgba(255, 255, 220, 0.04)';
        ctx.lineWidth = 1;
        for (let d = 0; d < MAX_DEPTH; d++) {
            const near = FRAMES[d];
            const far  = FRAMES[d + 1];

            ctx.beginPath();
            ctx.moveTo(far.l, far.b);
            ctx.lineTo(far.r, far.b);
            ctx.stroke();

            for (let i = 1; i <= 2; i++) {
                const frac = i / 3;
                const x1 = near.l + (far.l - near.l) * frac;
                const x2 = near.r + (far.r - near.r) * frac;
                const y1 = near.b + (far.b - near.b) * frac;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y1);
                ctx.stroke();
            }
        }
    }

    // ── Enemy drawing ──────────────────────────────────────────────────

    _drawEnemy(ctx, depth, _facing) {
        const t = this._t;
        const f = FRAMES[depth];
        const cx = (f.l + f.r) / 2;
        const h = (f.b - f.t) * 0.75;
        const w = h * 0.5;

        // Idle sway: vertical bob, phase offset by depth so multiple enemies don't sync
        const sway = Math.sin(t * 1.8 + depth * 2.1) * h * 0.012;
        const cy = (f.t + f.b) / 2 + sway;

        // Shadow on floor (stays grounded — no sway)
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, f.b - h * 0.05, w * 0.4, h * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing glow
        const pulse = 0.7 + 0.3 * Math.sin(t * 2.5 + depth * 1.7);
        const fontSize = Math.max(12, h * 0.7);

        ctx.save();
        ctx.shadowColor = `rgba(200, 210, 255, ${0.4 * pulse})`;
        ctx.shadowBlur = Math.max(6, h * 0.08);

        // Question mark
        ctx.font = `bold ${fontSize}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Dark outline for readability
        ctx.strokeStyle = 'rgba(30, 30, 40, 0.7)';
        ctx.lineWidth = Math.max(2, fontSize * 0.05);
        ctx.strokeText('?', cx, cy);

        // White-gray fill with subtle pulse
        const b = 200 + (30 * pulse) | 0;
        ctx.fillStyle = `rgb(${b}, ${b}, ${b + 10 | 0})`;
        ctx.fillText('?', cx, cy);

        ctx.restore();
    }

    // ── Boss door drawing ─────────────────────────────────────────────

    _drawBossDoor(ctx, depth) {
        const f = FRAMES[depth];
        const w = f.r - f.l;
        const h = f.b - f.t;

        if (this._texReady()) {
            const pack = this._texPack();
            // Always use L1 for door decoration
            const doorTex = this._texLoader.getDecoration(pack, 1, 'door', 'center');

            if (doorTex) {
                ctx.drawImage(doorTex, f.l, f.t, w, h);
                this._applyDepthDimming(ctx, depth, f.l, f.t, w, h);

                // Pulsing golden keyhole overlay (gameplay indicator)
                this._drawKeyhole(ctx, f, w, h);
                return;
            }
        }

        // Procedural fallback
        ctx.fillStyle = this._wallColor(COLOR_WALL_FRONT, depth);
        ctx.fillRect(f.l, f.t, w, h);
        const tex = this._brickTextures[depth];
        if (tex) ctx.drawImage(tex, f.l, f.t);

        // Dark wood door panel (70% of wall width)
        const doorW = w * 0.7;
        const doorH = h * 0.9;
        const doorX = f.l + (w - doorW) / 2;
        const doorY = f.t + (h - doorH);

        ctx.fillStyle = '#3a2010';
        ctx.fillRect(doorX, doorY, doorW, doorH);

        // Door border
        ctx.strokeStyle = '#1a1008';
        ctx.lineWidth = 2;
        ctx.strokeRect(doorX, doorY, doorW, doorH);

        // 3 iron bands
        ctx.fillStyle = '#555555';
        for (let i = 0; i < 3; i++) {
            const bandY = doorY + doorH * (0.2 + i * 0.3);
            const bandH = Math.max(2, doorH * 0.03);
            ctx.fillRect(doorX + 2, bandY, doorW - 4, bandH);
        }

        this._drawKeyhole(ctx, f, w, h);
    }

    _drawKeyhole(ctx, f, w, h) {
        const doorW = w * 0.7;
        const doorH = h * 0.9;
        const doorX = f.l + (w - doorW) / 2;
        const doorY = f.t + (h - doorH);

        const khX = doorX + doorW * 0.5;
        const khY = doorY + doorH * 0.55;
        const pulse = 0.6 + 0.4 * Math.sin(this._t * 3.0);

        // Glow
        ctx.fillStyle = `rgba(204, 153, 68, ${0.3 * pulse})`;
        ctx.beginPath();
        ctx.arc(khX, khY, Math.max(4, doorW * 0.06), 0, Math.PI * 2);
        ctx.fill();

        // Keyhole
        ctx.fillStyle = `rgb(${180 + 40 * pulse | 0}, ${140 + 20 * pulse | 0}, ${50})`;
        ctx.beginPath();
        ctx.arc(khX, khY, Math.max(2, doorW * 0.025), 0, Math.PI * 2);
        ctx.fill();
        // Keyhole slot
        ctx.fillRect(khX - 1, khY, 2, Math.max(3, doorH * 0.04));
    }

    // ── Stairs drawing ──────────────────────────────────────────────

    _drawStairs(ctx, depth) {
        const f = FRAMES[depth];
        const cx = (f.l + f.r) / 2;
        const w = (f.r - f.l) * 0.6;
        const floorY = f.b;
        const stepH = (f.b - f.t) * 0.08;

        // Golden glow from below
        const pulse = 0.5 + 0.3 * Math.sin(this._t * 2.0);
        const grad = ctx.createRadialGradient(cx, floorY, 0, cx, floorY, w * 0.8);
        grad.addColorStop(0, `rgba(204, 153, 68, ${0.25 * pulse})`);
        grad.addColorStop(1, 'rgba(204, 153, 68, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(f.l, f.t, f.r - f.l, f.b - f.t);

        // 3 visible stone steps descending
        for (let i = 0; i < 3; i++) {
            const sy = floorY - stepH * (i + 1) * 0.8;
            const sw = w * (1 - i * 0.15);
            const shade = 80 - i * 15;
            ctx.fillStyle = `rgb(${shade + 20}, ${shade + 15}, ${shade})`;
            ctx.fillRect(cx - sw / 2, sy, sw, stepH * 0.7);
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx - sw / 2, sy, sw, stepH * 0.7);
        }
    }

    // ── Boss enemy drawing ──────────────────────────────────────────

    _drawBossEnemy(ctx, depth, _facing) {
        const t = this._t;
        const f = FRAMES[depth];
        const cx = (f.l + f.r) / 2;
        const h = (f.b - f.t) * 0.95;
        const w = h * 0.5;

        // Slower sway for boss
        const sway = Math.sin(t * 1.2 + depth * 2.1) * h * 0.008;
        const cy = (f.t + f.b) / 2 + sway;

        // Shadow on floor
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(cx, f.b - h * 0.05, w * 0.5, h * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();

        // Golden question mark — same style as regular enemy but gold and larger
        const pulse = 0.7 + 0.3 * Math.sin(t * 1.8 + depth * 1.7);
        const fontSize = Math.max(16, h * 0.85);

        ctx.save();
        ctx.shadowColor = `rgba(204, 153, 68, ${0.5 * pulse})`;
        ctx.shadowBlur = Math.max(8, h * 0.1);

        ctx.font = `bold ${fontSize}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Dark outline
        ctx.strokeStyle = 'rgba(30, 20, 0, 0.7)';
        ctx.lineWidth = Math.max(2, fontSize * 0.05);
        ctx.strokeText('?', cx, cy);

        // Gold fill with pulse
        const g = 140 + (20 * pulse) | 0;
        ctx.fillStyle = `rgb(204, ${g}, 68)`;
        ctx.fillText('?', cx, cy);

        ctx.restore();
    }

    // ── Minimap ────────────────────────────────────────────────────────

    _drawMinimap(ctx, map, player, enemies, visited) {
        const size = MINIMAP_SIZE;
        const margin = MINIMAP_MARGIN;
        const sx = CANVAS_W - size - margin;
        const sy = margin;
        const cellW = size / map.width;
        const cellH = size / map.height;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(sx - 3, sy - 3, size + 6, size + 6);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx - 3, sy - 3, size + 6, size + 6);

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const px = sx + x * cellW;
                const py = sy + y * cellH;

                if (!visited[y][x]) {
                    ctx.fillStyle = '#111';
                    ctx.fillRect(px, py, cellW, cellH);
                    continue;
                }

                if (map.isBossDoor(x, y)) {
                    ctx.fillStyle = '#cc9944';
                } else if (map.isStairs(x, y)) {
                    ctx.fillStyle = '#ffffff';
                } else if (map.isWall(x, y)) {
                    ctx.fillStyle = '#444';
                } else {
                    ctx.fillStyle = '#8a8a6a';
                }
                ctx.fillRect(px, py, cellW, cellH);
            }
        }

        // Enemies (red dots, boss = magenta larger dot)
        for (const enemy of enemies.getAlive()) {
            if (!visited[enemy.y]?.[enemy.x]) continue;
            ctx.fillStyle = enemy.isBoss ? '#ff00ff' : '#ff3333';
            const dotSize = enemy.isBoss ? Math.max(3, cellW * 0.5) : Math.max(2, cellW * 0.35);
            ctx.beginPath();
            ctx.arc(
                sx + enemy.x * cellW + cellW / 2,
                sy + enemy.y * cellH + cellH / 2,
                dotSize, 0, Math.PI * 2
            );
            ctx.fill();
        }

        // Player (green arrow)
        const pcx = sx + player.x * cellW + cellW / 2;
        const pcy = sy + player.y * cellH + cellH / 2;
        const pr  = Math.max(3, cellW * 0.45);

        ctx.fillStyle = '#00ee55';
        ctx.beginPath();
        // Arrow pointing in facing direction
        const angle = (player.facing - 1) * Math.PI / 2; // N=-PI/2, E=0, S=PI/2, W=PI
        ctx.moveTo(pcx + Math.cos(angle) * pr, pcy + Math.sin(angle) * pr);
        ctx.lineTo(pcx + Math.cos(angle + 2.4) * pr * 0.7, pcy + Math.sin(angle + 2.4) * pr * 0.7);
        ctx.lineTo(pcx + Math.cos(angle - 2.4) * pr * 0.7, pcy + Math.sin(angle - 2.4) * pr * 0.7);
        ctx.closePath();
        ctx.fill();
    }

    // ── Big minimap overlay ──────────────────────────────────────────

    renderBigMap(ctx, map, player, enemies, visited) {
        // Dim background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        const mapSize = Math.min(CANVAS_W, CANVAS_H) - 60;
        const ox = (CANVAS_W - mapSize) / 2;
        const oy = (CANVAS_H - mapSize) / 2;
        const cellW = mapSize / map.width;
        const cellH = mapSize / map.height;

        // Border
        ctx.strokeStyle = '#4a4a6a';
        ctx.lineWidth = 2;
        ctx.strokeRect(ox - 2, oy - 2, mapSize + 4, mapSize + 4);

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const px = ox + x * cellW;
                const py = oy + y * cellH;

                if (!visited[y][x]) {
                    ctx.fillStyle = '#111';
                    ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
                    continue;
                }

                if (map.isBossDoor(x, y)) {
                    ctx.fillStyle = '#cc9944';
                } else if (map.isStairs(x, y)) {
                    ctx.fillStyle = '#ffffff';
                } else if (map.isWall(x, y)) {
                    ctx.fillStyle = '#444';
                } else {
                    ctx.fillStyle = '#8a8a6a';
                }
                ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
            }
        }

        // Enemies
        for (const enemy of enemies.getAlive()) {
            if (!visited[enemy.y]?.[enemy.x]) continue;
            ctx.fillStyle = enemy.isBoss ? '#ff00ff' : '#ff3333';
            const dotSize = enemy.isBoss ? Math.max(4, cellW * 0.4) : Math.max(3, cellW * 0.3);
            ctx.beginPath();
            ctx.arc(
                ox + enemy.x * cellW + cellW / 2,
                oy + enemy.y * cellH + cellH / 2,
                dotSize, 0, Math.PI * 2
            );
            ctx.fill();
        }

        // Player arrow
        const pcx = ox + player.x * cellW + cellW / 2;
        const pcy = oy + player.y * cellH + cellH / 2;
        const pr = Math.max(5, cellW * 0.4);

        ctx.fillStyle = '#00ee55';
        ctx.beginPath();
        const angle = (player.facing - 1) * Math.PI / 2;
        ctx.moveTo(pcx + Math.cos(angle) * pr, pcy + Math.sin(angle) * pr);
        ctx.lineTo(pcx + Math.cos(angle + 2.4) * pr * 0.7, pcy + Math.sin(angle + 2.4) * pr * 0.7);
        ctx.lineTo(pcx + Math.cos(angle - 2.4) * pr * 0.7, pcy + Math.sin(angle - 2.4) * pr * 0.7);
        ctx.closePath();
        ctx.fill();

        // Dismiss hint
        ctx.fillStyle = '#777788';
        ctx.font = '13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Press any key, click, or tap to close', CANVAS_W / 2, oy + mapSize + 25);
    }

    // ── Overlays ───────────────────────────────────────────────────────

    drawDamageFlash(alpha) {
        this.ctx.fillStyle = `rgba(180, 0, 0, ${alpha})`;
        this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    drawCorrectFlash(alpha) {
        this.ctx.fillStyle = `rgba(0, 150, 50, ${alpha})`;
        this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    clear() {
        this.ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    }
}
