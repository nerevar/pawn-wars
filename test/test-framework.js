/**
 * Тестовый фреймворк для тестирования findBestMove
 */

const { Chess } = require('../chess.js');
const { findBestMove } = require('../engine/index.js');
const { initializeGame } = require('../game.js');

// Глобальные переменные для работы с игрой
let game = null;

/**
 * Инициализирует игру из входных данных (любой формат)
 * @param {string} boardInput - Входные данные в любом формате
 */
function setupBoard(boardInput) {
    game = new Chess();
    global.game = game;

    initializeGame(boardInput)
}

/**
 * Получает AI конфигурацию из глобальной переменной или возвращает значение по умолчанию
 * @param {number|Object} defaultValue - Значение по умолчанию
 * @returns {number|Object} AI конфигурация
 */
function getAiConfig(defaultValue) {
    if (typeof global.__aiConfig !== 'undefined' && global.__aiConfig !== null) {
        return global.__aiConfig;
    }
    return defaultValue;
}

/**
 * Запускает findBestMove с заданной конфигурацией
 * @param {number|Object} aiConfig - Конфигурация AI (число или объект). Если не указана, используется глобальная или значение по умолчанию
 * @param {boolean} getAllMoves - Получить все ходы с оценками
 * @returns {Object} Результат findBestMove
 */
function runFindBestMove(aiConfig = null, getAllMoves = false) {
    if (!game) {
        throw new Error('Game not initialized. Call setupBoard() first.');
    }
    
    // Если конфигурация не указана, используем глобальную или значение по умолчанию
    const config = aiConfig !== null ? aiConfig : getAiConfig(3);
    
    return findBestMove(config, getAllMoves);
}

// Глобальный массив для автоматической регистрации тестов текущего модуля
// Очищается перед загрузкой каждого тестового файла в run-tests.js
if (typeof global.__currentTestRegistry === 'undefined') {
    global.__currentTestRegistry = [];
}

/**
 * Тестовая функция - автоматически регистрирует тест
 * @param {string} name - Название теста
 * @param {Function} testFn - Функция теста
 */
function test(name, testFn) {
    const testCase = {
        name,
        fn: testFn
    };
    global.__currentTestRegistry.push(testCase);
    return testCase; // Возвращаем для обратной совместимости
}

/**
 * Получает все зарегистрированные тесты для текущего модуля
 * Используется в конце тестового файла: module.exports = getTests();
 * @returns {Array} Массив всех зарегистрированных тестов
 */
function getTests() {
    return global.__currentTestRegistry;
}

/**
 * Запускает один тест
 * @param {Object} testCase - Объект теста { name, fn }
 * @returns {Object} Результат выполнения теста
 */
function runTest(testCase) {
    const startTime = Date.now();
    let error = null;
    let passed = false;
    
    try {
        // Сбрасываем игру перед каждым тестом
        game = null;
        global.game = null;
        
        testCase.fn();
        passed = true;
    } catch (e) {
        error = e;
        passed = false;
    } finally {
        const duration = Date.now() - startTime;
        return {
            name: testCase.name,
            passed,
            error: error ? error.message : null,
            stack: error ? error.stack : null,
            duration
        };
    }
}

/**
 * Запускает набор тестов
 * @param {Object[]} tests - Массив тестов
 * @returns {Object} Статистика выполнения
 */
function runTests(tests) {
    const results = tests.map(runTest);
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    
    return {
        total: results.length,
        passed,
        failed,
        duration: totalDuration,
        results
    };
}

/**
 * Выводит результаты тестов в консоль
 * @param {Object} stats - Статистика выполнения тестов
 */
function printResults(stats) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS');
    console.log('='.repeat(60));
    
    stats.results.forEach(result => {
        const status = result.passed ? '✓ PASS' : '✗ FAIL';
        const color = result.passed ? '\x1b[32m' : '\x1b[31m';
        const reset = '\x1b[0m';
        
        console.log(`${color}${status}${reset} ${result.name} (${result.duration}ms)`);
        
        if (!result.passed && result.error) {
            console.log(`  Error: ${result.error}`);
            if (result.stack) {
                const stackLines = result.stack.split('\n').slice(0, 5);
                console.log('  Stack:');
                stackLines.forEach(line => console.log(`    ${line}`));
            }
        }
    });
    
    console.log('='.repeat(60));
    console.log(`Total: ${stats.total} | Passed: ${stats.passed} | Failed: ${stats.failed}`);
    console.log(`Duration: ${stats.duration}ms`);
    console.log('='.repeat(60) + '\n');
    
    return stats.failed === 0;
}

module.exports = {
    setupBoard,
    runFindBestMove,
    getAiConfig,
    test,
    getTests,
    runTest,
    runTests,
    printResults
};

