const { test } = require('node:test');
const assert = require('node:assert/strict');
const { findBestMove, debug } = require('./bootstrap.js');
const { buildStrategy } = require('../parametric_strategy.js');
const { FACTORS } = require('../factors.js');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Artificial six-pawn position, generated independently of game logs.
// Old root pruning admits e3 as a false tie with the forced b3 win.
const SYNTHETIC_RACE = '8/8/2p5/8/1p2p3/2P3P1/3P4/8 b - - 0 1';

function load(fen) { globalThis.game = new Chess(fen, { skipValidation: true }); }
function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`); }
function snapshot() { return { fen: game.fen(), history: game.history() }; }

// Independent oracle: no alpha-beta pruning, no transpositions, no move ordering
// hints. Small boards/depths keep the complete tree practical to enumerate.
function brute(strategy, depth, path = []) {
    if (!depth || isFinished()) return strategy.evaluate(path);
    const maximizing = game.turn() === 'w';
    const scores = getMoves().map(move => {
        game.move(move);
        try { return brute(strategy, depth - 1, path.concat(move)); }
        finally { game.undo(); }
    });
    return maximizing ? Math.max(...scores) : Math.min(...scores);
}
function oracle(strategy, depth) {
    return getMoves().map(move => {
        game.move(move);
        try { return { move, score: brute(strategy, depth - 1, [move]) }; }
        finally { game.undo(); }
    });
}

test('cached, uncached and iterative search match exhaustive minimax', () => {
    const boards = [
        '8/1p4p1/8/8/8/8/1P4P1/8 w - - 0 1',
        '8/1p4p1/8/8/8/8/1P4P1/8 b - - 0 1',
        '8/8/8/8/1Pp5/8/8/8 b - b3 0 1', // en passant wins
        '8/8/8/8/1Pp5/8/8/8 b - - 0 1',
        '8/P7/8/8/8/8/7p/8 w - - 0 1', // promotion race
        '8/8/8/8/2p5/2P5/6P1/8 w - - 0 1', // no-move loss
        '8/1p6/8/8/8/8/P1P5/8 b - - 0 1',
    ];
    for (const fen of boards) {
        load(fen);
        const before = snapshot();
        const strategy = STRATEGIES.bestV1;
        const expected = oracle(strategy, 5);
        const best = (game.turn() === 'w' ? Math.max : Math.min)(...expected.map(x => x.score));
        for (const useTranspositionTable of [false, true]) {
            for (const iterativeDeepening of [false, true]) {
                const options = { maxDepth: 5, useTranspositionTable, iterativeDeepening, random: () => 0.999999 };
                const chosen = findBestMove(strategy, false, options);
                close(chosen.score, best);
                close(expected.find(x => x.move === chosen.move.san).score, best);
                const all = findBestMove(strategy, true, options);
                assert.equal(all.length, expected.length);
                for (const x of all) close(x.score, expected.find(e => e.move === x.move.san).score);
                assert.deepEqual(snapshot(), before);
            }
        }
    }
});

test('synthetic promotion race: false ties never discard a forced win, for either colour', () => {
    const fen = SYNTHETIC_RACE;
    // Rotate 180 degrees and exchange colours; no en passant in this position.
    const rotated = fen.split(' ')[0].split('').reverse().map(c => /[a-z]/i.test(c)
        ? (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase()) : c).join('') + ' w - - 0 1';
    for (const [position, winning] of [[fen, 'b3'], [rotated, 'g6']]) {
        for (const strategy of [STRATEGIES.bestV1, STRATEGIES.bestV2]) {
            for (const random of [() => 0, () => 0.5, () => 0.999999]) {
                load(position);
                const before = snapshot();
                const result = findBestMove(strategy, false, { random });
                assert.equal(result.move.san, winning);
                assert.ok(Math.abs(result.score) > 100000);
                assert.deepEqual(snapshot(), before);
            }
        }
    }
});

test('true equal moves remain random; move order cannot change minimax score', () => {
    initializeGame();
    const first = findBestMove(STRATEGIES.random, false, { random: () => 0 });
    const last = findBestMove(STRATEGIES.random, false, { random: () => 0.999999 });
    assert.notEqual(first.move.san, last.move.san);
    assert.equal(first.score, last.score);
    const original = globalThis.getMoves;
    const expected = findBestMove(STRATEGIES.bestV1, true, { maxDepth: 3 });
    globalThis.getMoves = options => original(options).reverse();
    try {
        const result = findBestMove(STRATEGIES.bestV1, false, { maxDepth: 3 });
        close(result.score, Math.max(...expected.map(e => e.score)));
        close(result.score, expected.find(e => e.move.san === result.move.san).score);
    } finally { globalThis.getMoves = original; }
});

test('bounded cache saves nodes, preserves exact scores and does not cross strategies', () => {
    initializeGame('1. d4 d5 2. e3 e6');
    const options = { maxDepth: 4, iterativeDeepening: false, random: () => 0 };
    const without = findBestMove(STRATEGIES.bestV1, false, { ...options, useTranspositionTable: false });
    const withCache = findBestMove(STRATEGIES.bestV1, false, options);
    close(withCache.score, without.score);
    assert.ok(withCache.stats.ttHits > 0);
    assert.ok(withCache.stats.nodes < without.stats.nodes);
    const smallCache = findBestMove(STRATEGIES.bestV1, false, { ...options, maxTableEntries: 2 });
    close(smallCache.score, without.score);
    assert.ok(smallCache.stats.tableEntries <= 2);
    const zeroCache = findBestMove(STRATEGIES.bestV1, false, { ...options, maxTableEntries: 0 });
    close(zeroCache.score, without.score);
    assert.equal(zeroCache.stats.ttHits, 0);
    const v2 = findBestMove(STRATEGIES.bestV2, false, options);
    close(v2.score, findBestMove(STRATEGIES.bestV2, false, { ...options, useTranspositionTable: false }).score);
});

test('custom path-dependent evaluators do not silently use the cache', () => {
    load('8/1p4p1/8/8/8/8/1P4P1/8 w - - 0 1');
    const strategy = { depth: 4, evaluate: path => path.join('').split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0) };
    const expected = oracle(strategy, 4);
    const result = findBestMove(strategy);
    close(result.score, Math.max(...expected.map(e => e.score)));
    assert.equal(result.stats.ttHits, 0);
});

test('node budget returns only a completed iteration and always restores the board', () => {
    initializeGame('1. d4 d5');
    const before = snapshot();
    const depth1 = findBestMove(STRATEGIES.bestV1, true, { maxDepth: 1 });
    const budget = findBestMove(STRATEGIES.bestV1, false, { maxDepth: 5, maxNodes: 100 });
    assert.equal(budget.stats.completedDepth, 1);
    assert.equal(budget.stats.aborted, true);
    close(budget.score, Math.max(...depth1.map(e => e.score)));
    assert.deepEqual(snapshot(), before);
    const all = findBestMove(STRATEGIES.bestV1, true, { maxDepth: 5, maxNodes: 100 });
    assert.equal(all[0].stats.completedDepth, 1);
    for (const x of all) close(x.score, depth1.find(e => e.move.san === x.move.san).score);
    const none = findBestMove(STRATEGIES.bestV1, false, { maxNodes: 0 });
    assert.equal(none.score, null);
    assert.equal(none.stats.completedDepth, 0);
    assert.ok(getMoves().includes(none.move.san));
    assert.deepEqual(findBestMove(STRATEGIES.bestV1, true, { maxNodes: 0 }), []);
    assert.deepEqual(snapshot(), before);
});

test('evaluator errors unwind the board; terminal boards return no move', () => {
    initializeGame('1. d4 d5');
    const before = snapshot();
    assert.throws(() => findBestMove({ depth: 3, evaluate() { throw Error('evaluation failed'); } }), /evaluation failed/);
    assert.deepEqual(snapshot(), before);
    load('Q7/8/8/8/8/8/7p/8 b - - 0 1');
    assert.equal(findBestMove(STRATEGIES.bestV1), null);
    assert.deepEqual(findBestMove(STRATEGIES.bestV1, true), []);
    assert.throws(() => findBestMove(STRATEGIES.bestV1, false, { maxDepth: 0 }), /depth/);
});

test('removed factors are absent; historical weight files still load', () => {
    assert.equal(FACTORS.mediumAdjacentThreat, undefined);
    assert.equal(FACTORS.opponentBlocked, undefined);
    initializeGame('1. e4 e5 2. d4 d5');
    const active = { mediumAdvancement: 3.801, passedPawns: 3.61 };
    const old = buildStrategy({ factors: { ...active, mediumAdjacentThreat: -1.727, opponentBlocked: 1.505 } }, FACTORS);
    const clean = buildStrategy({ factors: active }, FACTORS);
    close(old.evaluate([]), clean.evaluate([]));
    assert.equal(old.transpositionSafe, true);
    assert.throws(() => buildStrategy({ factors: { typo: 1 } }, FACTORS), /Unknown factor/);
    close(STRATEGIES.medium.evaluate([]), STRATEGIES.mediumDecomposed.evaluate([]));
});

test('debug logging remains usable and does not change move scores', () => {
    initializeGame('1. d4 d5');
    const plain = findBestMove(STRATEGIES.bestV1, false, { maxDepth: 2, random: () => 0 });
    globalThis.ENABLE_LOGGING = true;
    try {
        const logged = findBestMove(STRATEGIES.bestV1, false, { maxDepth: 2, random: () => 0 });
        close(logged.score, plain.score);
        assert.ok(Object.keys(debug.log).length);
        assert.ok(Object.keys(debug.tree).length);
    } finally { globalThis.ENABLE_LOGGING = false; }
});

test('classic browser scripts retain the makeAiMove UI contract and level depths', () => {
    const calls = [];
    const context = vm.createContext({
        exports: {}, module: {}, console: { log() {} }, window: {},
        gameMode: 'playerw', aiColor: 'b', ENABLE_LOGGING: false,
        board: { position(fen) { calls.push(['board', fen]); } },
        updateStatus() { calls.push(['status']); },
        updateURL() { calls.push(['url']); },
    });
    for (const file of ['chess.js', 'game.js', 'strategies.js', 'ai.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
    }
    context.fen = SYNTHETIC_RACE;
    const result = vm.runInContext('game = new Chess(fen, { skipValidation: true }); makeAiMove(4);', context);
    assert.equal(result.move.san, 'b3');
    assert.deepEqual(calls.map(x => x[0]), ['board', 'status', 'url']);
    assert.equal(calls[0][1], vm.runInContext('game.fen()', context));
    assert.equal(vm.runInContext('[0,1,2,3,4].map(n => difficultyToStrategy(n).depth).join(",")', context), '1,3,4,5,5');
    assert.equal(vm.runInContext('difficultyToStrategy(4) === STRATEGIES.bestV1', context), true);
});
