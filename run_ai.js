const { Chess} = require('./chess.js')
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


const { run_game, debug, runComparison } = require('./ai.js');
globalThis.debug = debug;

var game = new Chess();
globalThis.game = game;
globalThis.gameMode = 'playerw';
globalThis.aiColor = 'b';

globalThis.IS_DEBUG = false;
globalThis.ENABLE_LOGGING = false;


/*
Для N=500+ дает погрешность ±4% при 95% доверии
Для обнаружения эффекта 5% (55% vs 50%) требуется N≈800
Для эффекта 10% (60% vs 50%) достаточно N≈200
*/

/*
Версии aiDifficulty:
* 0/1 - Random
* 2 - Добавляется проверка на isFinished
* 3 - evaluatePawnAdvancement — бонус за расстояние до финиша
* evaluatePassedPawns - свободный проход - нет улучшения
*/

/**
 * Обрабатывает аргументы командной строки для скрипта сравнения AI.
 * Ожидает три числовых аргумента: N (количество игр), ai1 (уровень/ID первого AI), ai2 (уровень/ID второго AI).
 *
 * @throws {Error} Если количество аргументов неверное.
 * @throws {Error} Если аргументы не являются целыми числами.
 * @throws {Error} Если N не является положительным числом.
 * @returns {{N: number, ai1: number, ai2: number}} Объект с распарсенными значениями.
 */
function parseCliArguments() {
    // process.argv[0]: node executable
    // process.argv[1]: script path
    // process.argv[2...]: user arguments
    const args = process.argv.slice(2);
    const EXPECTED_ARGS_COUNT = 3;

    // 1. Проверка количества аргументов
    if (args.length !== EXPECTED_ARGS_COUNT) {
        return {}
    }

    const [nStr, ai1Str, ai2Str] = args;

    // 2. Попытка парсинга в целые числа
    const N = parseInt(nStr, 10);
    const ai1 = parseInt(ai1Str, 10);
    const ai2 = parseInt(ai2Str, 10);

    // 3. Проверка на NaN (ошибка парсинга)
    if (isNaN(N) || isNaN(ai1) || isNaN(ai2)) {
        throw new Error(
            `Invalid argument types. <N>, <ai1>, <ai2> must be integers.\nReceived: N='${nStr}', ai1='${ai1Str}', ai2='${ai2Str}'`
        );
    }

    // 4. Дополнительная валидация (N должно быть > 0)
    if (N <= 0) {
        throw new Error(
            `Invalid value for N. Number of games (N) must be positive. Received: ${N}`
        );
    }

    // 5. Возвращаем результат
    return { N, ai1, ai2 };
}


// Запуск сравнений

const {
    N = 100,
    ai1 = 6,
    ai2 = 2
} = parseCliArguments();

console.log(`start ${N} games between ai ${ai1} and ai ${ai2}`)

var t1 = performance.now()
const result = runComparison(ai1, ai2, N);
var t2 = performance.now();

console.log(`Время выполнения: ${((t2 - t1) / 1000).toFixed(2)} сек

Результат:
ai1: ${ai1}
ai2: ${ai2}
ai1 vs ai2 score: ${result.ai1} : ${result.ai2}
Доля побед (win ratio): ${result.winRate}
Преимущество (diff): ${result.difference}
Дов. интервал: ${result.confidenceInterval.join(' - ')}
p-value: ${result.pValue}
Значимо: ${result.significant ? 'Да' : 'Нет'}`);
