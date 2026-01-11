/**
 * Фактор: Продвижение пешек (Улучшенный)
 * Оценка: Бонус за близость к полю превращения. Бонус растет нелинейно.
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

class PawnAdvancementAdvancedFactor {
    constructor() {
        this.id = 'pawnAdvancementAdvanced';
        this.defaultParams = {
            baseScore: 10,
            rankMultiplier: 5,
            nearGoalBonus: 100,
            veryNearGoalBonus: 500,
        };
        this.weights = [0, 0.5, 1, 1.5, 2, 5, 10];
        this.iterateParams = {
            baseScore: [0, 1, 5, 10, 20, 50],
            rankMultiplier: [0, 1, 2, 5, 10],
            nearGoalBonus: [0, 10, 20, 50, 75, 100, 150, 200],
            veryNearGoalBonus: [100, 200, 500, 750, 1000],
        };
    }

    evaluate(color, params = {}) {
        const {
            baseScore = 10,
            rankMultiplier = 5,
            nearGoalBonus = 100,
            veryNearGoalBonus = 500,
        } = { ...this.defaultParams, ...params };

        const getPawnsFn = getPawnsFunction();
        if (!getPawnsFn) {
            throw new Error('getPawns function is not available');
        }

        let score = 0;
        const pawns = getPawnsFn(color);
        const promotionRank = (color === 'w') ? 0 : 7;
        const startRank = (color === 'w') ? 6 : 1;

        pawns.forEach(pawn => {
            const currentRank = pawn.row;
            const distanceToGoal = Math.abs(currentRank - promotionRank);
            const ranksAdvanced = Math.abs(currentRank - startRank);

            let pawnScore = baseScore + ranksAdvanced * rankMultiplier;

            if (distanceToGoal === 1) {
                pawnScore += veryNearGoalBonus;
            } else if (distanceToGoal === 2) {
                pawnScore += nearGoalBonus;
            }

            score += pawnScore;
        });
        return score;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('pawnAdvancementAdvanced', new PawnAdvancementAdvancedFactor());
    module.exports = PawnAdvancementAdvancedFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('pawnAdvancementAdvanced', new PawnAdvancementAdvancedFactor());
    window.PawnAdvancementAdvancedFactor = PawnAdvancementAdvancedFactor;
}

