/**
 * Модуль конфигурации ИИ
 * Создает конфигурации для разных уровней сложности
 */

/**
 * Создает конфигурацию для уровня сложности
 */
function createAIConfig(aiDifficulty) {
    const config = {
        aiDifficulty: aiDifficulty,
        depth: 4,
        factors: []
    };

    if (aiDifficulty == 1) {
        config.depth = 3;
    } else if (aiDifficulty == 2) {
        config.depth = 4;
    } else if (aiDifficulty == 3) {
        config.depth = 5;
    } else {
        config.depth = 4;
    }

    // Уровень 5: простой фактор продвижения
    if (aiDifficulty == 5) {
        config.factors = [
            { id: 'pawnAdvancement', weight: 1.0 }
        ];
    }

    if (aiDifficulty == 8) {
        config.factors = [
            { id: 'mediumPawnAdvancement', weight: 1.0 }
        ];
    }

    // Уровень 6: средние факторы (основной алгоритм)
    if (aiDifficulty == 6) {
        config.factors = [
            { id: 'mediumPawnAdvancement', weight: 2.0 },
            { id: 'mediumCenterColumnBonus', weight: 0.2 },
            { id: 'mediumNextMoveSafety', weight: 2.0 },
            { id: 'mediumFreePath', weight: 0.7 },
            { id: 'mediumAdjacentThreat', weight: -0.8 },
        ];
    }

    // Уровни 1-3 также используют средние факторы
    if (aiDifficulty >= 1 && aiDifficulty <= 3) {
        config.factors = [
            { id: 'mediumPawnAdvancement', weight: 2.0 },
            { id: 'mediumCenterColumnBonus', weight: 0.2 },
            { id: 'mediumNextMoveSafety', weight: 2.0 },
            { id: 'mediumFreePath', weight: 0.7 },
            { id: 'mediumAdjacentThreat', weight: -0.8 },
        ];
    }

    // Уровень 7: продвинутые факторы
    if (aiDifficulty == 7) {
        config.factors = [
            { id: 'pawnCount', weight: 1.0 },
            { id: 'pawnAdvancementAdvanced', weight: 1.0 },
            { id: 'passedPawnsPhaseAdaptive', weight: 2.0 },
            { id: 'promotionRace', weight: 1.5 },
            { id: 'blockedPawns', weight: -1.2 },
            { id: 'opponentBlockedPawns', weight: 0.7 },
            { id: 'pawnIslands', weight: -0.4 },
            { id: 'isolatedPawns', weight: -0.6 },
            { id: 'connectedPawns', weight: 0.4 },
            { id: 'mobility', weight: 0.2 },
            { id: 'opponentRestriction', weight: 0.3 },
            { id: 'keySquareControl', weight: 0.6 },
            { id: 'threatenedPawns', weight: -1.8 },
            { id: 'potentialCaptures', weight: 0.3 },
            { id: 'pawnMajority', weight: 0.5 },
            { id: 'openingTempo', weight: 0.1 },
        ];
    }

    return config;
}

/**
 * Нормализует конфигурацию (поддерживает как старый формат, так и новый)
 */
function normalizeConfig(configOrLevel) {
    if (typeof configOrLevel === 'object' && configOrLevel !== null) {
        // Уже объект конфигурации
        if (!configOrLevel.depth) {
            configOrLevel.depth = 4;
        }
        return configOrLevel;
    } else if (typeof configOrLevel === 'number') {
        // Уровень сложности
        return createAIConfig(configOrLevel);
    } else {
        // Дефолтная конфигурация
        return createAIConfig(2);
    }
}

// Экспорт для Node.js
if (typeof window === 'undefined') {
    module.exports = {
        createAIConfig,
        normalizeConfig
    };
}

// Экспорт для браузера
if (typeof window !== 'undefined') {
    window.createAIConfig = createAIConfig;
    window.normalizeConfig = normalizeConfig;
}

