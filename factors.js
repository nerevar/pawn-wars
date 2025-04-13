const EVALUATION_FACTORS = {
    pawnAdvancement: {
        id: 'pawnAdvancement',
        evaluate: evaluatePawnAdvancement,
        defaultParams: {
            nearPromotionBonus: 1000,
            almostNearPromotionBonus: 100,
            enemySideBonus: 50,
            rankBonusMultiplier: 10
        }
    }
}

function evaluatePawnAdvancement(color, params) {
    const {
        winScore = 10000,
        nearPromotionBonus = 1000,
        almostNearPromotionBonus = 100,
        enemySideBonus = 50,
        rankDistanceBonus = 10,
    } = params;

    // бонус за расстояние до финиша
    let score = 0;
    const promotionRow = color === 'w' ? 7 : 0;
    getPawns(color).forEach(pawn => {
        const distance = Math.abs(pawn.row - promotionRow);
        switch (distance) {
            case 0: score += winScore;  // победа
            case 1: score += nearPromotionBonus;  // предпоследний ряд - почти победа
            case 2: score += almostNearPromotionBonus;  // бонус за 6ю для белых и 3ю для черных горизонталь
            case 3: score += enemySideBonus;  // бонус за преодоление экватора
            default: score += (7 - distance) * rankDistanceBonus; // бонус за расстояние для остальных клеток
        }
    });
    return score;
}

module.exports = {
    EVALUATION_FACTORS,
}