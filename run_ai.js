// run_ai.js — Tournament runner for comparing AI strategies
// Usage:
//   node run_ai.js compare <strategy1> <strategy2> [N=100]
//   node run_ai.js list
//   node run_ai.js compare medium mediumPlusMajority 500

const { Chess } = require('./chess.js');
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

const { STRATEGIES, difficultyToStrategy, checkGameEnd, evaluateBoardMedium, evaluatePawnAdvancement, evaluatePawnCount, evaluateCaptureOpportunities, evaluateFreePath, evaluateMajority, getMajorityRowsScore } = require('./strategies.js');
globalThis.STRATEGIES = STRATEGIES;
globalThis.difficultyToStrategy = difficultyToStrategy;
globalThis.checkGameEnd = checkGameEnd;
globalThis.evaluateBoardMedium = evaluateBoardMedium;
globalThis.evaluatePawnAdvancement = evaluatePawnAdvancement;
globalThis.evaluatePawnCount = evaluatePawnCount;
globalThis.evaluateCaptureOpportunities = evaluateCaptureOpportunities;
globalThis.evaluateFreePath = evaluateFreePath;
globalThis.evaluateMajority = evaluateMajority;
globalThis.getMajorityRowsScore = getMajorityRowsScore;

const { run_game, debug } = require('./ai.js');
globalThis.debug = debug;

globalThis.game = new Chess();
globalThis.gameMode = 'playerw';
globalThis.aiColor = 'b';

globalThis.IS_DEBUG = false;
globalThis.ENABLE_LOGGING = false;

// --- Tournament ---

function runComparison(strategy1, strategy2, N, confidenceLevel) {
    N = N || 100;
    confidenceLevel = confidenceLevel || 0.95;

    if (typeof strategy1 === 'string') strategy1 = STRATEGIES[strategy1];
    if (typeof strategy2 === 'string') strategy2 = STRATEGIES[strategy2];

    if (!strategy1 || !strategy2) {
        console.error('Strategy not found. Available:', Object.keys(STRATEGIES).join(', '));
        process.exit(1);
    }

    const N1 = Math.floor(N / 2);
    const N2 = N - N1;

    console.log(`\n${strategy1.name} (white) vs ${strategy2.name} (black): ${N1} games`);
    const t1 = performance.now();
    const results1 = run_game(N1, strategy1, strategy2);

    console.log(`${strategy2.name} (white) vs ${strategy1.name} (black): ${N2} games`);
    const results2 = run_game(N2, strategy2, strategy1);
    const t2 = performance.now();

    const s1Wins =
        results1.filter(res => res && res.includes('w')).length +
        results2.filter(res => res && res.includes('b')).length;

    const s2Wins = N - s1Wins;

    if (s1Wins < 10 || s2Wins < 10) {
        console.warn('Warning: minimum threshold of 10 wins not reached. Increase N.');
    }

    const p = s1Wins / N;
    const z = (p - 0.5) / Math.sqrt(0.25 / N);
    const pVal = 2 * (1 - cumulativeStdNormal(Math.abs(z)));

    const zCrit = zScore(1 - (1 - confidenceLevel) / 2);
    const margin = zCrit * Math.sqrt(p * (1 - p) / N);
    const ci = [p - margin, p + margin];

    const elapsed = (t2 - t1) / 1000;

    return {
        strategy1: { name: strategy1.name, wins: s1Wins },
        strategy2: { name: strategy2.name, wins: s2Wins },
        winRate: p,
        pValue: pVal,
        confidenceInterval: ci,
        significant: pVal < (1 - confidenceLevel),
        elapsed,
        gamesCount: N,
    };
}

function printResults(result) {
    const { strategy1: s1, strategy2: s2, winRate, pValue, confidenceInterval: ci, significant, elapsed, gamesCount } = result;

    console.log(`
Tournament Results (${gamesCount} games)
${'='.repeat(50)}
${s1.name}:  ${s1.wins} wins (${(s1.wins / gamesCount * 100).toFixed(1)}%)
${s2.name}:  ${s2.wins} wins (${(s2.wins / gamesCount * 100).toFixed(1)}%)

Difference:    ${((winRate - 0.5) * 100).toFixed(1)}% for ${winRate >= 0.5 ? s1.name : s2.name}
95% CI:        ${ci.map(v => (v * 100).toFixed(1) + '%').join(' - ')}
p-value:       ${pValue.toExponential(3)}
Significant:   ${significant ? 'Yes' : 'No'}

Time:          ${elapsed.toFixed(2)}s (${(elapsed / gamesCount * 1000).toFixed(1)} ms/game)
`);
}

// --- Math helpers ---

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

// --- CLI ---

function printUsage() {
    console.log(`
Pawn Wars AI Tournament Runner

Usage:
  node run_ai.js list                              List available strategies
  node run_ai.js compare <s1> <s2> [N=100]         Compare two strategies (N games)

Examples:
  node run_ai.js list
  node run_ai.js compare medium advancementOnly 200
  node run_ai.js compare medium mediumPlusMajority 500
`);
}

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'help' || command === '--help') {
    printUsage();
} else if (command === 'list') {
    console.log('\nAvailable strategies:');
    for (const [key, strategy] of Object.entries(STRATEGIES)) {
        console.log(`  ${key.padEnd(25)} ${strategy.name} (depth ${strategy.depth})`);
    }
    console.log('');
} else if (command === 'compare') {
    const s1Name = args[1];
    const s2Name = args[2];
    const N = parseInt(args[3], 10) || 100;

    if (!s1Name || !s2Name) {
        console.error('Error: two strategy names required');
        printUsage();
        process.exit(1);
    }

    if (!STRATEGIES[s1Name]) {
        console.error(`Error: strategy "${s1Name}" not found. Use "list" to see available.`);
        process.exit(1);
    }
    if (!STRATEGIES[s2Name]) {
        console.error(`Error: strategy "${s2Name}" not found. Use "list" to see available.`);
        process.exit(1);
    }

    console.log(`Starting ${N} games: ${s1Name} vs ${s2Name}`);
    const result = runComparison(s1Name, s2Name, N);
    printResults(result);
} else {
    console.error(`Unknown command: ${command}`);
    printUsage();
}

module.exports = { runComparison };
