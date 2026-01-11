// ai.js - Главный файл ИИ
// Использует новую модульную структуру из engine/

var debug = {
    log: {},
    currentBranch: [],
    config: {},
    tree: {}
};

const findBestMove = require('./engine/index').findBestMove;
const makeAiMove = require('./engine/index').makeAiMove;
const evaluateBoard = require('./engine/index').evaluateBoard;


function logNodeFactors(nodeId, whiteComponents, blackComponents, finishedScore, totalScore) {
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


function run_game(cnt, ai1, ai2) {
    let stats = []
    for (var i = 0; i < cnt; ++i) {
        initializeGame()
        while (!isFinished()) {
            if (getMoves().length === 0) break;
            const currentAiLevel = game.turn() == 'w' ? ai1 : ai2;
            const { move } = findBestMove(currentAiLevel);
            if (!move) break;
            game.move(move);
        }
        stats.push(isFinished())

        process.stdout.write('.')
        ENABLE_LOGGING && logGame(ai1, ai2, isFinished(), game);
    }
    return stats;
}






function logGame(ai1, ai2, isFinished, game) {
    const fs = require('fs');
    const pgn = extractMovesFromPGN(game.pgn());
    fs.appendFileSync('games.log', `${ai1};${ai2};${isFinished};${pgn}\n`);
}

function runComparison(ai1, ai2, N = 1000, confidenceLevel = 0.95) {
    const N1 = Math.floor(N / 2);
    const N2 = N - N1;

    const resultsAI1White = run_game(N1, ai1, ai2);
    const resultsAI2White = run_game(N2, ai2, ai1);

    const ai1Wins =
        resultsAI1White.filter(res => res.includes('w')).length +
        resultsAI2White.filter(res => res.includes('b')).length;

    const ai2Wins = N - ai1Wins;
    console.log(ai1Wins, ai2Wins)

    const p = ai1Wins / N;
    const z = (p - 0.5) / Math.sqrt(0.25 / N);
    const pVal = 2 * (1 - cumulativeStdNormal(Math.abs(z)));

    const zCrit = zScore(1 - (1 - confidenceLevel) / 2);
    const margin = zCrit * Math.sqrt(p * (1 - p) / N);
    const ci = [p - margin, p + margin];

    return {
        ai1: ai1Wins,
        ai2: ai2Wins,
        winRate: p,
        difference: (p - 0.5) * 100,
        confidenceInterval: ci.map(v => (v * 100).toFixed(1) + '%'),
        pValue: pVal.toExponential(3),
        significant: pVal < (1 - confidenceLevel)
    };
}

function cumulativeStdNormal(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - prob : prob;
}

function zScore(p) {
    if (p < 0.5) return -zScore(1 - p);
    const a = [2.515517, 0.802853, 0.010328];
    const b = [1.432788, 0.189269, 0.001308];
    const t = Math.sqrt(-2 * Math.log(1 - p));
    return t - (a[0] + a[1] * t + a[2] * t * t) / (1 + b[0] * t + b[1] * t * t + b[2] * t * t * t);
}

module.exports = {
    makeAiMove,
    run_game,
    findBestMove,
    evaluateBoard,
    debug,
    runComparison,
};
