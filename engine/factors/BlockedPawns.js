/**
 * Фактор: Заблокированные свои пешки
 * Оценка: Штраф за каждую пешку, которая не может сделать ход вперед (упирается в фигуру).
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

class BlockedPawnsFactor {
    constructor() {
        this.id = 'blockedPawns';
        this.defaultParams = {
            blockedPenalty: 50
        };
        this.weights = [0, 1, -0.5, -1, -1.5, -2, -5, -10];
        this.iterateParams = {
            blockedPenalty: [0, 10, 20, 30, 50, 75, 100, 150, 200]
        };
    }

    evaluate(color, params = {}) {
        const { blockedPenalty = 50 } = { ...this.defaultParams, ...params };

        const getPawnsFn = getPawnsFunction();
        const game = getGameFunction();
        if (!getPawnsFn || !game || !isSafe || !getPiece) {
            throw new Error('Required functions are not available');
        }

        let blockedCount = 0;
        const pawns = getPawnsFn(color);
        const board = game.board();
        const direction = (color === 'w') ? -1 : 1;

        pawns.forEach(pawn => {
            const forwardRow = pawn.row + direction;
            if (!isSafe(forwardRow, pawn.col)) {
                return;
            }
            const frontPiece = getPiece(forwardRow, pawn.col, board);
            if (frontPiece) {
                blockedCount++;
            }
        });

        return blockedCount * blockedPenalty;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('blockedPawns', new BlockedPawnsFactor());
    module.exports = BlockedPawnsFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('blockedPawns', new BlockedPawnsFactor());
    window.BlockedPawnsFactor = BlockedPawnsFactor;
}
})();

