const { test } = require('node:test');
const assert = require('node:assert/strict');
const { findBestMove, debug } = require('./bootstrap.js');

const RACE = '8/1p4p1/8/8/8/8/1P4P1/8 w - - 0 1';
const RACE_BLACK = '8/1p4p1/8/8/8/8/1P4P1/8 b - - 0 1';

function load(fen) { globalThis.game = new Chess(fen, { skipValidation: true }); }
function snapshot() { return { fen: game.fen(), history: game.history() }; }
function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`); }
function copy(value) { return structuredClone(value); }
function withRandom(value, action) {
    const original = Math.random;
    Math.random = () => value;
    try { return action(); }
    finally { Math.random = original; }
}
function strategy() {
    return { ...STRATEGIES.bestV1, depth: 8, searchOptions: { minDepth: 6, maxTimeMs: 500 } };
}

test('minimum depth completes for both colours even with expired time and node budgets', () => {
    for (const fen of [RACE, RACE_BLACK]) {
        load(fen);
        const before = snapshot();
        let ticks = 0;
        const adaptive = findBestMove(strategy(), false, {
            maxTimeMs: 0, maxNodes: 0, now: () => ticks++,
        });
        const fixed = findBestMove({ ...STRATEGIES.bestV1, depth: 6 }, false, {
            minDepth: 6, maxDepth: 6, now: () => 0,
        });
        close(adaptive.score, fixed.score);
        assert.equal(adaptive.stats.completedDepth, 6);
        assert.equal(adaptive.stats.aborted, true);
        assert.equal(adaptive.stats.abortReason, 'maxNodes');
        assert.deepEqual(adaptive.stats.iterations.map(row => row.depth), [6]);
        assert.deepEqual(snapshot(), before);
    }
});

test('a fast clock completes depth eight and all root scores carry serializable stats', () => {
    load(RACE);
    const before = snapshot();
    const adaptive = findBestMove(strategy(), false, { now: () => 0 });
    const fixed = findBestMove({ ...STRATEGIES.bestV1, depth: 8 }, false, {
        minDepth: 8, maxDepth: 8, now: () => 0,
    });
    close(adaptive.score, fixed.score);
    assert.equal(adaptive.stats.completedDepth, 8);
    assert.equal(adaptive.stats.aborted, false);
    assert.deepEqual(adaptive.stats.iterations.map(row => row.depth), [6, 7, 8]);
    assert.equal(JSON.parse(JSON.stringify(adaptive.stats)).tableEntries, adaptive.stats.tableEntries);

    const rows = findBestMove(strategy(), true, { now: () => 0 });
    assert.ok(rows.length);
    for (const row of rows) {
        assert.equal(row.stats, rows[0].stats);
        assert.equal(row.stats.completedDepth, 8);
    }
    assert.deepEqual(snapshot(), before);
});

test('a late depth-seven iteration is discarded and restores the depth-six log/tree', () => {
    load(RACE);
    const before = snapshot();
    globalThis.ENABLE_LOGGING = true;
    try {
        const exactSix = withRandom(0, () => findBestMove(strategy(), false, {
            minDepth: 6, maxDepth: 6, now: () => 0,
        }));
        const expectedLog = copy(debug.log);
        const expectedTree = copy(debug.tree);

        // First learn the deterministic fake-clock call count for a completed
        // depth seven. Then expire exactly on its post-iteration deadline check.
        let calibrationCalls = 0;
        globalThis.ENABLE_LOGGING = false;
        findBestMove(strategy(), false, { maxDepth: 7, now: () => calibrationCalls++ });
        globalThis.ENABLE_LOGGING = true;
        let calls = 0;
        const expireAfterSeven = calibrationCalls - 2;
        const result = withRandom(0, () => findBestMove(strategy(), false, {
            maxDepth: 7,
            now: () => ++calls >= expireAfterSeven ? 1000 : 0,
        }));
        assert.equal(result.stats.completedDepth, 6);
        assert.equal(result.stats.abortReason, 'maxTimeMs');
        assert.ok(result.stats.nodes > exactSix.stats.nodes);
        assert.equal(result.move.san, exactSix.move.san);
        close(result.score, exactSix.score);
        assert.ok(Object.keys(debug.log).length);
        assert.deepEqual(debug.log, expectedLog);
        assert.deepEqual(debug.tree, expectedTree);
        assert.deepEqual(snapshot(), before);
    } finally {
        globalThis.ENABLE_LOGGING = false;
    }
});

test('a node budget aborts inside depth seven and keeps the completed depth-six result', () => {
    load(RACE);
    const before = snapshot();
    globalThis.ENABLE_LOGGING = true;
    try {
        const exactSix = withRandom(0, () => findBestMove(strategy(), false, {
            minDepth: 6, maxDepth: 6, now: () => 0,
        }));
        const expectedLog = copy(debug.log);
        const expectedTree = copy(debug.tree);
        const result = withRandom(0, () => findBestMove(strategy(), false, {
            maxNodes: exactSix.stats.nodes + 8,
            maxTimeMs: Infinity,
            now: () => 0,
        }));
        assert.equal(result.stats.completedDepth, 6);
        assert.equal(result.stats.abortReason, 'maxNodes');
        assert.ok(result.stats.nodes > exactSix.stats.nodes);
        assert.equal(result.move.san, exactSix.move.san);
        close(result.score, exactSix.score);
        assert.deepEqual(debug.log, expectedLog);
        assert.deepEqual(debug.tree, expectedTree);
        assert.deepEqual(snapshot(), before);
    } finally {
        globalThis.ENABLE_LOGGING = false;
    }
});

test('every evaluator error restores the board', () => {
    load(RACE);
    const before = snapshot();
    const failing = { depth: 6, evaluate() { throw Error('evaluation failed'); } };
    assert.throws(() => findBestMove(failing, false, { minDepth: 6, maxDepth: 6 }), /evaluation failed/);
    assert.deepEqual(snapshot(), before);
});

test('custom path evaluators remain uncached during adaptive search', () => {
    load(RACE);
    const custom = {
        depth: 6,
        searchOptions: { minDepth: 6, maxTimeMs: 0 },
        evaluate(path) { return path.join('').split('').reduce((sum, c, i) => sum + c.charCodeAt(0) * (i + 1), 0); },
    };
    const result = findBestMove(custom, false, { now: () => 0 });
    assert.equal(result.stats.completedDepth, 6);
    assert.equal(result.stats.ttHits, 0);
    assert.equal(result.stats.tableEntries, 0);
});

test('terminal roots return legacy null or an empty root-move list without changing the board', () => {
    load('Q7/8/8/8/8/8/7p/8 b - - 0 1');
    const before = snapshot();
    assert.equal(findBestMove(strategy()), null);
    assert.deepEqual(snapshot(), before);
    assert.deepEqual(findBestMove(strategy(), true), []);
    assert.deepEqual(snapshot(), before);
});
