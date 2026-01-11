/**
 * Фактор: Гонка проходных
 * Оценка: Сравнивает "скорость" лучших проходных пешек обеих сторон.
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

class PromotionRaceFactor {
    constructor() {
        this.id = 'promotionRace';
        this.defaultParams = {
            raceWinBonus: 300,
            raceAdvantageMultiplier: 50
        };
        this.weights = [0, 0.5, 1, 1.5, 2, 5, 10, 15, 20];
        this.iterateParams = {
            raceWinBonus: [0, 10, 20, 50, 100, 150, 200, 300, 400, 500, 750, 1000],
            raceAdvantageMultiplier: [1, 2, 4, 5, 10, 15, 20, 30, 40, 50]
        };
    }

    evaluate(color, params = {}) {
        const {
            raceWinBonus = 300,
            raceAdvantageMultiplier = 50
        } = { ...this.defaultParams, ...params };

        const getPawnsFn = getPawnsFunction();
        const game = getGameFunction();
        if (!getPawnsFn || !game || !isSafe || !getPiece) {
            throw new Error('Required functions are not available');
        }

        const opponentColor = (color === 'w') ? 'b' : 'w';
        const board = game.board();

        const findBestRacer = (playerColor) => {
            const pawns = getPawnsFn(playerColor);
            const playerDirection = (playerColor === 'w') ? -1 : 1;
            const playerPromotionRank = (playerColor === 'w') ? 0 : 7;
            let bestDistance = Infinity;

            pawns.forEach(pawn => {
                let isPathClear = true;
                for (let r = pawn.row + playerDirection; isSafe(r, pawn.col); r += playerDirection) {
                    if (getPiece(r, pawn.col, board)) {
                        isPathClear = false;
                        break;
                    }
                }

                if (isPathClear) {
                    const distance = Math.abs(pawn.row - playerPromotionRank);
                    if (distance < bestDistance) {
                        bestDistance = distance;
                    }
                }
            });
            return bestDistance;
        };

        const myBestDistance = findBestRacer(color);
        const opponentBestDistance = findBestRacer(opponentColor);

        if (myBestDistance === Infinity && opponentBestDistance === Infinity) {
            return 0;
        }

        let score = 0;
        if (myBestDistance <= opponentBestDistance) {
            score += raceWinBonus;
            if (opponentBestDistance !== Infinity) {
                score += (opponentBestDistance - myBestDistance) * raceAdvantageMultiplier;
            }
        }

        if (game.turn() === color && myBestDistance === 1 && myBestDistance < opponentBestDistance) {
            score *= 1.5;
        }

        return score;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('promotionRace', new PromotionRaceFactor());
    module.exports = PromotionRaceFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('promotionRace', new PromotionRaceFactor());
    window.PromotionRaceFactor = PromotionRaceFactor;
}

