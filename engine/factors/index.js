/**
 * Индексный файл для загрузки всех факторов оценки
 * Автоматически регистрирует все факторы
 */

// Загружаем реестр
if (typeof window === 'undefined') {
    require('./FactorRegistry');
} else if (typeof window !== 'undefined') {
    // В браузере уже должен быть загружен FactorRegistry.js
}

// Функция для безопасного получения зависимостей
function getDependencies() {
    const deps = {};
    
    if (typeof window === 'undefined') {
        // Node.js
        try {
            deps.getPawns = require('../../game').getPawns;
            deps.game = require('../../game').game || (typeof global !== 'undefined' ? global.game : null);
        } catch (e) {
            // Зависимости будут доступны через global
            deps.getPawns = typeof global !== 'undefined' ? global.getPawns : null;
            deps.game = typeof global !== 'undefined' ? global.game : null;
        }
    } else if (typeof window !== 'undefined') {
        // Браузер
        deps.getPawns = window.getPawns;
        deps.game = window.game;
    }
    
    return deps;
}

// Экспортируем функцию для регистрации всех факторов
function registerAllFactors() {
    const { factorRegistry } = typeof window === 'undefined' 
        ? require('./FactorRegistry')
        : { factorRegistry: window.factorRegistry };
    
    if (!factorRegistry) {
        throw new Error('FactorRegistry is not available');
    }

    // Регистрируем факторы по одному
    // Это позволяет легко добавлять новые факторы
    
    // Загружаем все факторы Medium (основной алгоритм)
    if (typeof window === 'undefined') {
        require('./MediumPawnAdvancement');
        require('./MediumCenterColumnBonus');
        require('./MediumNextMoveSafety');
        require('./MediumFreePath');
        require('./MediumAdjacentThreat');
    } else if (typeof window !== 'undefined') {
        // В браузере факторы должны быть загружены через script теги
        // или динамически через import
    }
    
    // Остальные факторы будут загружены автоматически при require/import
    // Для браузера нужно загружать через script теги в правильном порядке
}

// Автоматическая регистрация при загрузке модуля (Node.js)
if (typeof window === 'undefined') {
    registerAllFactors();
}

// Экспорт для Node.js
if (typeof window === 'undefined') {
    module.exports = {
        registerAllFactors,
        getDependencies
    };
}

// Экспорт для браузера
if (typeof window !== 'undefined') {
    window.registerAllFactors = registerAllFactors;
    window.getFactorDependencies = getDependencies;
}

