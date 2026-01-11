/**
 * Фактор: Свободный путь (Medium)
 * Оценка: Количество пешек, перед которыми нет фигур на их вертикали.
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

class MediumFreePathFactor {
    constructor() {
        this.id = 'mediumFreePath';
        this.defaultParams = {};
        this.weights = [0, 0.1, 0.2, 0.5, 0.7, 1, 1.5, 2, 5, 10];
        this.iterateParams = {};
    }

    evaluate(color, params = {}) {
        const getPawnsFn = getPawnsFunction();
        const game = getGameFunction();
        if (!getPawnsFn || !game) {
            throw new Error('getPawns or game function is not available');
        }

        let freePathCount = 0;
        const pawns = getPawnsFn(color);
        const board = game.board();

        pawns.forEach(pawn => {
            let isPathBlocked = false;
            if (pawn.color === 'b') {
                for (let r = pawn.row + 1; r < 8; r++) {
                    if (board[r][pawn.col]) {
                        isPathBlocked = true;
                        break;
                    }
                }
            } else {
                for (let r = pawn.row - 1; r >= 0; r--) {
                    if (board[r][pawn.col]) {
                        isPathBlocked = true;
                        break;
                    }
                }
            }
            if (!isPathBlocked) {
                freePathCount++;
            }
        });
        return freePathCount;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('mediumFreePath', new MediumFreePathFactor());
    module.exports = MediumFreePathFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('mediumFreePath', new MediumFreePathFactor());
    window.MediumFreePathFactor = MediumFreePathFactor;
}

