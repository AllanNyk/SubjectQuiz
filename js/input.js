// Queued input handler — one action per key press, no key-repeat flooding

export class InputHandler {
    constructor() {
        this.actions = [];
        this.keysDown = {};

        this._onKeyDown = (e) => {
            if (this.keysDown[e.code]) return; // ignore repeat
            this.keysDown[e.code] = true;

            const action = this._mapKey(e.code);
            if (action) {
                e.preventDefault();
                this.actions.push(action);
            }
        };

        this._onKeyUp = (e) => {
            this.keysDown[e.code] = false;
        };

        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
    }

    _mapKey(code) {
        switch (code) {
            case 'KeyW': case 'ArrowUp':    return 'FORWARD';
            case 'KeyS': case 'ArrowDown':  return 'BACKWARD';
            case 'KeyA': case 'ArrowLeft':  return 'TURN_LEFT';
            case 'KeyD': case 'ArrowRight': return 'TURN_RIGHT';
            case 'Digit1': return 'ANSWER_0';
            case 'Digit2': return 'ANSWER_1';
            case 'Digit3': return 'ANSWER_2';
            case 'Digit4': return 'ANSWER_3';
            case 'Enter': case 'Space': return 'CONFIRM';
            case 'Escape': return 'ESCAPE';
            case 'KeyL': return 'LOG';
            case 'KeyB': return 'LEADERBOARD';
            case 'KeyT': return 'TOGGLE_TIMER';
            case 'Backspace': return 'BACK';
            case 'F1': return 'DEBUG_LEVEL1';
            case 'F2': return 'DEBUG_LEVEL2';
            case 'F3': return 'DEBUG_LEVEL3';
            default: return null;
        }
    }

    // Get and remove the next queued action
    poll() {
        return this.actions.shift() || null;
    }

    // Push a synthetic action (used by on-screen buttons)
    push(action) {
        this.actions.push(action);
    }

    // Clear all queued input
    flush() {
        this.actions.length = 0;
    }

    destroy() {
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
    }
}
