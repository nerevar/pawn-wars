/**
 * Фактор: Мобильность (количество легальных ходов)
 * Оценка: Бонус за общее количество доступных ходов для всех пешек.
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

class MobilityFactor {
    constructor() {
        this.id = 'mobility';
        this.defaultParams = {};
        this.weights = [0, 0.5, 1, 1.5, 2, 5, 10, 15, 20];
        this.iterateParams = {};
    }

    evaluate(color, params = {}) {
        const getPawnsFn = getPawnsFunction();
        const game = getGameFunction();
        if (!getPawnsFn || !game || !isSafe || !getPiece) {
            throw new Error('Required functions are not available');
        }

        let legalMovesCount = 0;
        const pawns = getPawnsFn(color);
        const board = game.board();
        const direction = (color === 'w') ? -1 : 1;
        const startRank = (color === 'w') ? 6 : 1;
        const opponentColor = (color === 'w') ? 'b' : 'w';

        pawns.forEach(pawn => {
            const r1 = pawn.row + direction;
            const c1 = pawn.col;
            if (isSafe(r1, c1) && !getPiece(r1, c1, board)) {
                legalMovesCount++;
                if (pawn.row === startRank) {
                    const r2 = pawn.row + 2 * direction;
                    if (isSafe(r2, c1) && !getPiece(r2, c1, board)) {
                        legalMovesCount++;
                    }
                }
            }
            const cLeft = pawn.col - 1;
            if (isSafe(r1, cLeft)) {
                const captureLeft = getPiece(r1, cLeft, board);
                if (captureLeft && captureLeft.color === opponentColor) {
                    legalMovesCount++;
                }
            }
            const cRight = pawn.col + 1;
            if (isSafe(r1, cRight)) {
                const captureRight = getPiece(r1, cRight, board);
                if (captureRight && captureRight.color === opponentColor) {
                    legalMovesCount++;
                }
            }
        });

        return legalMovesCount;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('mobility', new MobilityFactor());
    module.exports = MobilityFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('mobility', new MobilityFactor());
    window.MobilityFactor = MobilityFactor;
}
})();

