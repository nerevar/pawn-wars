/**
 * Фактор: Пешечные острова
 * Оценка: Штраф за количество изолированных групп пешек. Меньше островов = лучше структура.
 */

function getPawnsFunction() {
    if (typeof window === 'undefined') {
        try {
            return require('../../game').getPawns;
        } catch (e) {
            return typeof global !== 'undefined' ? global.getPawns : null;
        }
    } else if (typeof window !== 'undefined') {
        return window.getPawns;
    }
    return null;
}

class PawnIslandsFactor {
    constructor() {
        this.id = 'pawnIslands';
        this.defaultParams = {
            islandPenalty: 10
        };
        this.weights = [0, 1, -0.5, -1, -1.5, -2, -5, -10];
        this.iterateParams = {
            islandPenalty: [0, 1, 5, 10, 20, 30]
        };
    }

    evaluate(color, params = {}) {
        const { islandPenalty = 10 } = { ...this.defaultParams, ...params };

        const getPawnsFn = getPawnsFunction();
        if (!getPawnsFn) {
            throw new Error('getPawns function is not available');
        }

        const pawns = getPawnsFn(color);
        if (pawns.length === 0) return 0;

        const visited = new Set();
        let islandCount = 0;

        const findConnections = (pawn, currentIslandPawns) => {
            const key = `${pawn.row},${pawn.col}`;
            if (visited.has(key)) return;
            visited.add(key);

            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const neighborRow = pawn.row + dr;
                    const neighborCol = pawn.col + dc;

                    const neighborPawn = currentIslandPawns.find(p => 
                        p.row === neighborRow && p.col === neighborCol
                    );
                    if (neighborPawn) {
                        findConnections(neighborPawn, currentIslandPawns);
                    }
                }
            }
        };

        pawns.forEach(pawn => {
            if (!visited.has(`${pawn.row},${pawn.col}`)) {
                islandCount++;
                findConnections(pawn, pawns);
            }
        });

        let penalty = 0;
        if (islandCount > 1) {
            penalty = (islandCount - 1) * islandPenalty;
        }

        return penalty;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('pawnIslands', new PawnIslandsFactor());
    module.exports = PawnIslandsFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('pawnIslands', new PawnIslandsFactor());
    window.PawnIslandsFactor = PawnIslandsFactor;
}

