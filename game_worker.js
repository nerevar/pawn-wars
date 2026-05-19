// game_worker.js — Worker thread for parallel game execution
// Each worker has its own globalThis.game (isolated Chess instance)

const { workerData, parentPort } = require('worker_threads');

// --- Bootstrap globalThis (same pattern as run_ai.js) ---

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

const strategies = require('./strategies.js');
globalThis.STRATEGIES = strategies.STRATEGIES;
globalThis.difficultyToStrategy = strategies.difficultyToStrategy;
globalThis.checkGameEnd = strategies.checkGameEnd;
globalThis.evaluateBoardMedium = strategies.evaluateBoardMedium;
globalThis.evaluatePawnAdvancement = strategies.evaluatePawnAdvancement;
globalThis.evaluatePawnCount = strategies.evaluatePawnCount;
globalThis.evaluateCaptureOpportunities = strategies.evaluateCaptureOpportunities;
globalThis.evaluateFreePath = strategies.evaluateFreePath;
globalThis.evaluateMajority = strategies.evaluateMajority;
globalThis.getMajorityRowsScore = strategies.getMajorityRowsScore;
globalThis.evaluateMediumAdvancement = strategies.evaluateMediumAdvancement;
globalThis.evaluateMediumFreePath = strategies.evaluateMediumFreePath;
globalThis.evaluateMediumAdjacentThreat = strategies.evaluateMediumAdjacentThreat;
globalThis.evaluateMediumCenterColumn = strategies.evaluateMediumCenterColumn;
globalThis.evaluateMediumNextMoveSafety = strategies.evaluateMediumNextMoveSafety;

const { findBestMove, debug } = require('./ai.js');
globalThis.debug = debug;

const factorsMod = require('./factors.js');
const { FACTORS } = factorsMod;
globalThis.evaluatePassedPawns = factorsMod.evaluatePassedPawns;
globalThis.evaluateBlockedPawns = factorsMod.evaluateBlockedPawns;
globalThis.evaluateMobility = factorsMod.evaluateMobility;
globalThis.evaluateConnectedPawns = factorsMod.evaluateConnectedPawns;
globalThis.evaluateDefendedPawns = factorsMod.evaluateDefendedPawns;
globalThis.evaluateOpponentBlocked = factorsMod.evaluateOpponentBlocked;
globalThis.evaluateThreatenedPawns = factorsMod.evaluateThreatenedPawns;
globalThis.evaluateIsolatedPawns = factorsMod.evaluateIsolatedPawns;
globalThis.evaluatePromotionRace = factorsMod.evaluatePromotionRace;

const { buildStrategy } = require('./parametric_strategy.js');

globalThis.game = new Chess();
globalThis.gameMode = 'playerw';
globalThis.aiColor = 'b';
globalThis.IS_DEBUG = false;
globalThis.ENABLE_LOGGING = false;

// --- Game execution (adapted from run_game in ai.js, no console output) ---

function playGames(numGames, strategy1, strategy2) {
    var stats = [];
    for (var i = 0; i < numGames; i++) {
        initializeGame();
        while (!isFinished()) {
            if (getMoves().length === 0) break;
            var currentStrategy = game.turn() === 'w' ? strategy1 : strategy2;
            var result = findBestMove(currentStrategy);
            if (!result || !result.move) break;
            game.move(result.move);
        }
        stats.push(isFinished());
    }
    return stats;
}

// --- Message handler ---

parentPort.on('message', function(msg) {
    if (msg.type === 'run') {
        var t1 = performance.now();

        // Build strategies from configs
        var strategy1 = buildStrategyFromConfig(msg.strategy1Config);
        var strategy2 = buildStrategyFromConfig(msg.strategy2Config);

        // Play games
        var results = playGames(msg.numGames, strategy1, strategy2);

        var t2 = performance.now();

        parentPort.postMessage({
            type: 'result',
            batchId: msg.batchId,
            results: results,
            elapsed: (t2 - t1) / 1000,
        });
    } else if (msg.type === 'exit') {
        process.exit(0);
    }
});

function buildStrategyFromConfig(config) {
    // If config has factors, build parametric strategy
    if (config.factors !== undefined) {
        return buildStrategy(config, FACTORS);
    }
    // Otherwise it's a named strategy reference
    if (config.strategyName && STRATEGIES[config.strategyName]) {
        var s = STRATEGIES[config.strategyName];
        if (config.depth) {
            return { name: s.name, depth: config.depth, evaluate: s.evaluate };
        }
        return s;
    }
    throw new Error('Invalid strategy config: ' + JSON.stringify(config));
}

// Signal ready
parentPort.postMessage({ type: 'ready' });
