const { Chess } = require('./chess.js')
const { getMoves, getResultLabel, initializeGame, isFinished, drawGame, sleep } = require('./game.js');
globalThis.initializeGame = initializeGame;
globalThis.isFinished = isFinished;
globalThis.getMoves = getMoves;
globalThis.getResultLabel = getResultLabel;
globalThis.drawGame = drawGame;
globalThis.sleep = sleep;

const { run_game } = require('./ai.js');

var game = new Chess();
globalThis.game = game;
globalThis.Chess = Chess;
globalThis.gameMode = 'playerw';
globalThis.aiColor = 'b';




function runComparison(ai1, ai2, N = 1000, confidenceLevel = 0.95) {
    // 1. Разделение игр между сторонами
    const N1 = Math.floor(N / 2);
    const N2 = N - N1;

    // 2. Синхронный запуск игр
    const resultsAI1White = run_game(N1, ai1, ai2);
    const resultsAI2White = run_game(N2, ai2, ai1);

    // 3. Подсчёт побед без промежуточного маппинга
    const ai1Wins =
        resultsAI1White.filter(res => res.includes('w')).length +
        resultsAI2White.filter(res => res.includes('b')).length;

    const ai2Wins = N - ai1Wins;

    // 4. Проверка минимального количества игр
    if (ai1Wins < 10 || ai2Wins < 10) {
        console.warn('Минимальный порог в 10 побед не достигнут. Увеличьте N.');
    }

    // 5. Z-тест для одной пропорции (H0: p = 0.5)
    const p = ai1Wins / N;
    const z = (p - 0.5) / Math.sqrt(0.25 / N);
    const pVal = 2 * (1 - cumulativeStdNormal(Math.abs(z)));

    // 6. Доверительный интервал
    const zCrit = zScore(1 - (1 - confidenceLevel) / 2);
    const margin = zCrit * Math.sqrt(p * (1 - p) / N);
    const ci = [p - margin, p + margin];

    return {
        ai1: ai1Wins,
        ai2: ai2Wins,
        winRate: (p * 100).toFixed(1) + '%',
        difference: ((p - 0.5) * 100).toFixed(1) + '%',
        confidenceInterval: ci.map(v => (v * 100).toFixed(1) + '%'),
        pValue: pVal.toExponential(3),
        significant: pVal < (1 - confidenceLevel)
    };
}

// Вспомогательные математические функции
function cumulativeStdNormal(z) {
    // Аппроксимация CDF с точностью 1e-5
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - prob : prob;
}

function zScore(p) {
    // Аппроксимация обратной CDF для p > 0.5
    if (p < 0.5) return -zScore(1 - p);
    const a = [2.515517, 0.802853, 0.010328];
    const b = [1.432788, 0.189269, 0.001308];
    const t = Math.sqrt(-2 * Math.log(1 - p));
    return t - (a[0] + a[1] * t + a[2] * t * t) / (1 + b[0] * t + b[1] * t * t + b[2] * t * t * t);
}

// run_game(1, 3, 3, true)

const N = 100;
const ai1 = 4;
const ai2 = 3;

console.log(`start ${N} games`)

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