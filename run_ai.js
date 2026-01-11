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

// Загружаем новую систему факторов
require('./engine/factors'); // Автоматически загружает все факторы
const { factorRegistry } = require('./engine/factors/FactorRegistry');
// Для обратной совместимости создаем EVALUATION_FACTORS из реестра
globalThis.EVALUATION_FACTORS = factorRegistry.toObject();


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

let {
    N = 10,
    ai1 = 6,
    ai2 = 2
} = parseCliArguments();

ai2 = {
    "mediumPawnAdvancement":
    {
        "id": "mediumPawnAdvancement",
        "weight": 50,
        "params":
            {}
    },
    "mediumCenterColumnBonus":
    {
        "id": "mediumCenterColumnBonus",
        "weight": 0.2,
        "params":
            {}
    },
    "mediumNextMoveSafety":
    {
        "id": "mediumNextMoveSafety",
        "weight": 20,
        "params":
            {}
    },
    "mediumFreePath":
    {
        "id": "mediumFreePath",
        "weight": 0.2,
        "params":
            {}
    },
    "mediumAdjacentThreat":
    {
        "id": "mediumAdjacentThreat",
        "weight": -0.8,
        "params":
            {}
    },
    "pawnAdvancementAdvanced":
    {
        "id": "pawnAdvancementAdvanced",
        "weight": 0.5,
        "params":
        {
            "baseScore": 1,
            "rankMultiplier": 5,
            "nearGoalBonus": 20,
            "veryNearGoalBonus": 100
        }
    },
    "passedPawns":
    {
        "id": "passedPawns",
        "weight": 2,
        "params":
        {
            "passedPawnBaseBonus": 200,
            "passedPawnRankMultiplier": 20,
            "nearGoalPassedBonus": 500
        }
    },
    "passedPawnsPhaseAdaptive":
    {
        "id": "passedPawnsPhaseAdaptive",
        "weight": 5,
        "params":
        {
            "passedPawnBaseBonus": 750,
            "passedPawnRankMultiplier": 75,
            "nearGoalPassedBonus": 300,
            "enablePhaseAdjustment": 1,
            "endgameMultiplier": 0.5,
            "middlegameMultiplier": 1,
            "endgameThreshold": 0,
            "middlegameThreshold": 20
        }
    },
    "blockedPawns":
    {
        "id": "blockedPawns",
        "weight": -5,
        "params":
        {
            "blockedPenalty": 150
        }
    },
    "opponentBlockedPawns":
    {
        "id": "opponentBlockedPawns",
        "weight": 10,
        "params":
        {
            "opponentBlockedBonus": 10
        }
    },
    "mobility":
    {
        "id": "mobility",
        "weight": 15,
        "params":
            {}
    },
    "opponentRestriction":
    {
        "id": "opponentRestriction",
        "weight": 1,
        "params":
        {
            "attackedSquareBonus": 5,
            "attackedNearOpponentBonus": 2
        }
    },
    "connectedPawns":
    {
        "id": "connectedPawns",
        "weight": 2,
        "params":
        {
            "connectedPawnBonus": 75
        }
    },
    "openingTempo":
    {
        "id": "openingTempo",
        "weight": 15,
        "params":
        {
            "doubleMoveBonus": 10,
            "centerDoubleMoveBonus": 0,
            "maxEffectiveMoveNumber": 5
        }
    },
    "threatenedPawns":
    {
        "id": "threatenedPawns",
        "weight": -1,
        "params":
        {
            "threatenedPenalty": 100,
            "threatenedAdvancedPenalty": 100
        }
    },
    "potentialCaptures":
    {
        "id": "potentialCaptures",
        "weight": 0.5,
        "params":
        {
            "captureBaseValue": 1,
            "captureRankMultiplier": 30
        }
    },
    "pawnIslands":
    {
        "id": "pawnIslands",
        "weight": -10,
        "params":
        {
            "islandPenalty": 20
        }
    },
    "isolatedPawns":
    {
        "id": "isolatedPawns",
        "weight": -1,
        "params":
        {
            "isolatedPawnPenalty": 5,
            "isolatedAdvancedPenalty": 15
        }
    },
    "keySquareControl":
    {
        "id": "keySquareControl",
        "weight": 2,
        "params":
        {
            "controlOpponentFrontBonus": 5,
            "controlPromotionApproachBonus": 10
        }
    },
    "promotionRace":
    {
        "id": "promotionRace",
        "weight": 20,
        "params":
        {
            "raceWinBonus": 150,
            "raceAdvantageMultiplier": 4
        }
    },
    "pawnMajority":
    {
        "id": "pawnMajority",
        "weight": 1.5,
        "params":
        {
            "majorityBonus": 100,
            "centerWeight": 1
        }
    }
}

console.log(`start ${N} games between ai ${ai1} and ai ${ai2}`)

var t1 = performance.now()
const result = runComparison(ai1, { factors: Object.entries(ai2).map(x => x[1]) }, N);
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
