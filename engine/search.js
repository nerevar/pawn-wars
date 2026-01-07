/**
 * Модуль поиска ходов (Minimax с альфа-бета отсечением)
 */

function getDependencies() {
    const deps = {};
    
    if (typeof window === 'undefined') {
        try {
            const gameModule = require('../game');
            deps.getMoves = gameModule.getMoves;
            deps.isFinished = gameModule.isFinished;
            deps.game = typeof global !== 'undefined' ? global.game : null;
        } catch (e) {
            deps.getMoves = typeof global !== 'undefined' ? global.getMoves : null;
            deps.isFinished = typeof global !== 'undefined' ? global.isFinished : null;
            deps.game = typeof global !== 'undefined' ? global.game : null;
        }
    } else if (typeof window !== 'undefined') {
        deps.getMoves = window.getMoves;
        deps.isFinished = window.isFinished;
        deps.game = window.game;
    }
    
    return deps;
}

function getEvaluator() {
    if (typeof window === 'undefined') {
        return require('./evaluator');
    } else if (typeof window !== 'undefined') {
        return {
            evaluateBoard: window.evaluateBoard
        };
    }
    throw new Error('Evaluator is not available');
}

/**
 * Minimax алгоритм с альфа-бета отсечением
 */
function minimax(
    depth,
    isMaximizing,
    config,
    alpha,
    beta,
    ctx,
    getAllMoves = false
) {
    const { getMoves, isFinished, game } = getDependencies();
    const { evaluateBoard } = getEvaluator();
    
    const ENABLE_LOGGING = (typeof global !== 'undefined' ? global.ENABLE_LOGGING : false) ||
                          (typeof window !== 'undefined' ? window.ENABLE_LOGGING : false);
    const IS_DEBUG = (typeof global !== 'undefined' ? global.IS_DEBUG : false) ||
                    (typeof window !== 'undefined' ? window.IS_DEBUG : false);
    const debug = (typeof global !== 'undefined' ? global.debug : null) ||
                  (typeof window !== 'undefined' ? window.debug : null);

    let evaluation = {};
    let nodeId = '';
    
    if (ENABLE_LOGGING && debug) {
        nodeId = `${ctx.branchId}-${depth}-${isMaximizing ? 'max' : 'min'}`;
        evaluation = {
            nodeId,
            depth: config.depth - depth,
            movePath: [...ctx.path],
            alpha,
            beta,
            components: {},
            children: []
        };
        debug.log[nodeId] = evaluation;
    }

    // Терминальное условие
    if (depth === 0 || (isFinished && isFinished())) {
        const score = evaluateBoard(config, ENABLE_LOGGING ? nodeId : null, ctx.path);
        
        if (ENABLE_LOGGING && debug) {
            evaluation.score = score;
            evaluation.isLeaf = true;
        }
        return { score, evaluation };
    }

    const possibleMoves = getMoves({ verbose: true });
    if (IS_DEBUG) {
        console.warn('START MINIMAX. moves:', possibleMoves, `depth ${depth}, PATH: ${ctx.path.join(' ')}, isMax: ${isMaximizing}`);
    }
    
    let movesScores = [];
    let bestScore = isMaximizing ? -Infinity : Infinity;

    for (let i = 0; i < possibleMoves.length; i++) {
        const move = possibleMoves[i];
        const childCtx = {
            path: [...ctx.path, move.san],
        };

        let current_node = {};
        let branchId = '';
        
        if (ENABLE_LOGGING && debug) {
            branchId = `${nodeId}-${i}`;
            childCtx['branchId'] = branchId;
            
            const getTreePath = (path) => {
                let current_node = debug.tree || {};
                for (const item of path) {
                    if (!current_node[item]) {
                        current_node[item] = {};
                    }
                    current_node = current_node[item];
                }
                return current_node;
            };
            
            getTreePath(ctx.path)[move.san] = {
                score: 0,
                turn: game.turn() + ' ' + (isMaximizing ? '↑' : '↓'),
            };
            current_node = getTreePath(ctx.path)[move.san];
        }

        game.move(move.san);
        const data = minimax(depth - 1, !isMaximizing, config, alpha, beta, childCtx);
        const score = data.score;

        if (ENABLE_LOGGING && debug) {
            const childEval = data.evaluation;
            const drawBoard = (typeof window === 'undefined') 
                ? require('../game').drawBoard 
                : (typeof window !== 'undefined' ? window.drawBoard : null);
            
            current_node['score'] = score;
            current_node['zcomponents'] = childEval.components;
            if (drawBoard) {
                current_node['zdrawn'] = drawBoard(move.from);
            }
            current_node['znodeId'] = nodeId;

            evaluation.children.push({
                move: move.san,
                score,
                alpha,
                beta,
                pruned: beta <= alpha,
                components: childEval.components
            });
        }

        game.undo();

        if (IS_DEBUG) {
            console.warn(`FOR MOVE ${move.san} GOT SCORE: ${score} (prev ${bestScore}${(isMaximizing ? score >= bestScore : score <= bestScore) ? '!!!' : ''}), depth ${depth}, isMax: ${isMaximizing}`);
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

        // Альфа-бета отсечение
        if (beta <= alpha) break;
    }

    if (getAllMoves === true) return movesScores;

    const val = getBestRandomMove(movesScores, isMaximizing ? 'max' : 'min');
    if (IS_DEBUG) {
        console.log('getBestRandomMove', isMaximizing ? 'max' : 'min', val, 'depth', depth, movesScores);
    }
    return val;
}

/**
 * Выбирает лучший ход из кандидатов с одинаковой оценкой
 */
function getBestRandomMove(movesScores, mode = 'max') {
    if (movesScores.length === 0) return null;

    let bestScore = mode === 'max' ? -Infinity : Infinity;
    let minPathLength = Infinity;
    let candidates = [];
    let currentCandidateIndex = 0;

    for (let i = 0; i < movesScores.length; i++) {
        const move = movesScores[i];
        const isBetterScore = mode === 'max'
            ? move.score > bestScore
            : move.score < bestScore;

        if (isBetterScore) {
            bestScore = move.score;
            minPathLength = Infinity;
            currentCandidateIndex = 0;
            candidates.length = 0;
        }

        if (move.score === bestScore) {
            if (move.path.length < minPathLength) {
                minPathLength = move.path.length;
                currentCandidateIndex = 0;
                candidates.length = 0;
            }

            if (move.path.length === minPathLength) {
                if (currentCandidateIndex < candidates.length) {
                    candidates[currentCandidateIndex++] = move;
                } else {
                    candidates.push(move);
                    currentCandidateIndex++;
                }
            }
        }
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
}

// Экспорт для Node.js
if (typeof window === 'undefined') {
    module.exports = {
        minimax,
        getBestRandomMove
    };
}

// Экспорт для браузера
if (typeof window !== 'undefined') {
    window.minimax = minimax;
    window.getBestRandomMove = getBestRandomMove;
}

