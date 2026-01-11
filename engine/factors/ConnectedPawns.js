/**
 * Фактор: Связанные пешки (Поддерживающие друг друга)
 * Оценка: Бонус за пешки, которые защищены другими своими пешками.
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

class ConnectedPawnsFactor {
    constructor() {
        this.id = 'connectedPawns';
        this.defaultParams = {
            connectedPawnBonus: 15
        };
        this.weights = [0, 0.5, 1, 1.5, 2, 5, 10, 15, 20];
        this.iterateParams = {
            connectedPawnBonus: [0, 10, 20, 30, 50, 75, 100]
        };
    }

    evaluate(color, params = {}) {
        const { connectedPawnBonus = 15 } = { ...this.defaultParams, ...params };

        const getPawnsFn = getPawnsFunction();
        if (!getPawnsFn) {
            throw new Error('getPawns function is not available');
        }

        let score = 0;
        const myPawns = getPawnsFn(color);
        const defenseRow = color === 'w' ? 1 : -1;

        const myPawnPositions = new Set();
        myPawns.forEach(p => myPawnPositions.add(`${p.row},${p.col}`));

        myPawns.forEach(pawn => {
            let isProtected = false;
            const protectorRow = pawn.row + defenseRow;
            const protectorColLeft = pawn.col - 1;
            if (myPawnPositions.has(`${protectorRow},${protectorColLeft}`)) {
                isProtected = true;
            }
            if (!isProtected) {
                const protectorColRight = pawn.col + 1;
                if (myPawnPositions.has(`${protectorRow},${protectorColRight}`)) {
                    isProtected = true;
                }
            }

            if (isProtected) {
                score += connectedPawnBonus + Math.abs(pawn.row - (color === 'w' ? 6 : 1));
            }
        });

        return score;
    }
}

if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    factorRegistry.register('connectedPawns', new ConnectedPawnsFactor());
    module.exports = ConnectedPawnsFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    window.factorRegistry.register('connectedPawns', new ConnectedPawnsFactor());
    window.ConnectedPawnsFactor = ConnectedPawnsFactor;
}

