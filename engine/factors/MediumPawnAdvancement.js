/**
 * Фактор: Продвижение пешек (Medium)
 * Оценка: Сумма (8 - расстояние_до_превращения) для всех пешек
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

class MediumPawnAdvancementFactor {
    constructor() {
        this.id = 'mediumPawnAdvancement';
        this.defaultParams = {};
        this.weights = [0, 0.5, 1, 1.5, 2, 5, 10, 20, 50];
        this.iterateParams = {};
    }

    evaluate(color, params = {}) {
        const getPawnsFn = getPawnsFunction();
        if (!getPawnsFn) {
            throw new Error('getPawns function is not available');
        }

        let score = 0;
        const pawns = getPawnsFn(color);

        pawns.forEach(pawn => {
            let promotionDistance;
            if (pawn.color === 'b') {
                promotionDistance = 7 - pawn.row;
            } else {
                promotionDistance = pawn.row;
            }
            score += (8 - promotionDistance);
        });
        return score;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('mediumPawnAdvancement', new MediumPawnAdvancementFactor());
    module.exports = MediumPawnAdvancementFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('mediumPawnAdvancement', new MediumPawnAdvancementFactor());
    window.MediumPawnAdvancementFactor = MediumPawnAdvancementFactor;
}
