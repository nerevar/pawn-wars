/**
 * Фактор: Безопасность следующего хода (Medium)
 * Оценка: Количество пешек, которые могут безопасно пойти на 1 вперед.
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

class MediumNextMoveSafetyFactor {
    constructor() {
        this.id = 'mediumNextMoveSafety';
        this.defaultParams = {};
        this.weights = [0, 0.5, 1, 1.5, 2, 5, 10, 20, 50];
        this.iterateParams = {};
    }

    evaluate(color, params = {}) {
        const getPawnsFn = getPawnsFunction();
        const game = getGameFunction();
        if (!getPawnsFn || !game) {
            throw new Error('getPawns or game function is not available');
        }

        let nextMoveFreeCount = 0;
        const pawns = getPawnsFn(color);
        const board = game.board();

        pawns.forEach(pawn => {
            let isPotentiallyFree = false;
            let willBeSafeScore = 0;

            if (pawn.color === 'b') {
                const nextRow = pawn.row + 1;
                if (nextRow < 8 && !board[nextRow][pawn.col]) {
                    isPotentiallyFree = true;
                    const checkRow = pawn.row + 2;
                    if (checkRow < 8) {
                        const canBeCapturedFromLeft = pawn.col > 0 && board[checkRow][pawn.col - 1] && board[checkRow][pawn.col - 1].color === 'w';
                        const canBeCapturedFromRight = pawn.col < 7 && board[checkRow][pawn.col + 1] && board[checkRow][pawn.col + 1].color === 'w';
                        if (!canBeCapturedFromLeft && !canBeCapturedFromRight) {
                            willBeSafeScore = 1;
                        }
                    } else {
                        willBeSafeScore = 1;
                    }
                }
            } else {
                const nextRow = pawn.row - 1;
                if (nextRow >= 0 && !board[nextRow][pawn.col]) {
                    isPotentiallyFree = true;
                    const checkRow = pawn.row - 2;
                    if (checkRow >= 0) {
                        const canBeCapturedFromLeft = pawn.col > 0 && board[checkRow][pawn.col - 1] && board[checkRow][pawn.col - 1].color === 'b';
                        const canBeCapturedFromRight = pawn.col < 7 && board[checkRow][pawn.col + 1] && board[checkRow][pawn.col + 1].color === 'b';
                        if (!canBeCapturedFromLeft && !canBeCapturedFromRight) {
                            willBeSafeScore = 1;
                        }
                    } else {
                        willBeSafeScore = 1;
                    }
                }
            }

            if (isPotentiallyFree && willBeSafeScore === 1) {
                nextMoveFreeCount += 1;
            }
        });

        return nextMoveFreeCount;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('mediumNextMoveSafety', new MediumNextMoveSafetyFactor());
    module.exports = MediumNextMoveSafetyFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('mediumNextMoveSafety', new MediumNextMoveSafetyFactor());
    window.MediumNextMoveSafetyFactor = MediumNextMoveSafetyFactor;
}

