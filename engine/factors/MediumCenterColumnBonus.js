/**
 * Фактор: Бонус за центр (Medium)
 * Оценка: Количество пешек в колонках 1-6 (индексы).
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

class MediumCenterColumnBonusFactor {
    constructor() {
        this.id = 'mediumCenterColumnBonus';
        this.defaultParams = {};
        this.weights = [0, 0.1, 0.2, 0.5, 1, 1.5, 2, 5, 10];
        this.iterateParams = {};
    }

    evaluate(color, params = {}) {
        const getPawnsFn = getPawnsFunction();
        if (!getPawnsFn) {
            throw new Error('getPawns function is not available');
        }

        let count = 0;
        const pawns = getPawnsFn(color);

        pawns.forEach(pawn => {
            if (pawn.col > 0 && pawn.col < 7) {
                count++;
            }
        });
        return count;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('mediumCenterColumnBonus', new MediumCenterColumnBonusFactor());
    module.exports = MediumCenterColumnBonusFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('mediumCenterColumnBonus', new MediumCenterColumnBonusFactor());
    window.MediumCenterColumnBonusFactor = MediumCenterColumnBonusFactor;
}

