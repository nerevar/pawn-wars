/**
 * Фактор: Темп в дебюте (Двойные ходы)
 * Оценка: Небольшой бонус за сделанные двойные ходы пешками (особенно центральными).
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

class OpeningTempoFactor {
    constructor() {
        this.id = 'openingTempo';
        this.defaultParams = {
            doubleMoveBonus: 5,
            centerDoubleMoveBonus: 8,
            maxEffectiveMoveNumber: 5
        };
        this.weights = [0, 0.5, 1, 1.5, 2, 5, 10, 15, 20];
        this.iterateParams = {
            doubleMoveBonus: [0, 0.5, 1, 1.5, 2, 5, 10, 15, 20],
            centerDoubleMoveBonus: [0, 0.5, 1, 1.5, 2, 5, 10, 15, 20],
            maxEffectiveMoveNumber: [0, 0.5, 1, 1.5, 2, 5, 10, 15, 20]
        };
    }

    evaluate(color, params = {}) {
        const {
            doubleMoveBonus = 5,
            centerDoubleMoveBonus = 8,
            maxEffectiveMoveNumber = 5
        } = { ...this.defaultParams, ...params };

        const game = getGameFunction();
        if (!game) {
            throw new Error('game function is not available');
        }

        const currentMoveNumber = typeof game.moveNumber === 'function' ? game.moveNumber() : 100;

        if (currentMoveNumber > maxEffectiveMoveNumber) {
            return 0;
        }

        const getPawnsFn = getPawnsFunction();
        if (!getPawnsFn) {
            throw new Error('getPawns function is not available');
        }

        let score = 0;
        const pawns = getPawnsFn(color);
        const expectedDoubleRank = (color === 'w') ? 4 : 3;

        pawns.forEach(pawn => {
            if (pawn.row === expectedDoubleRank) {
                if (pawn.col >= 2 && pawn.col <= 5) {
                    score += centerDoubleMoveBonus;
                } else {
                    score += doubleMoveBonus;
                }
            }
        });

        return score;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('openingTempo', new OpeningTempoFactor());
    module.exports = OpeningTempoFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('openingTempo', new OpeningTempoFactor());
    window.OpeningTempoFactor = OpeningTempoFactor;
}

