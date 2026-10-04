const { test } = require('node:test');
const assert = require('node:assert/strict');
const { findBestMove, debug } = require('./bootstrap.js');

function snapshot() { return { fen: game.fen(), history: game.history() }; }
function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`); }

test('score TT preserves minimax scores, is bounded and restores the board', () => {
    initializeGame('1. d4 d5 2. e3 e6');
    const before = snapshot();
    const strategy = { ...STRATEGIES.bestV1, depth: 4 };
    const uncached = findBestMove(strategy, false, { useTranspositionTable: false });
    const uncachedNodes = debug.stats.nodes;
    const cached = findBestMove(strategy, false, { maxTableEntries: 500 });
    close(cached.score, uncached.score);
    assert.ok(debug.stats.ttHits > 0);
    assert.ok(debug.stats.nodes < uncachedNodes);
    assert.ok(debug.stats.tableEntries <= 500);
    assert.deepEqual(snapshot(), before);

    const small = findBestMove(strategy, false, { maxTableEntries: 2 });
    close(small.score, uncached.score);
    assert.ok(debug.stats.tableEntries <= 2);
    const disabled = findBestMove(strategy, false, { maxTableEntries: 0 });
    close(disabled.score, uncached.score);
    assert.equal(debug.stats.ttHits, 0);
    assert.equal(debug.stats.tableEntries, 0);
    assert.deepEqual(snapshot(), before);
});

test('all root moves stay exact and unknown path evaluators are never cached', () => {
    initializeGame('1. d4 d5 2. e3 e6');
    const strategy = { ...STRATEGIES.bestV1, depth: 4 };
    const plain = findBestMove(strategy, true, { useTranspositionTable: false });
    const cached = findBestMove(strategy, true, { useTranspositionTable: true });
    assert.equal(cached.length, plain.length);
    for (const entry of cached) close(entry.score, plain.find(x => x.move.san === entry.move.san).score);

    const unsafe = {
        depth: 3,
        evaluate(path) { return path.join('').split('').reduce((sum, c, i) => sum + c.charCodeAt(0) * (i + 1), 0); },
    };
    findBestMove(unsafe, false, { useTranspositionTable: true });
    assert.equal(debug.stats.ttHits, 0);
    assert.equal(debug.stats.tableEntries, 0);
});
