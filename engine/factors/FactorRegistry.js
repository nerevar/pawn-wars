/**
 * Реестр факторов оценки позиции
 * Позволяет регистрировать и получать факторы для оценки
 * Работает как в браузере, так и в Node.js
 */
class FactorRegistry {
    constructor() {
        this.factors = new Map();
    }

    /**
     * Регистрирует фактор оценки
     * @param {string} id - Уникальный идентификатор фактора
     * @param {object} factor - Объект фактора с методами evaluate, getMetadata и т.д.
     */
    register(id, factor) {
        if (this.factors.has(id)) {
            console.warn(`Factor ${id} is already registered. Overwriting...`);
        }
        this.factors.set(id, factor);
    }

    /**
     * Получает фактор по идентификатору
     * @param {string} id - Идентификатор фактора
     * @returns {object|null} Фактор или null, если не найден
     */
    get(id) {
        return this.factors.get(id) || null;
    }

    /**
     * Проверяет, зарегистрирован ли фактор
     * @param {string} id - Идентификатор фактора
     * @returns {boolean}
     */
    has(id) {
        return this.factors.has(id);
    }

    /**
     * Возвращает все зарегистрированные факторы
     * @returns {Map} Map всех факторов
     */
    getAll() {
        return this.factors;
    }

    /**
     * Возвращает объект со всеми факторами (для обратной совместимости)
     * @returns {object} Объект с факторами
     */
    toObject() {
        const obj = {};
        for (const [id, factor] of this.factors) {
            obj[id] = {
                id: factor.id || id,
                evaluate: factor.evaluate.bind(factor),
                defaultParams: factor.defaultParams || {},
                weights: factor.weights || [0, 1],
                iterateParams: factor.iterateParams || {}
            };
        }
        return obj;
    }
}

// Создаем глобальный экземпляр реестра
const factorRegistry = new FactorRegistry();

// Экспорт для Node.js
if (typeof window === 'undefined') {
    module.exports = { FactorRegistry, factorRegistry };
}

// Экспорт для браузера
if (typeof window !== 'undefined') {
    window.FactorRegistry = FactorRegistry;
    window.factorRegistry = factorRegistry;
}

