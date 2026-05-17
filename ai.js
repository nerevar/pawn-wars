// ai.js — minimax engine with alpha-beta pruning
var debug = {
    log: {},
    tree: {},
    config: {}
};

function findBestMove(strategyOrDifficulty, getAllMoves) {
    var strategy;
    if (typeof strategyOrDifficulty === 'object') {
        strategy = strategyOrDifficulty;
    } else {
        strategy = difficultyToStrategy(strategyOrDifficulty);
    }

    debug.log = {};
    debug.tree = {};
    debug.config = { strategy: strategy };

    return minimax(
        strategy.depth,
        game.turn() == 'w',
        strategy,
        -Infinity,
        Infinity,
        { path: [], branchId: 'root' },
        getAllMoves,
    );
}

function minimax(depth, isMaximizing, strategy, alpha, beta, ctx, getAllMoves) {
    let evaluation = {};
    let nodeId = '';
    if (ENABLE_LOGGING) {
        nodeId = `${ctx.branchId}-${depth}-${isMaximizing ? 'max' : 'min'}`;
        evaluation = {
            nodeId,
            depth: strategy.depth - depth,
            movePath: [...ctx.path],
            alpha,
            beta,
            components: {},
            children: []
        };
        debug.log[nodeId] = evaluation;
    }

    if (depth === 0 || isFinished()) {
        const score = strategy.evaluate(ctx.path);

        if (ENABLE_LOGGING) {
            evaluation.score = score;
            evaluation.isLeaf = true;
        }
        return { score, evaluation };
    }

    const possibleMoves = getMoves({ verbose: true });
    let movesScores = [];
    let bestScore = isMaximizing ? -Infinity : Infinity;

    for (let i = 0; i < possibleMoves.length; i++) {
        const move = possibleMoves[i];

        const childCtx = {
            path: [...ctx.path, move.san],
        };

        if (ENABLE_LOGGING) {
            childCtx.branchId = `${nodeId}-${i}`;
            getTreePath(ctx.path)[move.san] = {
                score: 0,
                turn: game.turn() + ' ' + (isMaximizing ? '↑' : '↓'),
            };
        }

        game.move(move.san);
        const data = minimax(depth - 1, !isMaximizing, strategy, alpha, beta, childCtx);
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

        game.undo();

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
    }

    if (getAllMoves === true) return movesScores;

    return getBestRandomMove(movesScores, isMaximizing ? 'max' : 'min');
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
