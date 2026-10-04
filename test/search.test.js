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
function withRandom(value, action) {
    const original = Math.random;
    Math.random = () => value;
    try { return action(); }
    finally { Math.random = original; }
}

// Independent full-tree oracle: no alpha-beta pruning or random selection.
function brute(strategy, depth, moves = []) {
    if (!depth || isFinished()) return strategy.evaluate(moves);
    const maximizing = game.turn() === 'w';
    const scores = getMoves().map(move => {
        game.move(move);
        try { return brute(strategy, depth - 1, moves.concat(move)); }
        finally { game.undo(); }
    });
    return maximizing ? Math.max(...scores) : Math.min(...scores);
}
function oracle(strategy) {
    return getMoves().map(move => {
        game.move(move);
        try { return { move, score: brute(strategy, strategy.depth - 1, [move]) }; }
        finally { game.undo(); }
    });
}

test('selected moves and all-moves scores agree with exhaustive minimax', () => {
    const boards = [
        '8/1p4p1/8/8/8/8/1P4P1/8 w - - 0 1',
        '8/1p4p1/8/8/8/8/1P4P1/8 b - - 0 1',
        '8/8/8/8/1Pp5/8/8/8 b - b3 0 1', // en passant wins
        '8/8/8/8/1Pp5/8/8/8 b - - 0 1',
        '8/P7/8/8/8/8/7p/8 w - - 0 1', // promotion race
        '8/8/8/8/2p5/2P5/6P1/8 w - - 0 1', // no-move loss
        '8/1p6/8/8/8/8/P1P5/8 b - - 0 1',
        SYNTHETIC_RACE,
    ];
    for (const fen of boards) {
        load(fen);
        const before = snapshot();
        const expected = oracle(STRATEGIES.bestV1);
        const best = (game.turn() === 'w' ? Math.max : Math.min)(...expected.map(x => x.score));
        for (const random of [0, 0.5, 0.999999]) {
            const chosen = withRandom(random, () => findBestMove(STRATEGIES.bestV1));
            close(chosen.score, best);
            close(expected.find(x => x.move === chosen.move.san).score, best);
            assert.deepEqual(snapshot(), before);
        }
        const all = findBestMove(STRATEGIES.bestV1, true);
        assert.equal(all.length, expected.length);
        for (const x of all) close(x.score, expected.find(e => e.move === x.move.san).score);
        assert.deepEqual(snapshot(), before);
    }
});

test('false root ties cannot discard a forced win, for either colour', () => {
    // Rotate 180 degrees and exchange colours; no en passant in this position.
    const rotated = SYNTHETIC_RACE.split(' ')[0].split('').reverse().map(c => /[a-z]/i.test(c)
        ? (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase()) : c).join('') + ' w - - 0 1';
    for (const [fen, winning] of [[SYNTHETIC_RACE, 'b3'], [rotated, 'g6']]) {
        for (const strategy of [STRATEGIES.bestV1, STRATEGIES.bestV2]) {
            for (const random of [0, 0.5, 0.999999]) {
                load(fen);
                const result = withRandom(random, () => findBestMove(strategy));
                assert.equal(result.move.san, winning);
                assert.ok(Math.abs(result.score) > 100000);
            }
        }
    }
});

test('genuine ties remain random and root move ordering cannot select a worse move', () => {
    initializeGame();
    const tied = { ...STRATEGIES.random, depth: 2 };
    const first = withRandom(0, () => findBestMove(tied));
    const last = withRandom(0.999999, () => findBestMove(tied));
    assert.notEqual(first.move.san, last.move.san);
    assert.equal(first.score, last.score);
    load(SYNTHETIC_RACE);
    const original = globalThis.getMoves;
    globalThis.getMoves = options => original(options).reverse();
    try {
        assert.equal(withRandom(0.999999, () => findBestMove(STRATEGIES.bestV1)).move.san, 'b3');
    } finally { globalThis.getMoves = original; }
});

test('debug logging preserves the corrected move, score and board', () => {
    load(SYNTHETIC_RACE);
    const before = snapshot();
    const plain = withRandom(0.999999, () => findBestMove(STRATEGIES.bestV1));
    globalThis.ENABLE_LOGGING = true;
    try {
        const logged = withRandom(0.999999, () => findBestMove(STRATEGIES.bestV1));
        assert.equal(logged.move.san, plain.move.san);
        close(logged.score, plain.score);
        assert.ok(Object.keys(debug.log).length);
        assert.ok(Object.keys(debug.tree).length);
        assert.deepEqual(snapshot(), before);
    } finally { globalThis.ENABLE_LOGGING = false; }
});

test('removed factors are absent; historical weight files still load', () => {
    assert.equal(FACTORS.mediumAdjacentThreat, undefined);
    assert.equal(FACTORS.opponentBlocked, undefined);
    initializeGame('1. e4 e5 2. d4 d5');
    const active = { mediumAdvancement: 3.801, passedPawns: 3.61 };
    const old = buildStrategy({ factors: { ...active, mediumAdjacentThreat: -1.727, opponentBlocked: 1.505 } }, FACTORS);
    const clean = buildStrategy({ factors: active }, FACTORS);
    close(old.evaluate([]), clean.evaluate([]));
    assert.throws(() => buildStrategy({ factors: { typo: 1 } }, FACTORS), /Unknown factor/);
    close(STRATEGIES.medium.evaluate([]), STRATEGIES.mediumDecomposed.evaluate([]));
});

test('classic browser scripts retain the makeAiMove UI contract and level depths', () => {
    const calls = [];
    const context = vm.createContext({
        exports: {}, module: {}, console: { log() {} }, window: {},
        gameMode: 'playerw', aiColor: 'b', ENABLE_LOGGING: false,
        board: { position(fen) { calls.push(['board', fen]); } },
        updateStatus() { calls.push(['status']); },
        updateURL() { calls.push(['url']); },
        fen: SYNTHETIC_RACE,
    });
    for (const file of ['chess.js', 'game.js', 'strategies.js', 'ai.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
    }
    const result = vm.runInContext('game = new Chess(fen, { skipValidation: true }); Math.random = () => 0.999999; makeAiMove(4);', context);
    assert.equal(result.move.san, 'b3');
    assert.deepEqual(calls.map(x => x[0]), ['board', 'status', 'url']);
    assert.equal(calls[0][1], vm.runInContext('game.fen()', context));
    assert.equal(vm.runInContext('[0,1,2,3,4].map(n => difficultyToStrategy(n).depth).join(",")', context), '1,3,4,5,5');
    assert.equal(vm.runInContext('difficultyToStrategy(4) === STRATEGIES.bestV1', context), true);
});
