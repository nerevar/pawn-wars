function* cartesianProduct(arrays) {
    if (arrays.length === 0) {
        yield [];
        return;
    }

    const [first, ...rest] = arrays;
    for (const item of first) {
        for (const items of cartesianProduct(rest)) {
            yield [item, ...items];
        }
    }
}

function* generateEvaluationConfigs(evaluationFactors, maxWeightsCount = Infinity, maxParamValuesCount = Infinity) {
    const factorKeys = Object.keys(evaluationFactors);

    const factorOptions = factorKeys.map(factorKey => {
        const factor = evaluationFactors[factorKey];
        const limitedWeights = factor.weights.slice(0, maxWeightsCount);

        const weightOptions = limitedWeights.map(weight => ({ weight }));

        // Проверяем, присутствуют ли параметры для перебора
        if (!factor.iterateParams) {
            // Если параметров нет, мы просто возвращаем веса
            return weightOptions.map(option => [{ ...option, params: factor.defaultParams || {} }]);
        }

        return weightOptions.map(option => {
            if (option.weight === 0) {
                return [{ ...option, params: {} }];
            } else {
                const paramKeys = Object.keys(factor.iterateParams);
                const paramOptions = paramKeys.map(key => factor.iterateParams[key].slice(0, maxParamValuesCount));

                const paramCombos = Array.from(cartesianProduct(paramOptions)).map(combo =>
                    combo.reduce((paramsObj, value, index) => {
                        const key = paramKeys[index];
                        paramsObj[key] = value;
                        return paramsObj;
                    }, {})
                );

                return paramCombos.map(params => ({
                    ...option,
                    params: { ...factor.defaultParams, ...params }
                }));
            }
        }).reduce((acc, val) => acc.concat(val), []);
    });

    const allCombinations = cartesianProduct(factorOptions);

    for (const combo of allCombinations) {
        const config = combo.reduce((result, item, index) => {
            const key = factorKeys[index];
            result[key] = {
                id: evaluationFactors[key].id,
                weight: item.weight,
                params: item.params
            };
            return result;
        }, {});

        yield config;
    }
}

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function generateRandomEvaluationConfig(evaluationFactors) {
    const config = {};

    for (const factorName in evaluationFactors) {
        const factor = evaluationFactors[factorName];
        const randomWeight = getRandomElement(factor.weights);

        let params = {};
        if (randomWeight !== 0 && factor.iterateParams) {
            for (const paramName in factor.iterateParams) {
                params[paramName] = getRandomElement(factor.iterateParams[paramName]);
            }
        }

        config[factorName] = {
            id: factor.id,
            weight: randomWeight,
            params: randomWeight !== 0 ? { ...factor.defaultParams, ...params } : {}
        };
    }

    return config;
}


const fs = require('fs');
const path = require('path');

/**
 * Запускает Grid Search для подбора параметров оценочной функции.
 *
 * @param {object} tuningSpec - Спецификация с диапазонами параметров для перебора.
 *   Пример: { factors: [ { id: 'pawnAdvancement', weights: [1, 1.5], params: { nearBonus: [1000, 1200] } }, ... ] }
 * @param {object} options - Опции поиска.
 * @param {number} [options.N=100] - Количество игр для сравнения.
 * @param {string} [options.logFilePath='grid_search_log.txt'] - Путь к файлу лога.
 * @param {number} [options.consoleLogInterval=10] - Как часто выводить прогресс в консоль (каждые N итераций).
 */
function gridSearchEvaluationConfigs(tuningSpec, options = {}) {
    const {
        N = 100,
        logFilePath = 'grid_search_log.txt',
        consoleLogInterval = 10,
    } = options;

    // const logStream = fs.createWriteStream(path.resolve(logFilePath), { flags: 'a' }); // 'a' для добавления в файл

    function log(message) {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(path.resolve(logFilePath), `[${timestamp}] ${message}`);
        console.log(`[GridSearch] ${message}`); // Дублируем в консоль для информации
    }

    log(`Starting Grid Search...`);
    log(`N per comparison: ${N}`);
    log(`Tuning Spec: ${JSON.stringify(tuningSpec)}`);
    log(`Log file: ${path.resolve(logFilePath)}`);

    const startTime = Date.now();
    let baselineConfig = null;
    let bestConfig = null;
    // Лучший результат сравнения с baselineConfig (ai1=candidate, ai2=baseline)
    let bestComparisonResult = null;
    // Метрика для сравнения: разница в доле побед, если результат значим
    let bestScore = -Infinity;

    let count = 0;
    const totalCombinations = 10;
    // const configGenerator = generateEvaluationConfigs(tuningSpec, maxWeightsCount = 2, maxParamValuesCount = 2);
    // const configsAll = Array.from(configGenerator);

    // const totalCombinations = configsAll.length;
    // if (totalCombinations === 0) {
    //     log("Error: Tuning spec results in 0 combinations. Check your arrays.");
    //     logStream.end();
    //     return { bestConfig: baselineConfig, bestComparisonResult: null };
    // }
    log(`Total combinations to test: ${totalCombinations}`);


    // baselineConfig = 6;

    // for (const candidateConfig of configsAll) {
    while (count < totalCombinations) {
        let candidateConfig = generateRandomEvaluationConfig(tuningSpec);
        if (baselineConfig === null) {
            baselineConfig = candidateConfig;
            log(`Baseline Config: ${JSON.stringify(baselineConfig)}`);
            continue;
        }
        count++;
        const progress = ((count / totalCombinations) * 100).toFixed(2);

        if (count % consoleLogInterval === 0 || count === 1 || count === totalCombinations) {
            console.log(`[GridSearch] Progress: ${count}/${totalCombinations} (${progress}%)`);
        }

        log(`\n--- Comparison ${count}/${totalCombinations} ---\n`);
        log(`Candidate Config: ${JSON.stringify(candidateConfig)}\n`);

        // try {
        // Запускаем сравнение: candidate (ai1) vs baseline (ai2)
            // console.log(`Running comparison `, candidateConfig, baselineConfig, N);
            const comparisonResult = runComparison(candidateConfig, baselineConfig, N);
            log(`Comparison Result: ${JSON.stringify(comparisonResult)}\n`);

            if (comparisonResult.significant && comparisonResult.difference > 0) {
                // Если результат значимо лучше, сравниваем по величине преимущества (difference)
                if (comparisonResult.difference > bestScore) {
                    log(`New best config found! Score (difference): ${comparisonResult.difference.toFixed(4)} (was ${bestScore.toFixed(4)})`);
                    bestScore = comparisonResult.difference;
                    bestConfig = candidateConfig;
                    bestComparisonResult = comparisonResult;
                    log(`Status: New Best!\n`);
                } else {
                    log(`Status: Significant win, but score ${comparisonResult.difference.toFixed(4)} <= best ${bestScore.toFixed(4)}\n`);
                }
            } else {
                log(`Status: Not a significant improvement over baseline.\n`);
            }

        // } catch (error) {
        //     log(`Error during comparison ${count}: ${error.message}`);
        //     log(`Error: ${error.message}\n`);
        //     // Можно добавить логику повтора или пропуска
        // }
    }

    const endTime = Date.now();
    const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
    log(`\nGrid Search Finished.`);
    log(`Total time: ${durationSeconds} seconds.`);
    log(`Tested ${count} combinations.`);

    if (bestComparisonResult) {
        log(`Best config found: ${JSON.stringify(bestConfig)}`);
        log(`Best comparison result (vs baseline): ${JSON.stringify(bestComparisonResult)}`);
        log(`Best score (significant difference): ${bestScore.toFixed(4)}`);
    } else {
        log(`No configuration found that significantly outperforms the baseline.`);
        log(`Returning baseline configuration as 'best'.`);
        bestConfig = baselineConfig; // Возвращаем базовую, если не нашли лучше
    }

    // logStream.end(); // Закрываем поток лог-файла

    return {
        bestConfig,
        bestComparisonResult // Результат лучшего конфига против базового
    };
}



// --- Предполагаем, что у вас есть: ---
// 1. const baselineConfig = { factors: [...] }; // Ваша базовая конфигурация
// 2. function runComparison(config1, config2, N, confidenceLevel) { ... return { /*...*/ }; }
// 3. const EVALUATION_FACTORS = { ... }; // Реестр факторов
// 4. function evaluateBoard(config, nodeId, path) { ... } // Ваша функция оценки
// -----------------------------------------

// Импорты необходимых функций
const { runComparison, debug } = require('./ai.js')
globalThis.debug = debug;
const { Chess } = require('./chess.js')
globalThis.Chess = Chess;

const { getMoves, initializeGame, isFinished, drawGame, sleep, getPawns, drawBoard, extractMovesFromPGN } = require('./game.js');
globalThis.initializeGame = initializeGame;
globalThis.isFinished = isFinished;
globalThis.getMoves = getMoves;
globalThis.drawGame = drawGame;
globalThis.sleep = sleep;
globalThis.getPawns = getPawns;
globalThis.drawBoard = drawBoard;
globalThis.extractMovesFromPGN = extractMovesFromPGN;

const { EVALUATION_FACTORS } = require('./factors.js');
globalThis.EVALUATION_FACTORS = EVALUATION_FACTORS;

var game = new Chess();
globalThis.game = game;
globalThis.gameMode = 'playerw';
globalThis.aiColor = 'b';

globalThis.IS_DEBUG = false;
globalThis.ENABLE_LOGGING = false;


// --- Запуск Grid Search ---
function runSearch() {
    try {
        const result = gridSearchEvaluationConfigs(
            EVALUATION_FACTORS,
            {
                N: 20, // Уменьшим N для быстрого теста
                logFilePath: 'pawn_battle_grid_search.log',
                consoleLogInterval: 5 // Выводить прогресс чаще для теста
            }
        );

        console.log("\n--- Grid Search Complete ---");
        if (result.bestComparisonResult) {
            console.log("Best Configuration Found:");
            console.log(JSON.stringify(result.bestConfig, null, 2));
            console.log("\nComparison vs Baseline:");
            console.log(JSON.stringify(result.bestComparisonResult, null, 2));
        } else {
            console.log("No configuration significantly outperformed the baseline.");
            console.log("Best Config (returned baseline):");
            console.log(JSON.stringify(result.bestConfig, null, 2));
        }

    } catch (error) {
        console.error("Grid search failed:", error);
    }
}

runSearch();