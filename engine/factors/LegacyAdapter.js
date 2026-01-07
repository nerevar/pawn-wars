/**
 * Адаптер для обратной совместимости с существующим factors.js
 * Позволяет загружать факторы из старого формата
 */

function loadLegacyFactors(legacyFactorsObject) {
    const { factorRegistry } = typeof window === 'undefined'
        ? require('./FactorRegistry')
        : { factorRegistry: window.factorRegistry };
    
    if (!factorRegistry) {
        throw new Error('FactorRegistry is not available');
    }

    // Преобразуем старый формат в новый
    for (const [id, factorDef] of Object.entries(legacyFactorsObject)) {
        const factor = {
            id: factorDef.id || id,
            defaultParams: factorDef.defaultParams || {},
            weights: factorDef.weights || [0, 1],
            iterateParams: factorDef.iterateParams || {},
            evaluate: factorDef.evaluate
        };
        
        factorRegistry.register(id, factor);
    }
}

// Экспорт для Node.js
if (typeof window === 'undefined') {
    module.exports = {
        loadLegacyFactors
    };
}

// Экспорт для браузера
if (typeof window !== 'undefined') {
    window.loadLegacyFactors = loadLegacyFactors;
}

