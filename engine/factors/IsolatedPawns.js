/**
 * Фактор: Изолированные пешки
 * Оценка: Штраф за пешки, не имеющие дружественных пешек на соседних вертикалях.
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

class IsolatedPawnsFactor {
    constructor() {
        this.id = 'isolatedPawns';
        this.defaultParams = {
            isolatedPawnPenalty: 15,
            isolatedAdvancedPenalty: 10
        };
        this.weights = [0, 1, -0.5, -1, -1.5, -2, -5, -10];
        this.iterateParams = {
            isolatedPawnPenalty: [0, 1, 5, 10, 15, 20, 30],
            isolatedAdvancedPenalty: [0, 1, 5, 10, 15, 20, 30]
        };
    }

    evaluate(color, params = {}) {
        const { isolatedPawnPenalty = 15, isolatedAdvancedPenalty = 10 } = { ...this.defaultParams, ...params };

        const getPawnsFn = getPawnsFunction();
        if (!getPawnsFn) {
            throw new Error('getPawns function is not available');
        }

        let penaltyScore = 0;
        const pawns = getPawnsFn(color);
        const startRank = (color === 'w') ? 6 : 1;

        const pawnFiles = new Set(pawns.map(p => p.col));

        pawns.forEach(pawn => {
            const hasLeftNeighbor = pawnFiles.has(pawn.col - 1);
            const hasRightNeighbor = pawnFiles.has(pawn.col + 1);

            if (!hasLeftNeighbor && !hasRightNeighbor) {
                let currentPenalty = isolatedPawnPenalty;
                const ranksAdvanced = Math.abs(pawn.row - startRank);
                if (ranksAdvanced >= 3) {
                    currentPenalty += isolatedAdvancedPenalty;
                }
                penaltyScore += currentPenalty;
            }
        });

        return penaltyScore;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('isolatedPawns', new IsolatedPawnsFactor());
    module.exports = IsolatedPawnsFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('isolatedPawns', new IsolatedPawnsFactor());
    window.IsolatedPawnsFactor = IsolatedPawnsFactor;
}

