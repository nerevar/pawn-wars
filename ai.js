// ai.js — minimax engine with alpha-beta pruning
var debug = {
    log: {},
    tree: {},
    config: {},
    stats: {}
};

function findBestMove(strategyOrDifficulty, getAllMoves, options) {
    var strategy;
    if (typeof strategyOrDifficulty === 'object') {
        strategy = strategyOrDifficulty;
    } else {
        strategy = difficultyToStrategy(strategyOrDifficulty);
    }
    options = { ...(strategy.searchOptions || {}), ...(options || {}) };
    const maxDepth = options.maxDepth === undefined ? strategy.depth : options.maxDepth;
    const minDepth = options.minDepth === undefined ? maxDepth : options.minDepth;
    if (!Number.isInteger(minDepth) || !Number.isInteger(maxDepth) || minDepth < 1 || maxDepth < minDepth) {
        throw new Error('Search depths must be positive integers with minDepth <= maxDepth');
    }
    const maxNodes = options.maxNodes === undefined ? Infinity : options.maxNodes;
    const maxTimeMs = options.maxTimeMs === undefined ? Infinity : options.maxTimeMs;
    const maxTableEntries = options.maxTableEntries === undefined ? 50000 : options.maxTableEntries;
    if (!(maxNodes >= 0) || (maxNodes !== Infinity && !Number.isInteger(maxNodes))) {
        throw new Error('maxNodes must be a non-negative integer or Infinity');
    }
    if (!Number.isInteger(maxTableEntries) || maxTableEntries < 0) {
        throw new Error('maxTableEntries must be a non-negative integer');
    }
    if (!(maxTimeMs >= 0) || (maxTimeMs !== Infinity && !Number.isFinite(maxTimeMs))) {
        throw new Error('maxTimeMs must be a non-negative number or Infinity');
    }
    const defaultNow = typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? () => performance.now() : () => Date.now();
    const now = options.now === undefined ? defaultNow : options.now;
    if (typeof now !== 'function') throw new Error('now must be a function');
    const startedAt = now();
    // Built-in evaluators use the board plus path length only. Unknown custom
    // evaluators may inspect the path itself, unless they explicitly opt in.
    const isBuiltin = Object.values(STRATEGIES).some(item => item.evaluate === strategy.evaluate);
    const stats = {
        nodes: 0,
        ttHits: 0,
        tableEntries: 0,
        completedDepth: 0,
        aborted: false,
        abortReason: null,
        elapsedMs: 0,
        iterations: [],
    };
    const search = {
        table: new Map(),
        useTable: (isBuiltin || strategy.transpositionSafe === true)
            && options.useTranspositionTable !== false && maxTableEntries > 0,
        maxTableEntries,
        maxNodes,
        deadline: maxTimeMs === Infinity ? Infinity : startedAt + maxTimeMs,
        now,
        enforceLimits: false,
        stopped: {},
        stats,
    };

    debug.log = {};
    debug.tree = {};
    debug.config = { strategy: strategy, options: options };
    debug.stats = stats;
    let completed = null;
    let completedLog = null;

    try {
        if (isFinished()) return getAllMoves === true ? [] : null;
        for (let depth = minDepth; depth <= maxDepth; depth++) {
            search.enforceLimits = depth > minDepth;
            if (ENABLE_LOGGING) {
                debug.log = {};
                debug.tree = {};
            }
            const iterationStartedAt = now();
            const nodesBefore = stats.nodes;
            try {
                // The minimum depth is mandatory. Time and node budgets only
                // govern optional deeper iterations.
                checkSearchLimits(search, true);
                const result = minimax(
                    depth,
                    game.turn() == 'w',
                    strategy,
                    -Infinity,
                    Infinity,
                    { path: [], branchId: 'root', search },
                    getAllMoves,
                );
                // A clock is cooperative: discard an iteration if the deadline
                // was noticed only after it completed, retaining the prior one.
                checkSearchLimits(search, true);
                completed = result;
                stats.completedDepth = depth;
                stats.iterations.push({ depth, elapsedMs: Math.max(0, now() - iterationStartedAt),
                    nodes: stats.nodes - nodesBefore });
                if (ENABLE_LOGGING) completedLog = { log: debug.log, tree: debug.tree };
            } catch (error) {
                if (error !== search.stopped) throw error;
                if (completedLog) {
                    debug.log = completedLog.log;
                    debug.tree = completedLog.tree;
                }
                break;
            }
        }
        if (!completed) return getAllMoves ? [] : null;
        if (getAllMoves === true) return completed.map(entry => ({ ...entry, stats }));
        return { ...completed, stats };
    } finally {
        stats.tableEntries = search.table.size;
        stats.elapsedMs = Math.max(0, now() - startedAt);
    }
}

findBestMove.supportedOptions = [
    'useTranspositionTable', 'maxTableEntries', 'minDepth', 'maxDepth',
    'maxTimeMs', 'maxNodes', 'now',
];

function minimax(depth, isMaximizing, strategy, alpha, beta, ctx, getAllMoves) {
    const search = ctx.search;
    checkSearchLimits(search, false);
    search.stats.nodes++;
    let evaluation = {};
    let nodeId = '';
    if (ENABLE_LOGGING) {
        nodeId = `${ctx.branchId}-${depth}-${isMaximizing ? 'max' : 'min'}`;
        evaluation = {
            nodeId,
            depth: ctx.path.length,
            movePath: [...ctx.path],
            alpha,
            beta,
            components: {},
            children: []
        };
        debug.log[nodeId] = evaluation;
    }

    // Clocks do not affect Pawn Wars rules. Remaining depth and root ply are
    // part of the key because terminal values include path.length.
    const key = search.useTable && getAllMoves !== true
        ? game.fen().split(' ').slice(0, 4).join(' ') + '|' + depth + '|' + ctx.path.length : null;
    const cached = key === null ? null : search.table.get(key);
    if (cached && (cached.type === 'EXACT' ||
        (cached.type === 'LOWER' && cached.score >= beta) ||
        (cached.type === 'UPPER' && cached.score <= alpha))) {
        search.stats.ttHits++;
        if (ENABLE_LOGGING) {
            evaluation.score = cached.score;
            evaluation.cache = cached.type;
        }
        return { score: cached.score, evaluation };
    }

    if (depth === 0 || isFinished()) {
        const score = strategy.evaluate(ctx.path);

        if (ENABLE_LOGGING) {
            evaluation.score = score;
            evaluation.isLeaf = true;
        }
        if (key !== null) cacheScore(search, key, score, 'EXACT');
        return { score, evaluation };
    }

    const possibleMoves = getMoves({ verbose: true });
    let movesScores = [];
    let bestScore = isMaximizing ? -Infinity : Infinity;
    const alphaOriginal = alpha;
    const betaOriginal = beta;

    for (let i = 0; i < possibleMoves.length; i++) {
        const move = possibleMoves[i];

        const childCtx = {
            path: [...ctx.path, move.san],
            search,
        };

        if (ENABLE_LOGGING) {
            childCtx.branchId = `${nodeId}-${i}`;
            getTreePath(ctx.path)[move.san] = {
                score: 0,
                turn: game.turn() + ' ' + (isMaximizing ? '↑' : '↓'),
            };
        }

        game.move(move.san);
        try {
            let data = minimax(depth - 1, !isMaximizing, strategy, alpha, beta, childCtx);
            // A cutoff can report bestScore as a bound, not an exact tie.
            // Verify root ties before admitting them to random move selection.
            if (ctx.path.length === 0 && getAllMoves !== true && data.score === bestScore) {
                data = minimax(depth - 1, !isMaximizing, strategy, -Infinity, Infinity, childCtx);
            }
            const score = data.score;

            if (ENABLE_LOGGING) {
                const current_node = getTreePath(ctx.path)[move.san];
                current_node.score = score;
                current_node.zcomponents = data.evaluation.components;
                current_node.zdrawn = drawBoard(move.from);

                evaluation.children.push({
                    move: move.san,
                    score,
                    alpha,
                    beta,
                    pruned: beta <= alpha,
                    components: data.evaluation.components
                });
            }

            if (getAllMoves === true) {
                movesScores.push({ move: move, score, evaluation, path: childCtx.path });
                continue;
            }

            if (isMaximizing ? score >= bestScore : score <= bestScore) {
                movesScores.push({ move: move, score, evaluation, path: childCtx.path });
                bestScore = score;
                isMaximizing ? alpha = Math.max(alpha, score) : beta = Math.min(beta, score);
            }

            if (beta <= alpha) break;
        } finally {
            game.undo();
        }
    }

    if (getAllMoves === true) return movesScores;

    const type = bestScore <= alphaOriginal ? 'UPPER' : bestScore >= betaOriginal ? 'LOWER' : 'EXACT';
    if (key !== null) cacheScore(search, key, bestScore, type);
    return getBestRandomMove(movesScores, isMaximizing ? 'max' : 'min');
}

function checkSearchLimits(search, force) {
    if (!search.enforceLimits) return;
    if (search.maxNodes !== Infinity && search.stats.nodes >= search.maxNodes) {
        abortSearch(search, 'maxNodes');
    }
    if (search.deadline !== Infinity && (force || search.stats.nodes % 64 === 0)
        && search.now() >= search.deadline) {
        abortSearch(search, 'maxTimeMs');
    }
}

function abortSearch(search, reason) {
    search.stats.aborted = true;
    search.stats.abortReason = reason;
    throw search.stopped;
}

function cacheScore(search, key, score, type) {
    if (!search.table.has(key) && search.table.size >= search.maxTableEntries) {
        search.table.delete(search.table.keys().next().value);
    }
    search.table.set(key, { score, type });
}

function getBestRandomMove(movesScores, mode) {
    if (movesScores.length === 0) return null;

    let bestScore = mode === 'max' ? -Infinity : Infinity;
    let minPathLength = Infinity;
    let candidates = [];

    for (let i = 0; i < movesScores.length; i++) {
        const move = movesScores[i];
        const isBetterScore = mode === 'max'
            ? move.score > bestScore
            : move.score < bestScore;

        if (isBetterScore) {
            bestScore = move.score;
            minPathLength = Infinity;
            candidates.length = 0;
        }

        if (move.score === bestScore) {
            if (move.path.length < minPathLength) {
                minPathLength = move.path.length;
                candidates.length = 0;
            }
            if (move.path.length === minPathLength) {
                candidates.push(move);
            }
        }
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
}

function getTreePath(path) {
    let current_node = debug.tree;
    for (const item of path) {
        current_node = current_node[item];
    }
    return current_node;
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
