// test/test_runner.js — Position test runner
// Usage:
//   node test/test_runner.js                    Run all position tests
//   node test/test_runner.js --filter "promote" Run matching tests
//   node test/test_runner.js --runs 20          Run each test 20 times (default: 10)

// --- Bootstrap (same as run_ai.js) ---

const { Chess } = require('../chess.js');
globalThis.Chess = Chess;

const { getMoves, initializeGame, isFinished, drawGame, sleep, getPawns, drawBoard, extractMovesFromPGN } = require('../game.js');
globalThis.initializeGame = initializeGame;
globalThis.isFinished = isFinished;
globalThis.getMoves = getMoves;
globalThis.drawGame = drawGame;
globalThis.sleep = sleep;
globalThis.getPawns = getPawns;
globalThis.drawBoard = drawBoard;
globalThis.extractMovesFromPGN = extractMovesFromPGN;

const { STRATEGIES, difficultyToStrategy, checkGameEnd, evaluateBoardMedium, evaluatePawnAdvancement, evaluatePawnCount, evaluateCaptureOpportunities, evaluateFreePath, evaluateMajority, getMajorityRowsScore } = require('../strategies.js');
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

const { findBestMove, debug } = require('../ai.js');
globalThis.debug = debug;

globalThis.game = new Chess();
globalThis.gameMode = 'playerw';
globalThis.aiColor = 'b';
globalThis.IS_DEBUG = false;
globalThis.ENABLE_LOGGING = false;

const { POSITION_TESTS } = require('./test_positions.js');

// --- Test runner ---

function runPositionTest(test, numRuns) {
    const strategy = STRATEGIES[test.strategy || 'medium'];
    if (!strategy) {
        return { status: 'ERROR', message: `Strategy "${test.strategy}" not found` };
    }

    const moveCounts = {};
    const chosenMoves = [];

    for (let i = 0; i < numRuns; i++) {
        initializeGame(test.moves);

        if (test.turn && game.turn() !== test.turn) {
            return {
                status: 'ERROR',
                message: `Expected turn ${test.turn}, got ${game.turn()}`,
            };
        }

        const result = findBestMove(strategy);
        if (!result || !result.move) {
            return { status: 'ERROR', message: 'No move returned' };
        }

        const moveSan = typeof result.move === 'string' ? result.move : result.move.san;
        chosenMoves.push(moveSan);
        moveCounts[moveSan] = (moveCounts[moveSan] || 0) + 1;
    }

    // Check bad moves
    let badMoveChosen = null;
    if (test.badMoves) {
        for (const bad of test.badMoves) {
            if (moveCounts[bad]) {
                badMoveChosen = { move: bad, count: moveCounts[bad] };
                break;
            }
        }
    }

    // Check good moves
    let goodMoveCount = 0;
    if (test.goodMoves) {
        for (const good of test.goodMoves) {
            goodMoveCount += (moveCounts[good] || 0);
        }
    }

    // Determine pass/fail
    const passed =
        (!badMoveChosen) &&
        (!test.goodMoves || goodMoveCount >= Math.ceil(numRuns * 0.8));

    // Build summary of what was chosen
    const sortedMoves = Object.entries(moveCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([m, c]) => `${m}: ${c}/${numRuns}`)
        .join(', ');

    let failReason = '';
    if (badMoveChosen) {
        failReason = `bad move ${badMoveChosen.move} chosen ${badMoveChosen.count}/${numRuns}`;
    } else if (test.goodMoves && goodMoveCount < Math.ceil(numRuns * 0.8)) {
        failReason = `good moves chosen only ${goodMoveCount}/${numRuns}`;
    }

    return {
        status: passed ? 'PASS' : 'FAIL',
        moves: sortedMoves,
        failReason,
    };
}

function runAllTests(filter, numRuns) {
    let tests = POSITION_TESTS;
    if (filter) {
        tests = tests.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()));
    }

    if (tests.length === 0) {
        console.log('No tests found' + (filter ? ` matching "${filter}"` : '') + '.');
        return;
    }

    console.log(`\nPosition Tests (${numRuns} runs each)`);
    console.log('='.repeat(60));

    let passed = 0;
    let failed = 0;
    let errors = 0;

    for (const test of tests) {
        const result = runPositionTest(test, numRuns);

        if (result.status === 'PASS') {
            console.log(`  PASS  ${test.name} (${result.moves})`);
            passed++;
        } else if (result.status === 'FAIL') {
            console.log(`  FAIL  ${test.name} (${result.moves})`);
            console.log(`        Reason: ${result.failReason}`);
            failed++;
        } else {
            console.log(`  ERROR ${test.name}: ${result.message}`);
            errors++;
        }
    }

    console.log(`\n${passed} passed, ${failed} failed${errors ? ', ' + errors + ' errors' : ''} (${tests.length} total)\n`);

    return { passed, failed, errors, total: tests.length };
}

// --- CLI ---

const args = process.argv.slice(2);
let filter = null;
let numRuns = 10;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--filter' && args[i + 1]) {
        filter = args[++i];
    } else if (args[i] === '--runs' && args[i + 1]) {
        numRuns = parseInt(args[++i], 10);
    } else if (args[i] === '--help' || args[i] === '-h') {
        console.log(`
Position Test Runner

Usage:
  node test/test_runner.js                     Run all position tests
  node test/test_runner.js --filter "promote"  Run matching tests
  node test/test_runner.js --runs 20           Runs per test (default: 10)
`);
        process.exit(0);
    }
}

const result = runAllTests(filter, numRuns);
if (result && result.failed > 0) {
    process.exit(1);
}
