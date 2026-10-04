// ai.js — alpha-beta search. Scores always use White's perspective.
var debug = { log: {}, tree: {}, config: {}, stats: {} };

function findBestMove(strategyOrDifficulty, getAllMoves, options) {
    const strategy = typeof strategyOrDifficulty === 'object'
        ? strategyOrDifficulty : difficultyToStrategy(strategyOrDifficulty);
    options = options || {};
    const depth = options.maxDepth === undefined ? strategy.depth : options.maxDepth;
    if (!Number.isInteger(depth) || depth < 1) throw new Error('Search depth must be a positive integer');
    const maxNodes = options.maxNodes === undefined ? Infinity : options.maxNodes;
    const maxTableEntries = options.maxTableEntries === undefined ? 50000 : options.maxTableEntries;
    if (!(maxNodes >= 0) || (maxNodes !== Infinity && !Number.isInteger(maxNodes))) {
        throw new Error('maxNodes must be a non-negative integer or Infinity');
    }
    if (!Number.isInteger(maxTableEntries) || maxTableEntries < 0) {
        throw new Error('maxTableEntries must be a non-negative integer');
    }
    const logging = typeof ENABLE_LOGGING !== 'undefined' && ENABLE_LOGGING;
    const stats = { nodes: 0, leaves: 0, cutoffs: 0, ttHits: 0, researches: 0,
        completedDepth: 0, aborted: false, tableEntries: 0 };
    // A custom evaluator may inspect the move path, not just the board. Such
    // strategies must explicitly opt in to caching. No cache survives this call.
    const useTable = strategy.transpositionSafe === true && options.useTranspositionTable !== false;
    const table = new Map();
    const hints = new Map();
    const stopped = {};
    debug.log = {};
    debug.tree = {};
    debug.config = { strategy, options };
    debug.stats = stats;

    function boundedSet(map, key, value) {
        if (maxTableEntries === 0) return;
        if (!map.has(key) && map.size >= maxTableEntries) map.delete(map.keys().next().value);
        map.set(key, value);
    }

    function visit() {
        if (stats.nodes >= maxNodes) throw stopped;
        stats.nodes++;
    }

    function orderedMoves(preferred) {
        const moves = getMoves({ verbose: true });
        const index = moves.findIndex(move => move.san === preferred);
        if (index > 0) moves.unshift(moves.splice(index, 1)[0]);
        return moves;
    }

    function search(remaining, alpha, beta, path) {
        visit();
        const node = logging ? { depth: path.length, movePath: path.slice(), alpha, beta,
            components: {}, children: [] } : null;
        if (node) debug.log[path.join(' ')] = node;
        if (remaining === 0 || isFinished()) {
            stats.leaves++;
            const score = strategy.evaluate(path);
            if (node) Object.assign(node, { score, isLeaf: true });
            return score;
        }

        // Include turn and en passant. Clocks do not affect Pawn Wars rules.
        // Include BOTH exact remaining depth and root ply: terminal scores use
        // path.length, and reaching a board via a double move can change it.
        const position = useTable ? game.fen().split(' ').slice(0, 4).join(' ') : null;
        const key = position + '|' + remaining + '|' + path.length;
        const cached = useTable ? table.get(key) : null;
        if (cached && (cached.type === 'EXACT' ||
            (cached.type === 'LOWER' && cached.score >= beta) ||
            (cached.type === 'UPPER' && cached.score <= alpha))) {
            stats.ttHits++;
            if (node) Object.assign(node, { score: cached.score, cache: cached.type });
            return cached.score;
        }

        const alphaOriginal = alpha, betaOriginal = beta;
        const maximizing = game.turn() === 'w';
        let best = maximizing ? -Infinity : Infinity;
        let bestMove;
        for (const move of orderedMoves(useTable ? hints.get(position) : null)) {
            path.push(move.san);
            game.move(move.san);
            let score;
            try {
                score = search(remaining - 1, alpha, beta, path);
                if (node) {
                    const branch = getTreePath(path.slice(0, -1));
                    branch[move.san] = { ...branch[move.san], score, zdrawn: drawBoard(move.from) };
                }
            } finally {
                game.undo();
                path.pop();
            }
            if (bestMove === undefined || (maximizing ? score > best : score < best)) {
                best = score;
                bestMove = move.san;
            }
            if (maximizing) alpha = Math.max(alpha, best);
            else beta = Math.min(beta, best);
            if (node) node.children.push({ move: move.san, score, pruned: alpha >= beta });
            if (alpha >= beta) { stats.cutoffs++; break; }
        }
        if (useTable) {
            const type = best <= alphaOriginal ? 'UPPER' : best >= betaOriginal ? 'LOWER' : 'EXACT';
            boundedSet(table, key, { score: best, type });
            boundedSet(hints, position, bestMove);
        }
        if (node) node.score = best;
        return best;
    }

    function rootSearch(currentDepth, preferred) {
        const maximizing = game.turn() === 'w';
        let best = maximizing ? -Infinity : Infinity;
        const candidates = [], all = [];
        for (const move of orderedMoves(preferred)) {
            game.move(move.san);
            let score;
            try {
                score = search(currentDepth - 1,
                    !getAllMoves && maximizing ? best : -Infinity,
                    !getAllMoves && !maximizing ? best : Infinity, [move.san]);
                // An equal fail-low/fail-high bound is NOT an exact tie. Only a
                // full-window re-search may admit it to the random candidate set.
                if (!getAllMoves && candidates.length && score === best) {
                    stats.researches++;
                    score = search(currentDepth - 1, -Infinity, Infinity, [move.san]);
                }
                if (logging) {
                    debug.tree[move.san] = { ...debug.tree[move.san], score,
                        zdrawn: drawBoard(move.from) };
                }
            } finally { game.undo(); }
            const entry = { move, score, evaluation: {}, path: [move.san] };
            all.push(entry);
            if (!candidates.length || (maximizing ? score > best : score < best)) {
                best = score;
                candidates.length = 0;
            }
            if (score === best) candidates.push(entry);
        }
        return { candidates, all };
    }

    if (isFinished()) return getAllMoves ? [] : null;
    const legalMoves = getMoves({ verbose: true });
    if (!legalMoves.length) return getAllMoves ? [] : null;
    let completed = null, preferred;
    const firstDepth = options.iterativeDeepening === false ? depth : 1;
    for (let currentDepth = firstDepth; currentDepth <= depth; currentDepth++) {
        if (logging) { debug.log = {}; debug.tree = {}; }
        try {
            const iteration = rootSearch(currentDepth, preferred);
            completed = iteration;
            preferred = iteration.candidates[0].move.san;
            stats.completedDepth = currentDepth;
        } catch (error) {
            if (error !== stopped) throw error;
            stats.aborted = true;
            break;
        }
    }
    stats.tableEntries = table.size;
    // Never mix scores from an incomplete iteration into hints or move choice.
    // If even depth 1 was interrupted, a legal fallback has no claimed score.
    if (!completed) {
        if (getAllMoves) return [];
        return { move: legalMoves[0], score: null, evaluation: {}, path: [legalMoves[0].san], stats };
    }
    if (getAllMoves) return completed.all.map(entry => ({ ...entry, stats }));
    const random = options.random || Math.random;
    const chosen = completed.candidates[Math.floor(random() * completed.candidates.length)];
    return { ...chosen, stats };
}

function getTreePath(path) {
    let node = debug.tree;
    for (const move of path) {
        if (!node[move]) node[move] = {};
        node = node[move];
    }
    return node;
}

function makeAiMove(aiDifficulty) {
    if (isFinished()) return;

    var possibleMoves = getMoves();
    if (possibleMoves.length === 0) return;

    const strategy = difficultyToStrategy(aiDifficulty);
    const { move, score } = findBestMove(strategy);
    console.log('makeAiMove', move, 'difficulty', aiDifficulty, 'strategy', strategy.name, 'score:', score);

    if (!move) return;

    game.move(move);
    if (typeof window !== 'undefined') {
        board.position(game.fen());
        updateStatus();
        updateURL();
    }

    return { move, score };
}

function run_game(cnt, strategy1, strategy2) {
    // Accept both strategy objects and difficulty numbers
    if (typeof strategy1 === 'number') strategy1 = difficultyToStrategy(strategy1);
    if (typeof strategy2 === 'number') strategy2 = difficultyToStrategy(strategy2);

    let stats = [];
    for (var i = 0; i < cnt; ++i) {
        initializeGame();
        while (!isFinished()) {
            if (getMoves().length === 0) break;
            const currentStrategy = game.turn() == 'w' ? strategy1 : strategy2;
            const { move } = findBestMove(currentStrategy);
            if (!move) break;
            game.move(move);
        }
        stats.push(isFinished());

        process.stdout.write('.');
        if ((i + 1) % 10 === 0) {
            process.stdout.write('\n');
        }
        ENABLE_LOGGING && logGame(strategy1.name, strategy2.name, isFinished(), game);
    }
    console.log('');
    return stats;
}

function logGame(name1, name2, isFinished, game) {
    const fs = require('fs');
    const pgn = extractMovesFromPGN(game.pgn());
    fs.appendFileSync('games.log', `${name1};${name2};${isFinished};${pgn}\n`);
}

module.exports = {
    makeAiMove,
    run_game,
    findBestMove,
    debug,
};
