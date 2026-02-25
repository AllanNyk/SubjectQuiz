export class EnemyManager {
    constructor(positions, bossPosition) {
        // positions: array of {x, y}
        this.enemies = positions.map(p => ({ x: p.x, y: p.y, alive: true, isBoss: false }));
        if (bossPosition) {
            this.boss = { x: bossPosition.x, y: bossPosition.y, alive: true, isBoss: true };
            this.enemies.push(this.boss);
        } else {
            this.boss = null;
        }
    }

    getAt(x, y) {
        return this.enemies.find(e => e.alive && e.x === x && e.y === y) || null;
    }

    kill(enemy) {
        enemy.alive = false;
    }

    aliveCount() {
        return this.enemies.filter(e => e.alive).length;
    }

    getAlive() {
        return this.enemies.filter(e => e.alive);
    }
}
