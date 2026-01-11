/**
 * Фактор: Ценность потенциальных взятий
 * Оценка: Суммарная ценность пешек противника, которых мы можем съесть на следующем ходу.
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

class PotentialCapturesFactor {
    constructor() {
        this.id = 'potentialCaptures';
        this.defaultParams = {
            captureBaseValue: 100,
            captureRankMultiplier: 20
        };
        this.weights = [0, 0.5, 1, 1.5, 2, 5, 10, 15, 20];
        this.iterateParams = {
            captureBaseValue: [1, 5, 10, 20, 30, 50, 75, 100, 150, 200],
            captureRankMultiplier: [0, 10, 15, 20, 25, 30, 50],
        };
    }

    evaluate(color, params = {}) {
        const captureBaseValue = params.captureBaseValue ?? 100;
        const captureRankMultiplier = params.captureRankMultiplier ?? 20;

        if (typeof captureBaseValue !== 'number' || typeof captureRankMultiplier !== 'number' || 
            isNaN(captureBaseValue) || isNaN(captureRankMultiplier)) {
            console.error(`[evaluatePotentialCaptures] Ошибка: Некорректные параметры!`);
            return 0;
        }

        const getPawnsFn = getPawnsFunction();
        const game = getGameFunction();
        if (!getPawnsFn || !game || !isSafe || !getPiece) {
            throw new Error('Required functions are not available');
        }

        let captureValueScore = 0;
        const myPawns = getPawnsFn(color);
        if (!myPawns) {
            return 0;
        }

        const opponentColor = (color === 'w') ? 'b' : 'w';
        const opponentStartRank = (opponentColor === 'w') ? 6 : 1;
        const board = game.board();
        if (!board) {
            return 0;
        }

        const direction = (color === 'w') ? -1 : 1;

        myPawns.forEach(pawn => {
            if (typeof pawn?.row !== 'number' || typeof pawn?.col !== 'number') {
                return;
            }

            const attackRow = pawn.row + direction;

            const checkCapture = (col) => {
                if (isSafe(attackRow, col)) {
                    const targetPiece = getPiece(attackRow, col, board);

                    if (targetPiece &&
                        targetPiece.color === opponentColor &&
                        targetPiece.type === 'p' &&
                        typeof targetPiece.row === 'number' &&
                        !isNaN(targetPiece.row)) {
                        const ranksAdvancedOpponent = Math.abs(targetPiece.row - opponentStartRank);
                        if (!isNaN(ranksAdvancedOpponent)) {
                            captureValueScore += captureBaseValue + ranksAdvancedOpponent * captureRankMultiplier;
                        }
                    }
                }
            };

            checkCapture(pawn.col - 1);
            checkCapture(pawn.col + 1);
        });

        if (isNaN(captureValueScore)) {
            console.error(`[evaluatePotentialCaptures] Итоговый captureValueScore стал NaN!`);
            return 0;
        }

        return captureValueScore;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('potentialCaptures', new PotentialCapturesFactor());
    module.exports = PotentialCapturesFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('potentialCaptures', new PotentialCapturesFactor());
    window.PotentialCapturesFactor = PotentialCapturesFactor;
}

