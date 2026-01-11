/**
 * Фактор: Атакуемые свои пешки
 * Оценка: Штраф за каждую нашу пешку, атакованную пешкой противника.
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

const { isSafe } = (typeof window === 'undefined')
    ? require('./utils')
    : (typeof window !== 'undefined' && window.FactorUtils ? window.FactorUtils : { isSafe: null });

class ThreatenedPawnsFactor {
    constructor() {
        this.id = 'threatenedPawns';
        this.defaultParams = {
            threatenedPenalty: 40,
            threatenedAdvancedPenalty: 60
        };
        this.weights = [0, 1, -0.5, -1, -1.5, -2, -5, -10];
        this.iterateParams = {
            threatenedPenalty: [0, 10, 20, 30, 50, 75, 100],
            threatenedAdvancedPenalty: [0, 10, 20, 30, 50, 75, 100]
        };
    }

    evaluate(color, params = {}) {
        const {
            threatenedPenalty = 40,
            threatenedAdvancedPenalty = 60
        } = { ...this.defaultParams, ...params };

        const getPawnsFn = getPawnsFunction();
        if (!getPawnsFn || !isSafe) {
            throw new Error('Required functions are not available');
        }

        let penaltyScore = 0;
        const myPawns = getPawnsFn(color);
        const opponentColor = (color === 'w') ? 'b' : 'w';
        const opponentPawns = getPawnsFn(opponentColor);
        const opponentDirection = (opponentColor === 'w') ? -1 : 1;
        const startRank = (color === 'w') ? 6 : 1;

        const opponentAttackedSquares = new Set();
        opponentPawns.forEach(oppPawn => {
            const attackRow = oppPawn.row + opponentDirection;
            const attackColLeft = oppPawn.col - 1;
            if (isSafe(attackRow, attackColLeft)) {
                opponentAttackedSquares.add(`${attackRow},${attackColLeft}`);
            }
            const attackColRight = oppPawn.col + 1;
            if (isSafe(attackRow, attackColRight)) {
                opponentAttackedSquares.add(`${attackRow},${attackColRight}`);
            }
        });

        myPawns.forEach(myPawn => {
            if (opponentAttackedSquares.has(`${myPawn.row},${myPawn.col}`)) {
                let currentPenalty = threatenedPenalty;
                const ranksAdvanced = Math.abs(myPawn.row - startRank);
                if (ranksAdvanced >= 3) {
                    currentPenalty += threatenedAdvancedPenalty;
                }
                penaltyScore += currentPenalty;
            }
        });

        return penaltyScore;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('threatenedPawns', new ThreatenedPawnsFactor());
    module.exports = ThreatenedPawnsFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('threatenedPawns', new ThreatenedPawnsFactor());
    window.ThreatenedPawnsFactor = ThreatenedPawnsFactor;
}

