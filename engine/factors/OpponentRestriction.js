/**
 * Фактор: Ограничение противника
 * Оценка: Штраф оппоненту (т.е. бонус нам) за клетки, которые атакованы нашими пешками.
 */

(function() {
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

const { isSafe } = (typeof window === 'undefined')
    ? require('./utils')
    : (typeof window !== 'undefined' && window.FactorUtils ? window.FactorUtils : { isSafe: null });

class OpponentRestrictionFactor {
    constructor() {
        this.id = 'opponentRestriction';
        this.defaultParams = {
            attackedSquareBonus: 1,
            attackedNearOpponentBonus: 5
        };
        this.weights = [0, 0.5, 1, 1.5, 2, 5, 10, 15, 20];
        this.iterateParams = {
            attackedSquareBonus: [0, 0.5, 1, 1.5, 2, 5, 10, 15, 20],
            attackedNearOpponentBonus: [0, 0.5, 1, 1.5, 2, 5, 10, 15, 20]
        };
    }

    evaluate(color, params = {}) {
        const {
            attackedSquareBonus = 1,
            attackedNearOpponentBonus = 5
        } = { ...this.defaultParams, ...params };

        const getPawnsFn = getPawnsFunction();
        if (!getPawnsFn || !isSafe) {
            throw new Error('Required functions are not available');
        }

        let restrictionScore = 0;
        const myPawns = getPawnsFn(color);
        const opponentColor = (color === 'w') ? 'b' : 'w';
        const opponentDirection = (color === 'w') ? 1 : -1;
        const direction = (color === 'w') ? -1 : 1;

        const attackedSquares = new Set();

        myPawns.forEach(pawn => {
            const attackRow = pawn.row + direction;
            const attackColLeft = pawn.col - 1;
            if (isSafe(attackRow, attackColLeft)) {
                attackedSquares.add(`${attackRow},${attackColLeft}`);
            }
            const attackColRight = pawn.col + 1;
            if (isSafe(attackRow, attackColRight)) {
                attackedSquares.add(`${attackRow},${attackColRight}`);
            }
        });

        restrictionScore += attackedSquares.size * attackedSquareBonus;

        const opponentPawns = getPawnsFn(opponentColor);
        opponentPawns.forEach(oppPawn => {
            const oppForwardRow = oppPawn.row + opponentDirection;
            const oppForwardCol = oppPawn.col;
            if (attackedSquares.has(`${oppForwardRow},${oppForwardCol}`)) {
                restrictionScore += attackedNearOpponentBonus;
            }
        });

        return restrictionScore;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('opponentRestriction', new OpponentRestrictionFactor());
    module.exports = OpponentRestrictionFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('opponentRestriction', new OpponentRestrictionFactor());
    window.OpponentRestrictionFactor = OpponentRestrictionFactor;
}
})();

