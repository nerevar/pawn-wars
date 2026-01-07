/**
 * ПРИМЕР: Как создать новый фактор оценки позиции
 * 
 * Этот файл демонстрирует, как легко добавить новый фактор оценки.
 * Просто скопируйте этот файл, измените логику и зарегистрируйте фактор.
 */

// Получаем зависимости (работает и в браузере, и в Node.js)
const getPawns = (typeof window === 'undefined') 
    ? require('../../game').getPawns 
    : (typeof window !== 'undefined' ? window.getPawns : null);

class ExampleNewFactor {
    constructor() {
        // Уникальный идентификатор фактора
        this.id = 'exampleNewFactor';
        
        // Параметры по умолчанию
        this.defaultParams = {
            bonusPerPawn: 10,
            advancedBonus: 5
        };
        
        // Возможные веса для grid search
        this.weights = [0, 0.5, 1, 1.5, 2, 5, 10];
        
        // Параметры для перебора в grid search
        this.iterateParams = {
            bonusPerPawn: [5, 10, 15, 20],
            advancedBonus: [0, 5, 10, 15]
        };
    }

    /**
     * Основной метод оценки
     * @param {string} color - 'w' (белые) или 'b' (черные)
     * @param {object} params - Параметры фактора (объединены с defaultParams)
     * @returns {number} Оценка позиции для указанного цвета
     */
    evaluate(color, params = {}) {
        // Объединяем параметры по умолчанию с переданными
        const {
            bonusPerPawn = 10,
            advancedBonus = 5
        } = { ...this.defaultParams, ...params };

        // Получаем функцию getPawns
        const getPawnsFn = getPawns || (typeof global !== 'undefined' ? global.getPawns : null);
        if (!getPawnsFn) {
            throw new Error('getPawns function is not available');
        }

        // Получаем все пешки указанного цвета
        const pawns = getPawnsFn(color);
        
        // Пример логики: бонус за каждую пешку + дополнительный бонус за продвинутые
        let score = 0;
        const promotionRow = color === 'w' ? 7 : 0;
        
        pawns.forEach(pawn => {
            score += bonusPerPawn;
            
            // Дополнительный бонус за продвинутые пешки
            const distance = Math.abs(pawn.row - promotionRow);
            if (distance <= 2) {
                score += advancedBonus;
            }
        });

        return score;
    }
}

// Автоматическая регистрация фактора
if (typeof window === 'undefined') {
    const { factorRegistry } = require('./FactorRegistry');
    // Раскомментируйте следующую строку, чтобы зарегистрировать фактор:
    // factorRegistry.register('exampleNewFactor', new ExampleNewFactor());
    module.exports = ExampleNewFactor;
} else if (typeof window !== 'undefined' && window.factorRegistry) {
    // Раскомментируйте следующую строку, чтобы зарегистрировать фактор:
    // window.factorRegistry.register('exampleNewFactor', new ExampleNewFactor());
    window.ExampleNewFactor = ExampleNewFactor;
}

