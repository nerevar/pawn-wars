/**
 * Фактор: Пешечное большинство на фланге
 * Оценка: Бонус за наличие большего числа пешек на одном из флангов.
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

class PawnMajorityFactor {
    constructor() {
        this.id = 'pawnMajority';
        this.defaultParams = {
            majorityBonus: 20,
            centerWeight: 0.5
        };
        this.weights = [0, 0.5, 1, 1.5, 2, 5, 10, 15, 20];
        this.iterateParams = {
            majorityBonus: [0, 10, 20, 30, 50, 75, 100],
            centerWeight: [0.1, 0.2, 0.5, 0.75, 1, 1.5, 2]
        };
    }

    evaluate(color, params = {}) {
        const { majorityBonus = 20, centerWeight = 0.5 } = { ...this.defaultParams, ...params };

        const getPawnsFn = getPawnsFunction();
        if (!getPawnsFn) {
            throw new Error('getPawns function is not available');
        }

        const opponentColor = (color === 'w') ? 'b' : 'w';
        const myPawns = getPawnsFn(color);
        const opponentPawns = getPawnsFn(opponentColor);

        const countPawnsOnFlank = (pawns, minCol, maxCol) => {
            return pawns.filter(p => p.col >= minCol && p.col <= maxCol).length;
        };

        let score = 0;

        const myQueenSide = countPawnsOnFlank(myPawns, 0, 2);
        const oppQueenSide = countPawnsOnFlank(opponentPawns, 0, 2);
        if (myQueenSide > oppQueenSide) score += majorityBonus;

        const myCenter = countPawnsOnFlank(myPawns, 3, 4);
        const oppCenter = countPawnsOnFlank(opponentPawns, 3, 4);
        if (myCenter > oppCenter) score += majorityBonus * centerWeight;

        const myKingSide = countPawnsOnFlank(myPawns, 5, 7);
        const oppKingSide = countPawnsOnFlank(opponentPawns, 5, 7);
        if (myKingSide > oppKingSide) score += majorityBonus;

        return score;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('pawnMajority', new PawnMajorityFactor());
    module.exports = PawnMajorityFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('pawnMajority', new PawnMajorityFactor());
    window.PawnMajorityFactor = PawnMajorityFactor;
}

