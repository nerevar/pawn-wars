/**
 * Фактор: Боковая угроза (Medium)
 * Оценка: Количество ситуаций, когда вражеская пешка находится на той же строке рядом.
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

function getGameFunction() {
    if (typeof window === 'undefined') {
        return typeof global !== 'undefined' ? global.game : null;
    } else if (typeof window !== 'undefined') {
        return window.game;
    }
    return null;
}

class MediumAdjacentThreatFactor {
    constructor() {
        this.id = 'mediumAdjacentThreat';
        this.defaultParams = {};
        this.weights = [0, -5, -2, -1.5, -1, -0.8, -0.5, -0.2, -0.1];
        this.iterateParams = {};
    }

    evaluate(color, params = {}) {
        const getPawnsFn = getPawnsFunction();
        const game = getGameFunction();
        if (!getPawnsFn || !game) {
            throw new Error('getPawns or game function is not available');
        }

        let threatCount = 0;
        const pawns = getPawnsFn(color);
        const opponentColor = color === 'w' ? 'b' : 'w';
        const board = game.board();

        pawns.forEach(pawn => {
            if (pawn.col > 0 && board[pawn.row][pawn.col - 1] && 
                board[pawn.row][pawn.col - 1].color === opponentColor && 
                board[pawn.row][pawn.col - 1].type === 'p') {
                threatCount++;
            }
            if (pawn.col < 7 && board[pawn.row][pawn.col + 1] && 
                board[pawn.row][pawn.col + 1].color === opponentColor && 
                board[pawn.row][pawn.col + 1].type === 'p') {
                threatCount++;
            }
        });
        return threatCount;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('mediumAdjacentThreat', new MediumAdjacentThreatFactor());
    module.exports = MediumAdjacentThreatFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('mediumAdjacentThreat', new MediumAdjacentThreatFactor());
    window.MediumAdjacentThreatFactor = MediumAdjacentThreatFactor;
}

