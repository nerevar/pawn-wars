/**
 * Фактор: Продвижение пешек
 * Оценка: Бонус за близость к полю превращения
 */

// Функция для получения getPawns (работает и в браузере, и в Node.js)
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

class PawnAdvancementFactor {
    constructor() {
        this.id = 'pawnAdvancement';
        this.defaultParams = {
            winScore: 10000,
            nearPromotionBonus: 1000,
            almostNearPromotionBonus: 100,
            enemySideBonus: 50,
            rankDistanceBonus: 10
        };
        this.weights = [0, 0.5, 1, 1.5, 2, 5, 10];
        this.iterateParams = {
            nearPromotionBonus: [100, 500, 1000, 2000],
            almostNearPromotionBonus: [50, 100, 200, 500],
            enemySideBonus: [10, 20, 30, 50, 80, 100],
            rankDistanceBonus: [1, 5, 10, 20, 50]
        };
    }

    evaluate(color, params = {}) {
        const {
            winScore = 10000,
            nearPromotionBonus = 1000,
            almostNearPromotionBonus = 100,
            enemySideBonus = 50,
            rankDistanceBonus = 10,
        } = { ...this.defaultParams, ...params };

        const getPawnsFn = getPawnsFunction();
        if (!getPawnsFn) {
            throw new Error('getPawns function is not available');
        }

        let score = 0;
        const promotionRow = color === 'w' ? 7 : 0;
        getPawnsFn(color).forEach(pawn => {
            const distance = Math.abs(pawn.row - promotionRow);
            switch (distance) {
                case 0: score += winScore;
                case 1: score += nearPromotionBonus;
                case 2: score += almostNearPromotionBonus;
                case 3: score += enemySideBonus;
                default: score += (7 - distance) * rankDistanceBonus;
            }
        });
        return score;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('pawnAdvancement', new PawnAdvancementFactor());
    module.exports = PawnAdvancementFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('pawnAdvancement', new PawnAdvancementFactor());
    window.PawnAdvancementFactor = PawnAdvancementFactor;
}

