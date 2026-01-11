/**
 * Фактор: Проходные пешки (Passed Pawns) - с адаптацией к стадии игры
 * Оценка: Большой бонус за пешки, перед которыми нет пешек противника на их и соседних вертикалях.
 * Бонус зависит от продвинутости пешки и СТАДИИ ИГРЫ.
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

const { isSafe, getPiece } = (typeof window === 'undefined')
    ? require('./utils')
    : (typeof window !== 'undefined' && window.FactorUtils ? window.FactorUtils : { isSafe: null, getPiece: null });

class PassedPawnsPhaseAdaptiveFactor {
    constructor() {
        this.id = 'passedPawnsPhaseAdaptive';
        this.defaultParams = {
            passedPawnBaseBonus: 200,
            passedPawnRankMultiplier: 50,
            nearGoalPassedBonus: 150,
            enablePhaseAdjustment: 1,
            endgameMultiplier: 2.0,
            middlegameMultiplier: 1.2,
            endgameThreshold: 8,
            middlegameThreshold: 12
        };
        this.weights = [0, 0.5, 1, 1.5, 2, 5, 10];
        this.iterateParams = {
            passedPawnBaseBonus: [100, 150, 200, 250, 500, 750, 1000],
            passedPawnRankMultiplier: [0, 10, 20, 50, 75, 100, 150],
            nearGoalPassedBonus: [0, 10, 20, 50, 100, 150, 200, 250, 300, 500],
            enablePhaseAdjustment: [0, 1],
            endgameMultiplier: [0, 0.5, 1, 1.5, 2, 5, 10],
            middlegameMultiplier: [0, 0.5, 1, 1.5, 2, 5, 10],
            endgameThreshold: [0, 1, 5, 10, 15, 20, 50],
            middlegameThreshold: [0, 1, 5, 10, 15, 20, 50]
        };
    }

    evaluate(color, params = {}) {
        const {
            passedPawnBaseBonus = 200,
            passedPawnRankMultiplier = 50,
            nearGoalPassedBonus = 150,
            enablePhaseAdjustment = 1,
            endgameMultiplier = 2.0,
            middlegameMultiplier = 1.2,
            endgameThreshold = 8,
            middlegameThreshold = 12
        } = { ...this.defaultParams, ...params };

        const getPawnsFn = getPawnsFunction();
        const game = getGameFunction();
        if (!getPawnsFn || !game || !isSafe || !getPiece) {
            throw new Error('Required functions are not available');
        }

        let score = 0;
        const pawns = getPawnsFn(color);
        const opponentColor = (color === 'w') ? 'b' : 'w';
        const board = game.board();
        const direction = (color === 'w') ? -1 : 1;
        const startRank = (color === 'w') ? 6 : 1;

        let phaseMultiplier = 1.0;
        if (enablePhaseAdjustment) {
            const totalPawns = getPawnsFn(null).length;
            if (totalPawns <= endgameThreshold) {
                phaseMultiplier = endgameMultiplier;
            } else if (totalPawns <= middlegameThreshold) {
                phaseMultiplier = middlegameMultiplier;
            }
        }

        pawns.forEach(pawn => {
            let isPassed = true;
            for (let c = pawn.col - 1; c <= pawn.col + 1; c++) {
                if (c < 0 || c > 7) continue;
                for (let r = pawn.row + direction; isSafe(r, c); r += direction) {
                    const piece = getPiece(r, c, board);
                    if (piece && piece.type === 'p' && piece.color === opponentColor) {
                        isPassed = false;
                        break;
                    }
                }
                if (!isPassed) break;
            }

            if (isPassed) {
                const ranksAdvanced = Math.abs(pawn.row - startRank);
                let pawnScore = passedPawnBaseBonus + ranksAdvanced * passedPawnRankMultiplier;
                const distanceToGoal = Math.abs(pawn.row - (color === 'w' ? 0 : 7));
                if (distanceToGoal <= 2) {
                    pawnScore += nearGoalPassedBonus;
                }
                score += pawnScore * phaseMultiplier;
            }
        });
        return score;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('passedPawnsPhaseAdaptive', new PassedPawnsPhaseAdaptiveFactor());
    module.exports = PassedPawnsPhaseAdaptiveFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('passedPawnsPhaseAdaptive', new PassedPawnsPhaseAdaptiveFactor());
    window.PassedPawnsPhaseAdaptiveFactor = PassedPawnsPhaseAdaptiveFactor;
}

