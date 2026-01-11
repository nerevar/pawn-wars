#!/usr/bin/env node

/**
 * Скрипт для запуска тестов
 * 
 * Использование:
 *   node test/run-tests.js                                    # Запустить все тесты
 *   node test/run-tests.js example.test.js                    # Запустить конкретный файл
 *   node test/run-tests.js --filter "PawnCount"               # Запустить тесты с "PawnCount" в названии
 *   node test/run-tests.js factors.test.js --filter "Blocked" # Запустить тесты из файла с "Blocked" в названии
 *   node test/run-tests.js --ai-config 7                     # Запустить тесты с AI difficulty 7
 *   node test/run-tests.js --ai-difficulty 5                 # Альтернативный способ указать difficulty
 */

const { runTests, printResults } = require('./test-framework.js');
const path = require('path');
const fs = require('fs');

// Инициализация глобальных переменных для работы с игрой
const { Chess } = require('../chess.js');
global.Chess = Chess;

const { initializeGame, getMoves, isFinished } = require('../game.js');
global.initializeGame = initializeGame;
global.getMoves = getMoves;
global.isFinished = isFinished;

// Загружаем систему факторов
require('../engine/factors');
const { factorRegistry } = require('../engine/factors/FactorRegistry');
global.EVALUATION_FACTORS = factorRegistry.toObject();

// Инициализируем игру
global.game = new Chess();
global.gameMode = 'playerw';
global.aiColor = 'b';

// Получаем аргументы командной строки
const args = process.argv.slice(2);

// Парсим аргументы
let testFile = null;
let filterPattern = null;
let aiConfig = null;

for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--filter' || arg === '-f') {
        if (i + 1 < args.length) {
            filterPattern = args[i + 1];
            i++; // Пропускаем следующий аргумент, так как он уже использован
        } else {
            console.error('Error: --filter requires a pattern');
            process.exit(1);
        }
    } else if (arg === '--ai-config' || arg === '--ai-difficulty') {
        if (i + 1 < args.length) {
            const configValue = args[i + 1];
            // Пытаемся распарсить как число или JSON объект
            if (!isNaN(configValue)) {
                aiConfig = parseInt(configValue, 10);
            } else {
                try {
                    aiConfig = JSON.parse(configValue);
                } catch (e) {
                    console.error(`Error: Invalid AI config value: ${configValue}`);
                    console.error('Expected a number or valid JSON object');
                    process.exit(1);
                }
            }
            i++; // Пропускаем следующий аргумент
        } else {
            console.error(`Error: ${arg} requires a value`);
            process.exit(1);
        }
    } else if (!testFile && !arg.startsWith('-')) {
        // Первый позиционный аргумент без дефиса - это имя файла
        testFile = arg;
    } else if (arg.startsWith('-')) {
        console.error(`Error: Unknown option: ${arg}`);
        process.exit(1);
    }
}

// Устанавливаем глобальную переменную для AI конфигурации
if (aiConfig !== null) {
    global.__aiConfig = aiConfig;
    console.log(`AI Config set to: ${JSON.stringify(aiConfig)}`);
}

// Функция для загрузки тестов из файла
function loadTests(testFilePath) {
    const fullPath = path.resolve(__dirname, testFilePath);
    
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Test file not found: ${fullPath}`);
    }
    
    // Очищаем кэш модуля, чтобы можно было перезагружать тесты
    delete require.cache[require.resolve(fullPath)];
    
    // Очищаем реестр тестов перед загрузкой нового модуля
    global.__currentTestRegistry = [];
    
    const testModule = require(fullPath);
    
    // Если модуль экспортирует массив тестов (явный экспорт)
    if (Array.isArray(testModule)) {
        return testModule;
    }
    
    // Если модуль экспортирует объект с тестами
    if (typeof testModule === 'object' && testModule !== null) {
        return Object.values(testModule);
    }
    
    // Если модуль ничего не экспортирует, используем автоматически собранные тесты
    if (global.__currentTestRegistry.length > 0) {
        return global.__currentTestRegistry;
    }
    
    throw new Error(`Test file must export tests or register them via test() function. Got: ${typeof testModule}`);
}

// Функция для поиска всех тестовых файлов
function findTestFiles() {
    const testDir = __dirname;
    const files = fs.readdirSync(testDir);
    
    return files
        .filter(file => file.endsWith('.test.js'))
        .map(file => path.relative(__dirname, path.join(testDir, file)));
}

// Главная функция
function main() {
    let testFiles = [];
    
    if (testFile) {
        // Запускаем конкретный файл
        testFiles = [testFile];
    } else {
        // Запускаем все тестовые файлы
        testFiles = findTestFiles();
    }
    
    if (testFiles.length === 0) {
        console.log('No test files found.');
        process.exit(1);
    }
    
    console.log(`Found ${testFiles.length} test file(s): ${testFiles.join(', ')}\n`);
    
    let allResults = [];
    
    for (const testFile of testFiles) {
        console.log(`Running tests from: ${testFile}`);
        console.log('-'.repeat(60));
        
        try {
            let tests = loadTests(testFile);
            
            // Фильтруем тесты по подстроке в названии, если указан фильтр
            if (filterPattern) {
                const originalCount = tests.length;
                tests = tests.filter(test => 
                    test.name && test.name.toLowerCase().includes(filterPattern.toLowerCase())
                );
                if (tests.length === 0) {
                    console.log(`No tests found matching pattern: "${filterPattern}"`);
                    console.log(`(Filtered from ${originalCount} test(s))`);
                } else {
                    console.log(`Filtering tests by pattern: "${filterPattern}"`);
                    console.log(`Running ${tests.length} of ${originalCount} test(s)`);
                }
            }
            
            const stats = runTests(tests);
            allResults.push({ file: testFile, stats });
            printResults(stats);
        } catch (error) {
            console.error(`\nError loading/running tests from ${testFile}:`);
            console.error(error.message);
            console.error(error.stack);
            allResults.push({ 
                file: testFile, 
                stats: { 
                    total: 0, 
                    passed: 0, 
                    failed: 1, 
                    duration: 0,
                    results: [{ 
                        name: 'Test file load', 
                        passed: false, 
                        error: error.message,
                        stack: error.stack,
                        duration: 0
                    }]
                } 
            });
        }
    }
    
    // Итоговая статистика
    const totalStats = {
        total: allResults.reduce((sum, r) => sum + r.stats.total, 0),
        passed: allResults.reduce((sum, r) => sum + r.stats.passed, 0),
        failed: allResults.reduce((sum, r) => sum + r.stats.failed, 0),
        duration: allResults.reduce((sum, r) => sum + r.stats.duration, 0)
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total tests: ${totalStats.total}`);
    console.log(`Passed: ${totalStats.passed}`);
    console.log(`Failed: ${totalStats.failed}`);
    console.log(`Total duration: ${totalStats.duration}ms`);
    console.log('='.repeat(60) + '\n');
    
    // Возвращаем код выхода
    process.exit(totalStats.failed > 0 ? 1 : 0);
}

// Запускаем тесты
main();

