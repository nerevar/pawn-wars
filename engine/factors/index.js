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
        try {
            deps.getPawns = require('../../game').getPawns;
            deps.game = typeof global !== 'undefined' ? global.game : null;
        } catch (e) {
            deps.getPawns = typeof global !== 'undefined' ? global.getPawns : null;
            deps.game = typeof global !== 'undefined' ? global.game : null;
        }
    } else if (typeof window !== 'undefined') {
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
    // В Node.js факторы регистрируются автоматически при require
    // В браузере факторы должны быть загружены через script теги
}

// Автоматическая регистрация при загрузке модуля (Node.js)
if (typeof window === 'undefined') {
    // Загружаем все факторы
    require('./PawnCount');
    require('./PawnAdvancement');
    require('./PawnAdvancementAdvanced');
    require('./MediumPawnAdvancement');
    require('./MediumCenterColumnBonus');
    require('./MediumNextMoveSafety');
    require('./MediumFreePath');
    require('./MediumAdjacentThreat');
    require('./PassedPawnsPhaseAdaptive');
    require('./PromotionRace');
    require('./BlockedPawns');
    require('./OpponentBlockedPawns');
    require('./PawnIslands');
    require('./IsolatedPawns');
    require('./ConnectedPawns');
    require('./Mobility');
    require('./OpponentRestriction');
    require('./KeySquareControl');
    require('./ThreatenedPawns');
    require('./PotentialCaptures');
    require('./PawnMajority');
    require('./OpeningTempo');
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
