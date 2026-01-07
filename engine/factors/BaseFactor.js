/**
 * Базовый класс для факторов оценки позиции
 * Каждый фактор должен наследоваться от этого класса или следовать его интерфейсу
 */
class BaseFactor {
    constructor(id, defaultParams = {}) {
        this.id = id;
        this.defaultParams = defaultParams || {};
        this.weights = [0, 1];
        this.iterateParams = {};
    }

    /**
     * Оценивает позицию для указанного цвета
     * @param {string} color - 'w' или 'b'
     * @param {object} params - Параметры фактора (объединены с defaultParams)
     * @returns {number} Оценка позиции
     */
    evaluate(color, params = {}) {
        throw new Error(`Factor ${this.id} must implement evaluate method`);
    }

    /**
     * Возвращает метаданные фактора для grid search и настройки
     * @returns {object} Метаданные с weights и iterateParams
     */
    getMetadata() {
        return {
            weights: this.weights || [0, 1],
            iterateParams: this.iterateParams || {}
        };
    }
}

// Экспорт для Node.js
if (typeof window === 'undefined') {
    module.exports = BaseFactor;
}

// Экспорт для браузера
if (typeof window !== 'undefined') {
    window.BaseFactor = BaseFactor;
}
