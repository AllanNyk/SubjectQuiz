// Loads and organizes PNG texture assets for dungeon rendering.
// Falls back gracefully — if any texture fails, the renderer uses procedural drawing.

const BASE = 'assets/textures';

// Brick pack naming: pack 1 has inconsistent separators in some filenames
const PACK_PREFIX = ['Brick_01', 'Brick_02', 'Brick_03'];
const PACK_FOLDER = ['Brick 1', 'Brick 2', 'Brick 3'];
const DECO_FOLDER = ['Brick 1 - Decorations', 'Brick 2 - Decorations', 'Brick 3 - Decorations'];

// Wall piece names and their filename suffixes (pack, layer → actual filename token)
// Most use underscore separator, but Brick 1 Layer 1 Right and Top use dash
function wallFilename(pack, layer, piece) {
    const prefix = PACK_PREFIX[pack];
    const sep = '_'; // default separator between layer and piece name

    // Sizes vary by piece and layer (and Brick 3 L1 Center is 256x256)
    const sizes = {
        center: layer === 1
            ? (pack === 2 ? '256x256' : '128x128')  // Brick 3 = 256x256
            : '64x64',
        left:   layer === 1 ? '64x256'  : '32x128',
        right:  layer === 1 ? '64x256'  : '32x128',
        top:    layer === 1 ? '256x64'  : '128x32',
        bottom: layer === 1 ? '256x64'  : '128x32',
    };

    const pieceNames = {
        center: 'Center',
        left:   'Left',
        right:  'Right',
        top:    'Top',
        bottom: 'Bottom',
    };

    const pieceName = pieceNames[piece];
    const size = sizes[piece];

    // Handle Brick 1 naming inconsistencies (dash instead of underscore for Right and Top in Layer 1)
    if (pack === 0 && layer === 1 && (piece === 'right' || piece === 'top')) {
        return `${prefix}-Layer_${layer}-${pieceName}-${size}.png`;
    }

    return `${prefix}-Layer_${layer}${sep}${pieceName}-${size}.png`;
}

function wallPath(pack, layer, piece) {
    return encodeURI(`${BASE}/${PACK_FOLDER[pack]}/Layer ${layer}/${wallFilename(pack, layer, piece)}`);
}

// Turn texture filenames (only left — right is flipped at render time)
function turnFilename(pack) {
    const prefix = PACK_PREFIX[pack];
    return `${prefix}-Layer_1-LeftTurn-64x256.png`;
}

function turnPath(pack) {
    return encodeURI(`${BASE}/${PACK_FOLDER[pack]}/Layer 1/${turnFilename(pack)}`);
}

// Decoration piece filenames
function decoFilename(pack, layer, type, piece) {
    const prefix = PACK_PREFIX[pack];
    const piecePrefix = { center: 'C', left: 'L', right: 'R' };
    const typeNames = { door: 'Door', windowA: 'WindowA', windowB: 'WindowB', windowC: 'WindowC' };
    const typeName = typeNames[type];
    const pp = piecePrefix[piece];

    const sizes = {
        center: layer === 1 ? '128x128' : '64x64',
        left:   layer === 1 ? '64x256'  : '32x128',
        right:  layer === 1 ? '64x256'  : '32x128',
    };
    const size = sizes[piece];

    // Brick 1 door Layer 2 files are misnamed with "Layer_1" in filename
    const fileLayer = (pack === 0 && type === 'door') ? 1 : layer;

    return `${prefix}-Layer_${fileLayer}_${pp}${typeName}-${size}.png`;
}

function decoPath(pack, layer, type, piece) {
    const typeFolder = {
        door: 'Door',
        windowA: 'Window A',
        windowB: 'Window B',
        windowC: 'Window C',
    };
    return encodeURI(`${BASE}/${PACK_FOLDER[pack]}/${DECO_FOLDER[pack]}/${typeFolder[type]}/Layer ${layer}/${decoFilename(pack, layer, type, piece)}`);
}

export class TextureLoader {
    constructor() {
        this._textures = {};  // key → Image
        this._ready = false;
    }

    async load() {
        const promises = [];
        const keys = [];

        // Wall pieces for each pack × layer
        for (let pack = 0; pack < 3; pack++) {
            for (let layer = 1; layer <= 2; layer++) {
                for (const piece of ['center', 'left', 'right', 'top', 'bottom']) {
                    const key = `wall_${pack}_${layer}_${piece}`;
                    const path = wallPath(pack, layer, piece);
                    keys.push(key);
                    promises.push(this._loadImage(path));
                }
            }
        }

        // Turn textures (left turn per pack, L1 only)
        for (let pack = 0; pack < 3; pack++) {
            const key = `turn_${pack}`;
            const path = turnPath(pack);
            keys.push(key);
            promises.push(this._loadImage(path));
        }

        // Decorations for each pack × layer × type × piece
        for (let pack = 0; pack < 3; pack++) {
            for (let layer = 1; layer <= 2; layer++) {
                for (const type of ['door', 'windowA', 'windowB', 'windowC']) {
                    for (const piece of ['center', 'left', 'right']) {
                        const key = `deco_${pack}_${layer}_${type}_${piece}`;
                        const path = decoPath(pack, layer, type, piece);
                        keys.push(key);
                        promises.push(this._loadImage(path));
                    }
                }
            }
        }

        const results = await Promise.allSettled(promises);

        let loaded = 0;
        for (let i = 0; i < results.length; i++) {
            if (results[i].status === 'fulfilled' && results[i].value) {
                this._textures[keys[i]] = results[i].value;
                loaded++;
            }
        }

        // Consider ready if at least the L1 wall textures loaded (15 pieces)
        this._ready = loaded >= 15;
        if (!this._ready) {
            console.warn(`TextureLoader: only ${loaded}/${keys.length} textures loaded, falling back to procedural`);
        } else {
            console.log(`TextureLoader: ${loaded}/${keys.length} textures loaded, ready`);
        }
    }

    _loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => {
                console.warn('Failed to load texture:', src);
                resolve(null); // resolve with null so allSettled works cleanly
            };
            img.src = src;
        });
    }

    isReady() {
        return this._ready;
    }

    /**
     * @param {number} pack — 0, 1, or 2 (Brick 1/2/3)
     * @param {number} layer — 1 or 2
     * @param {string} piece — 'center', 'left', 'right', 'top', 'bottom'
     * @returns {HTMLImageElement|null}
     */
    getWall(pack, layer, piece) {
        return this._textures[`wall_${pack}_${layer}_${piece}`] || null;
    }

    /**
     * @param {number} pack — 0, 1, or 2
     * @param {number} layer — 1 or 2
     * @param {string} type — 'door', 'windowA', 'windowB', 'windowC'
     * @param {string} piece — 'center', 'left', 'right'
     * @returns {HTMLImageElement|null}
     */
    getDecoration(pack, layer, type, piece) {
        return this._textures[`deco_${pack}_${layer}_${type}_${piece}`] || null;
    }

    /**
     * @param {number} pack — 0, 1, or 2
     * @returns {HTMLImageElement|null} Left turn texture (flip horizontally for right turn)
     */
    getTurn(pack) {
        return this._textures[`turn_${pack}`] || null;
    }
}
