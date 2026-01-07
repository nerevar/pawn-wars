/**
 * Модуль оценки позиции
 * Использует зарегистрированные факторы для оценки позиции
 */

function getFactorRegistry() {
    if (typeof window === 'undefined') {
        return require('./factors/FactorRegistry').factorRegistry;
    } else if (typeof window !== 'undefined') {
        return window.factorRegistry;
    }
    throw new Error('FactorRegistry is not available');
}

/**
 * Оценивает позицию на доске
 * @param {object} config - Конфигурация с массивом factors
 * @param {string|null} nodeId - ID узла для логирования (опционально)
 * @param {Array} path - Путь ходов для логирования (опционально)
 * @returns {number} Оценка позиции (белые - черные)
 */
function evaluateBoard(config, nodeId = null, path = []) {
    const ENABLE_LOGGING = (typeof global !== 'undefined' ? global.ENABLE_LOGGING : false) ||
                          (typeof window !== 'undefined' ? window.ENABLE_LOGGING : false);
    
    if (config?.aiDifficulty === 0) {
        if (ENABLE_LOGGING && nodeId) {
            logNodeFactors(nodeId, {'random': 1}, {'random': 1}, 0, 0);
        }
        return 0;
    }

    // Проверка окончания игры
    const isFinishedFn = (typeof window === 'undefined') 
        ? require('../game').isFinished 
        : (typeof window !== 'undefined' ? window.isFinished : null);
    
    if (isFinishedFn && config?.aiDifficulty >= 4) {
        const finishedResult = isFinishedFn();
        if (finishedResult) {
            const finishedScore = checkGameEnd(finishedResult, path);
            if (finishedScore !== null) {
                if (ENABLE_LOGGING && nodeId) {
                    logNodeFactors(nodeId, {'gameEnd': 1}, {'gameEnd': 1}, finishedScore, finishedScore);
                }
                return finishedScore;
            }
        }
    }

    // Если конфиг пустой или невалидный, возвращаем 0
    if (!config || !config.factors || config.factors.length === 0) {
        if (ENABLE_LOGGING && nodeId) {
            logNodeFactors(nodeId, {'emptyConfig': 1}, {'emptyConfig': 1}, 0, 0);
        }
        return 0;
    }

    const factorRegistry = getFactorRegistry();
    let totalWhiteScore = 0;
    let totalBlackScore = 0;
    const whiteComponents = {};
    const blackComponents = {};

    // Итерация по факторам из конфигурации
    for (const factorConfig of config.factors) {
        if (factorConfig.weight === 0) {
            continue; // Пропускаем факторы с нулевым весом
        }

        const factor = factorRegistry.get(factorConfig.id);
        if (!factor) {
            console.warn(`Evaluation factor with id "${factorConfig.id}" not found.`);
            continue;
        }

        // Объединяем дефолтные параметры и параметры из конфига
        const params = {
            ...(factor.defaultParams || {}),
            ...(factorConfig.params || {})
        };

        // Вычисляем оценку для каждого цвета
        const whiteFactorScore = factor.evaluate('w', params);
        const blackFactorScore = factor.evaluate('b', params);

        // Применяем вес
        const weightedWhiteScore = whiteFactorScore * factorConfig.weight;
        const weightedBlackScore = blackFactorScore * factorConfig.weight;

        if (isNaN(weightedWhiteScore) || isNaN(weightedBlackScore)) {
            console.error('NaN in factor evaluation', factorConfig.id, {
                whiteFactorScore,
                blackFactorScore,
                weight: factorConfig.weight
            });
        }

        // Суммируем
        totalWhiteScore += weightedWhiteScore;
        totalBlackScore += weightedBlackScore;

        // Сохраняем компоненты для логирования
        if (ENABLE_LOGGING && nodeId) {
            whiteComponents[factorConfig.id] = weightedWhiteScore;
            blackComponents[factorConfig.id] = weightedBlackScore;
        }
    }

    // Финальный счет (Белые - Черные)
    const finalScore = totalWhiteScore - totalBlackScore;

    if (isNaN(finalScore)) {
        console.error('NaN in final score', { totalWhiteScore, totalBlackScore });
    }

    // Логирование
    if (ENABLE_LOGGING && nodeId) {
        logNodeFactors(nodeId, whiteComponents, blackComponents, 0, finalScore);
    }

    return finalScore;
}

/**
 * Проверяет окончание игры и возвращает оценку
 */
function checkGameEnd(isFinishedResult, path) {
    if (!isFinishedResult) {
        return null;
    }

    let score = 0;
    if (isFinishedResult.includes('w')) {
        score = +100000;
        if (path) {
            score += 100 - path.length;
        }
        return score;
    }
    if (isFinishedResult.includes('b')) {
        score = -100000;
        if (path) {
            score -= 100 - path.length;
        }
        return score;
    }

    return null;
}

/**
 * Логирует компоненты оценки узла
 */
function logNodeFactors(nodeId, whiteComponents, blackComponents, finishedScore, totalScore) {
    const debug = (typeof global !== 'undefined' ? global.debug : null) ||
                  (typeof window !== 'undefined' ? window.debug : null);
    
    if (!debug || !debug.log) {
        return;
    }

    if (!debug.log[nodeId]) {
        debug.log[nodeId] = {};
    }
    debug.log[nodeId].components = {
        white: whiteComponents,
        black: blackComponents,
        finishedScore: finishedScore,
        total: totalScore,
    };
}

// Экспорт для Node.js
if (typeof window === 'undefined') {
    module.exports = {
        evaluateBoard,
        checkGameEnd,
        logNodeFactors
    };
}

// Экспорт для браузера
if (typeof window !== 'undefined') {
    window.evaluateBoard = evaluateBoard;
    window.checkGameEnd = checkGameEnd;
    window.logNodeFactors = logNodeFactors;
}

