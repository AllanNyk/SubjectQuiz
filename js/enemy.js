export class EnemyManager {
    constructor(positions, bossPosition, casePositions) {
        // positions: array of {x, y} for regular enemies
        this.enemies = positions.map(p => ({ x: p.x, y: p.y, alive: true, isBoss: false, isCase: false }));
        // casePositions: array of {x, y} for case enemies (mini-boss style)
        if (casePositions) {
            for (const p of casePositions) {
                this.enemies.push({ x: p.x, y: p.y, alive: true, isBoss: false, isCase: true });
            }
        }
        if (bossPosition) {
            this.boss = { x: bossPosition.x, y: bossPosition.y, alive: true, isBoss: true, isCase: false };
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
