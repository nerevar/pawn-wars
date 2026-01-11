/**
 * Фактор: Блокировка пешек противника
 * Оценка: Бонус за каждую пешку противника, которая блокирована НАШЕЙ пешкой.
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

function getGameFunction() {
    if (typeof window === 'undefined') {
        return typeof global !== 'undefined' ? global.game : null;
    } else if (typeof window !== 'undefined') {
        return window.game;
    }
    return null;
}

const { isSafe, getPiece } = (typeof window === 'undefined')
    ? require('./utils')
    : (typeof window !== 'undefined' && window.FactorUtils ? window.FactorUtils : { isSafe: null, getPiece: null });

class OpponentBlockedPawnsFactor {
    constructor() {
        this.id = 'opponentBlockedPawns';
        this.defaultParams = {
            opponentBlockedBonus: 40
        };
        this.weights = [0, 0.5, 1, 1.5, 2, 5, 10];
        this.iterateParams = {
            opponentBlockedBonus: [0, 10, 20, 30, 50, 75, 100, 150, 200]
        };
    }

    evaluate(color, params = {}) {
        const { opponentBlockedBonus = 40 } = { ...this.defaultParams, ...params };

        const getPawnsFn = getPawnsFunction();
        const game = getGameFunction();
        if (!getPawnsFn || !game || !isSafe || !getPiece) {
            throw new Error('Required functions are not available');
        }

        let blockedOpponentCount = 0;
        const opponentColor = (color === 'w') ? 'b' : 'w';
        const opponentPawns = getPawnsFn(opponentColor);
        const board = game.board();
        const opponentDirection = (opponentColor === 'w') ? -1 : 1;

        opponentPawns.forEach(oppPawn => {
            const forwardRow = oppPawn.row + opponentDirection;
            if (!isSafe(forwardRow, oppPawn.col)) return;

            const frontPiece = getPiece(forwardRow, oppPawn.col, board);
            if (frontPiece && frontPiece.type === 'p' && frontPiece.color === color) {
                blockedOpponentCount++;
            }
        });

        return blockedOpponentCount * opponentBlockedBonus;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('opponentBlockedPawns', new OpponentBlockedPawnsFactor());
    module.exports = OpponentBlockedPawnsFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('opponentBlockedPawns', new OpponentBlockedPawnsFactor());
    window.OpponentBlockedPawnsFactor = OpponentBlockedPawnsFactor;
}
})();

