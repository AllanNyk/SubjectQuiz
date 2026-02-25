import { DX, DY, PLAYER_MAX_HP } from './config.js';

export class Player {
    constructor(x, y, facing) {
        this.x = x;
        this.y = y;
        this.facing = facing; // 0=N, 1=E, 2=S, 3=W
        this.hp = PLAYER_MAX_HP;
    }

    turnLeft() {
        this.facing = (this.facing + 3) % 4;
    }

    turnRight() {
        this.facing = (this.facing + 1) % 4;
    }

    getForwardPos() {
        return { x: this.x + DX[this.facing], y: this.y + DY[this.facing] };
    }

    getBackwardPos() {
        const back = (this.facing + 2) % 4;
        return { x: this.x + DX[back], y: this.y + DY[back] };
    }

    getLeftDir() {
        return (this.facing + 3) % 4;
    }

    getRightDir() {
        return (this.facing + 1) % 4;
    }

    moveForward() {
        this.x += DX[this.facing];
        this.y += DY[this.facing];
    }

    moveBackward() {
        const back = (this.facing + 2) % 4;
        this.x += DX[back];
        this.y += DY[back];
    }

    takeDamage() {
        this.hp = Math.max(0, this.hp - 1);
        return this.hp <= 0;
    }

    isAlive() {
        return this.hp > 0;
    }

    reset(x, y, facing) {
        this.x = x;
        this.y = y;
        this.facing = facing;
        this.hp = PLAYER_MAX_HP;
    }
}
