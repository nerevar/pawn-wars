/**
 * Фактор: Контроль ключевых полей
 * Оценка: Бонус за атаку или занятие важных полей.
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

class KeySquareControlFactor {
    constructor() {
        this.id = 'keySquareControl';
        this.defaultParams = {
            controlOpponentFrontBonus: 4,
            controlPromotionApproachBonus: 8
        };
        this.weights = [0, 0.5, 1, 1.5, 2, 5, 10, 15, 20];
        this.iterateParams = {
            controlOpponentFrontBonus: [0, 1, 2, 4, 5, 7.5, 10],
            controlPromotionApproachBonus: [0, 1, 2, 4, 5, 7.5, 10],
        };
    }

    evaluate(color, params = {}) {
        const {
            controlOpponentFrontBonus = 4,
            controlPromotionApproachBonus = 8
        } = { ...this.defaultParams, ...params };

        const getPawnsFn = getPawnsFunction();
        if (!getPawnsFn || !isSafe) {
            throw new Error('Required functions are not available');
        }

        let score = 0;
        const myPawns = getPawnsFn(color);
        const opponentColor = (color === 'w') ? 'b' : 'w';
        const opponentPawns = getPawnsFn(opponentColor);
        const direction = (color === 'w') ? -1 : 1;
        const opponentDirection = -direction;
        const promotionApproachRank = (color === 'w') ? 1 : 6;

        const myAttackedSquares = new Set();
        myPawns.forEach(pawn => {
            const attackRow = pawn.row + direction;
            const attackColLeft = pawn.col - 1;
            const attackColRight = pawn.col + 1;
            if (isSafe(attackRow, attackColLeft)) {
                myAttackedSquares.add(`${attackRow},${attackColLeft}`);
            }
            if (isSafe(attackRow, attackColRight)) {
                myAttackedSquares.add(`${attackRow},${attackColRight}`);
            }
            myAttackedSquares.add(`${pawn.row},${pawn.col}`);
        });

        opponentPawns.forEach(oppPawn => {
            const oppFrontRow = oppPawn.row + opponentDirection;
            const oppFrontCol = oppPawn.col;
            if (myAttackedSquares.has(`${oppFrontRow},${oppFrontCol}`)) {
                score += controlOpponentFrontBonus;
            }
        });

        for (let c = 0; c < 8; c++) {
            if (myAttackedSquares.has(`${promotionApproachRank},${c}`)) {
                score += controlPromotionApproachBonus;
            }
        }

        return score;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('keySquareControl', new KeySquareControlFactor());
    module.exports = KeySquareControlFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('keySquareControl', new KeySquareControlFactor());
    window.KeySquareControlFactor = KeySquareControlFactor;
}
})();

