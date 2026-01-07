/**
 * Фактор: Количество пешек
 * Оценка: Материальное преимущество - количество пешек на доске
 */

// Функция для получения getPawns (работает и в браузере, и в Node.js)
function getPawnsFunction() {
    if (typeof window === 'undefined') {
        try {
            return require('../../game').getPawns;
        } catch (e) {
            // В Node.js может быть доступен через global
            return typeof global !== 'undefined' ? global.getPawns : null;
        }
    } else if (typeof window !== 'undefined') {
        return window.getPawns;
    }
    return null;
}

class PawnCountFactor {
    constructor() {
        this.id = 'pawnCount';
        this.defaultParams = {
            pawnValue: 100
        };
        this.weights = [0, 0.5, 1, 1.5, 2, 5, 10];
        this.iterateParams = {
            pawnValue: [1, 10, 50, 100, 200]
        };
    }

    evaluate(color, params = {}) {
        const { pawnValue = 100 } = { ...this.defaultParams, ...params };
        const getPawnsFn = getPawnsFunction();
        if (!getPawnsFn) {
            throw new Error('getPawns function is not available');
        }
        const count = getPawnsFn(color).length;
        return count * pawnValue;
    }
}

// Регистрация фактора
if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('pawnCount', new PawnCountFactor());
    module.exports = PawnCountFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('pawnCount', new PawnCountFactor());
    window.PawnCountFactor = PawnCountFactor;
}

