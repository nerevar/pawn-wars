// ai.js - Главный файл ИИ с обратной совместимостью
// Использует новую модульную структуру из engine/, но сохраняет старый API

var debug = {
    log: {},
    currentBranch: [],
    config: {},
    tree: {}
};

// Загружаем новую модульную систему (если доступна)
let engineModule = null;
// let factorRegistry = null;
let legacyAdapter = null;

if (typeof window === 'undefined') {
    try {
        engineModule = require('./engine');
        // factorRegistry = require('./engine/factors/FactorRegistry').factorRegistry;
        legacyAdapter = require('./engine/factors/LegacyAdapter');
    } catch (e) {
        // Модули еще не загружены, будет использоваться старая система
        console.warn('New engine modules not available, using legacy system');
    }
} else if (typeof window !== 'undefined') {
    // В браузере модули должны быть загружены через script теги
    engineModule = window.engineModule || null;
    // factorRegistry = window.factorRegistry || null;
    legacyAdapter = window.loadLegacyFactors || null;
}

// Загружаем старые факторы для обратной совместимости
if (typeof EVALUATION_FACTORS !== 'undefined' && legacyAdapter) {
    try {
        legacyAdapter.loadLegacyFactors(EVALUATION_FACTORS);
    } catch (e) {
        console.warn('Failed to load legacy factors:', e);
    }
}

/**
 * Находит лучший ход (использует новую систему, если доступна)
 */
function findBestMove(aiConfigLevel, getAllMoves = false) {
    debug.log = {};
    debug.tree = {};

    // Используем новую систему, если доступна
    if (engineModule && engineModule.findBestMove) {
        return engineModule.findBestMove(aiConfigLevel, getAllMoves);
    }

    // Иначе используем старую систему (для обратной совместимости)
    return findBestMoveLegacy(aiConfigLevel, getAllMoves);
}

/**
 * Старая реализация findBestMove (для обратной совместимости)
 */
function findBestMoveLegacy(aiConfigLevel, getAllMoves = false) {
    debug.log = {};
    debug.tree = {};

    if (typeof aiConfigLevel === 'object') {
        debug.config = aiConfigLevel;
        if (!debug.config.depth) {
            debug.config.depth = 4;
        }
    } else {
        debug.config = {
            aiDifficulty: aiConfigLevel,
        };

        if (aiConfigLevel == 1) {
            debug.config.depth = 3;
        } else if (aiConfigLevel == 2) {
            debug.config.depth = 4;
        } else if (aiConfigLevel == 3) {
            debug.config.depth = 5;
        } else {
            debug.config.depth = 4;
        }

        if (aiConfigLevel == 5) {
            debug.config.factors = [
                { id: 'pawnAdvancement', weight: 1.0 }
            ];
        }

        if (aiConfigLevel == 6) {
            debug.config.factors = [
                { id: 'mediumPawnAdvancement', weight: 2.0 },
                { id: 'mediumCenterColumnBonus', weight: 0.2 },
                { id: 'mediumNextMoveSafety', weight: 2.0 },
                { id: 'mediumFreePath', weight: 0.7 },
                { id: 'mediumAdjacentThreat', weight: -0.8 },
            ];
        }

        if (aiConfigLevel == 7) {
            const superSmartAiConfig = {
                factors: [
                    { id: 'pawnCount', weight: 1.0 },
                    { id: 'pawnAdvancementAdvanced', weight: 1.0 },
                    { id: 'passedPawnsPhaseAdaptive', weight: 2.0 },
                    { id: 'promotionRace', weight: 1.5 },
                    { id: 'blockedPawns', weight: -1.2 },
                    { id: 'opponentBlockedPawns', weight: 0.7 },
                    { id: 'pawnIslands', weight: -0.4 },
                    { id: 'isolatedPawns', weight: -0.6 },
                    { id: 'connectedPawns', weight: 0.4 },
                    { id: 'mobility', weight: 0.2 },
                    { id: 'opponentRestriction', weight: 0.3 },
                    { id: 'keySquareControl', weight: 0.6 },
                    { id: 'threatenedPawns', weight: -1.8 },
                    { id: 'potentialCaptures', weight: 0.3 },
                    { id: 'pawnMajority', weight: 0.5 },
                    { id: 'openingTempo', weight: 0.1 },
                ]
            };
            debug.config.factors = superSmartAiConfig.factors;
        }
    }

    return minimax(
        debug.config.depth,
        game.turn() == 'w',
        debug.config,
        -Infinity,
        Infinity,
        { path: [], branchId: 'root' },
        getAllMoves,
    );
}

/**
 * Minimax (старая реализация для обратной совместимости)
 */
function minimax(
    depth,
    isMaximizing,
    config,
    alpha,
    beta,
    ctx,
    getAllMoves = false,
) {
    let evaluation = {};
    let nodeId = '';
    if (ENABLE_LOGGING) {
        nodeId = `${ctx.branchId}-${depth}-${isMaximizing ? 'max' : 'min'}`;
        evaluation = {
            nodeId,
            depth: debug.config.depth - depth,
            movePath: [...ctx.path],
            alpha,
            beta,
            components: {},
            children: []
        };
    }

    ENABLE_LOGGING && (debug.log[nodeId] = evaluation);

    if (depth === 0 || isFinished()) {
        const score = evaluateBoard(config, ENABLE_LOGGING ? nodeId : null, ctx.path);
        if (ENABLE_LOGGING) {
            evaluation.score = score;
            evaluation.isLeaf = true;
        }
        return { score, evaluation };
    }

    const possibleMoves = getMoves({ verbose: true });
    IS_DEBUG && console.warn('START MINIMAX. moves: ', possibleMoves, `depth ${depth}, PATH: ${ctx.path.join(' ')} isMax: ${isMaximizing}`);
    let movesScores = [];

    let bestScore = isMaximizing ? -Infinity : Infinity;
    for (let i = 0; i < possibleMoves.length; i++) {
        const move = possibleMoves[i];
        const childCtx = {
            path: [...ctx.path, move.san],
        };

        let current_node = {};
        if (ENABLE_LOGGING) {
            branchId = `${nodeId}-${i}`;
            childCtx['branchId'] = branchId;

            getTreePath(ctx.path)[move.san] = {
                score: 0,
                turn: game.turn() + ' ' + (isMaximizing ? '↑' : '↓'),
            };
            current_node = getTreePath(ctx.path)[move.san];
        }

        game.move(move.san);
        const data = minimax(depth - 1, !isMaximizing, config, alpha, beta, childCtx);
        const score = data.score;

        if (ENABLE_LOGGING) {
            const childEval = data.evaluation;
            const drawnGame = drawBoard(move.from);

            current_node['score'] = score;
            current_node['zcomponents'] = childEval.components;
            current_node['zdrawn'] = drawnGame;
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

        IS_DEBUG && console.warn(`    FOR MOVE ${move.san} GOT SCORE: ${score} (prev ${bestScore}${(isMaximizing ? score >= bestScore : score <= bestScore) ? '!!!' : ''}), depth ${depth}, isMax: ${isMaximizing}`);

        if (getAllMoves == true) {
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

    const val = getBestRandomMove(movesScores, mode = isMaximizing ? 'max' : 'min');
    IS_DEBUG && console.log('getBestRandomMove', mode = isMaximizing ? 'max' : 'min', structuredClone(val), 'depth', depth, structuredClone(movesScores));
    return val;
}

/**
 * Оценка доски (старая реализация)
 */
function evaluateBoard(config, nodeId, path) {
    // Используем новую систему, если доступна
    if (engineModule && engineModule.evaluateBoard) {
        return engineModule.evaluateBoard(config, nodeId, path);
    }

    // Старая реализация
    if (config?.aiDifficulty === 0) {
        ENABLE_LOGGING && logNodeFactors(nodeId, {'random': 1}, {'random': 1}, 0, 0);
        return 0;
    }

    if (config?.aiDifficulty >= 1 && config?.aiDifficulty <= 3) {
        const score = evaluateBoardMedium(path);
        ENABLE_LOGGING && logNodeFactors(nodeId, {'medium': 1}, {'medium': 1}, 0, score);
        return score;
    }

    let finishedScore = 0;
    if (config?.aiDifficulty >= 4) {
        finishedScore = checkGameEnd(isFinished(), path);
        if (finishedScore !== null) {
            ENABLE_LOGGING && logNodeFactors(nodeId, {'gameEnd': 1}, {'gameEnd': 1}, finishedScore, finishedScore);
            return finishedScore;
        }
    }

    if (!config || !config.factors || config.factors.length === 0) {
        ENABLE_LOGGING && logNodeFactors(nodeId, {'emptyConfig': 1}, {'emptyConfig': 1}, 0, 0);
        return 0;
    }

    let totalWhiteScore = 0;
    let totalBlackScore = 0;
    const whiteComponents = {};
    const blackComponents = {};

    for (const factorConfig of config.factors) {
        if (factorConfig.weight === 0) {
            continue;
        }
        
        // Используем новую систему, если доступна
        let factorDefinition = null;
        if (factorRegistry) {
            factorDefinition = factorRegistry.get(factorConfig.id);
        } else if (typeof EVALUATION_FACTORS !== 'undefined') {
            factorDefinition = EVALUATION_FACTORS[factorConfig.id];
        }

        if (!factorDefinition) {
            console.warn(`Evaluation factor with id "${factorConfig.id}" not found.`);
            continue;
        }

        const params = {
            ...(factorDefinition.defaultParams || {}),
            ...(factorConfig.params || {})
        };

        const whiteFactorScore = factorDefinition.evaluate('w', params);
        const blackFactorScore = factorDefinition.evaluate('b', params);

        const weightedWhiteScore = whiteFactorScore * factorConfig.weight;
        const weightedBlackScore = blackFactorScore * factorConfig.weight;

        if (isNaN(weightedWhiteScore)) {
            console.error('isNan', factorDefinition);
        }

        totalWhiteScore += weightedWhiteScore;
        totalBlackScore += weightedBlackScore;

        if (ENABLE_LOGGING) {
            whiteComponents[factorConfig.id] = weightedWhiteScore;
            blackComponents[factorConfig.id] = weightedBlackScore;
        }
    }

    const finalScore = totalWhiteScore - totalBlackScore;

    if (isNaN(finalScore)) {
        // console.error('NaN', config, whiteComponents, blackComponents)
    }

    ENABLE_LOGGING && logNodeFactors(nodeId, whiteComponents, blackComponents, 0, finalScore);

    return finalScore;
}

function logNodeFactors(nodeId, whiteComponents, blackComponents, finishedScore, totalScore) {
    if (!debug.log[nodeId]) {
        debug.log[nodeId] = {};
    }
    debug.log[nodeId].components = {
        white: whiteComponents,
        black: blackComponents,
        finishedScore: finishedScore,
        total: totalScore,
    };

    IS_DEBUG && console.log('evaluateBoard', totalWhiteScore, totalBlackScore, finalScore, {
        'scores': {
            'white': whiteComponents,
            'black': blackComponents,
            'finishedScore': 0,
            'totalScore': finalScore,
        }
    });
}

function makeAiMove(aiDifficulty) {
    // Используем новую систему, если доступна
    if (engineModule && engineModule.makeAiMove) {
        return engineModule.makeAiMove(aiDifficulty);
    }

    // Старая реализация
    if (isFinished()) return;

    var possibleMoves = getMoves();
    if (possibleMoves.length === 0) return;

    const { move, score } = findBestMove(aiDifficulty);
    console.log('makeAiMove', move, 'aiDifficulty', aiDifficulty, 'score:', score);
    if (!move) {
        return null;
    }

    game.move(move);
    if (typeof window !== 'undefined') {
        board.position(game.fen());
        updateStatus();
        updateURL();
    }

    return { move, score };
}

function run_game(cnt, ai1, ai2) {
    let stats = []
    for (var i = 0; i < cnt; ++i) {
        initializeGame()
        while (!isFinished()) {
            if (getMoves().length === 0) break;
            const currentAiLevel = game.turn() == 'w' ? ai1 : ai2;
            const { move } = findBestMove(currentAiLevel);
            if (!move) break;
            game.move(move);
        }
        stats.push(isFinished())

        process.stdout.write('.')
        ENABLE_LOGGING && logGame(ai1, ai2, isFinished(), game);
    }
    return stats;
}

function getTreePath(path) {
    let current_node = debug.tree;
    for (item of path) {
        current_node = current_node[item]
    }
    return current_node;
}

function getPathDepth(path) {
    return path.split(' ').length;
}

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

function evaluateMove(move, aiDifficulty, depth = 3) {
    depth = depth || 3;
    const moveStr = typeof move === 'string' ? move : move?.san;
    game.move(moveStr)
    const { score } = minimax((game.turn() === 'w'), aiDifficulty, -Infinity, Infinity, [moveStr]);
    game.undo();
    return { move, score }
}

function checkGameEnd(isFinishedResult, path) {
    if (!isFinishedResult) {
        return null;
    }

    let score = 0;
    if (isFinishedResult.includes('w')) {
        score = +100000;
        if (path) {
            score += 100 - path.length;
        }
        return score;
    }
    if (isFinishedResult.includes('b')) {
        score = -100000;
        if (path) {
            score -= 100 - path.length;
        }
        return score;
    }

    return null;
}

function evaluateBoardMedium(path) {
    let score = 0;
    const board = game.board();

    const isFinishedResult = checkGameEnd(isFinished(), path);
    if (isFinishedResult !== null) {
        return isFinishedResult;
    }

    for (let col = 0; col < 8; col++) {
        for (let row = 0; row < 8; row++) {
            const piece = board[row][col];
            if (piece && piece.type === 'p') {
                let promotionDistance;
                if (piece.color === 'b') {
                    promotionDistance = 7 - row;
                } else {
                    promotionDistance = row;
                }

                let centerColumnBonus = 0;
                if (col > 0 && col < 7) {
                    centerColumnBonus = 0.2;
                }

                let nextMoveFree = 0;
                if (piece.color === 'b') {
                    if (row + 1 < 8 && !board[row + 1][col]) {
                        let willBeFreeScore = 0;
                        if (col > 0 && row + 2 < 8 && board[row + 2][col - 1] && board[row + 2][col - 1].color === 'w') {
                        } else if (col < 7 && row + 2 < 8 && board[row + 2][col + 1] && board[row + 2][col + 1].color === 'w') {
                        } else {
                            willBeFreeScore = 1;
                        }
                        nextMoveFree += willBeFreeScore;
                    }
                } else {
                    if (row - 1 >= 0 && !board[row - 1][col]) {
                        let willBeFreeScore = 0;
                        if (col > 0 && row - 2 >= 0 && board[row - 2][col - 1] && board[row - 2][col - 1].color === 'b') {
                        } else if (col < 7 && row - 2 >= 0 && board[row - 2][col + 1] && board[row - 2][col + 1].color === 'b') {
                        } else {
                            willBeFreeScore = 1;
                        }
                        nextMoveFree += willBeFreeScore;
                    }
                }

                let freePathBonus = 0;
                if (piece.color === 'b') {
                    let isPathBlocked = false;
                    for (let r = row + 1; r < 8; r++) {
                        if (board[r][col]) {
                            isPathBlocked = true;
                            break;
                        }
                    }
                    if (!isPathBlocked) {
                        freePathBonus += 0.7;
                    }
                } else {
                    let isPathBlocked = false;
                    for (let r = row - 1; r >= 0; r--) {
                        if (board[r][col]) {
                            isPathBlocked = true;
                            break;
                        }
                    }
                    if (!isPathBlocked) {
                        freePathBonus += 0.7;
                    }
                }

                let adjacentThreatPenalty = 0;
                if (piece.color === 'b') {
                    if (col > 0 && board[row][col - 1] && board[row][col - 1].color === 'w') {
                        adjacentThreatPenalty -= 0.8;
                    }
                    if (col < 7 && board[row][col + 1] && board[row][col + 1].color === 'w') {
                        adjacentThreatPenalty -= 0.8;
                    }
                } else {
                    if (col > 0 && board[row][col - 1] && board[row][col - 1].color === 'b') {
                        adjacentThreatPenalty -= 0.8;
                    }
                    if (col < 7 && board[row][col + 1] && board[row][col + 1].color === 'b') {
                        adjacentThreatPenalty -= 0.8;
                    }
                }

                let pieceScore =
                    (8 - promotionDistance) * 2 +
                    freePathBonus +
                    adjacentThreatPenalty +
                    centerColumnBonus +
                    nextMoveFree * 2;

                if (piece.color === 'b') {
                    score -= pieceScore;
                } else {
                    score += pieceScore;
                }
            }
        }
    }

    return score;
}

function logGame(ai1, ai2, isFinished, game) {
    const fs = require('fs');
    const pgn = extractMovesFromPGN(game.pgn());
    fs.appendFileSync('games.log', `${ai1};${ai2};${isFinished};${pgn}\n`);
}

function runComparison(ai1, ai2, N = 1000, confidenceLevel = 0.95) {
    const N1 = Math.floor(N / 2);
    const N2 = N - N1;

    const resultsAI1White = run_game(N1, ai1, ai2);
    const resultsAI2White = run_game(N2, ai2, ai1);

    const ai1Wins =
        resultsAI1White.filter(res => res.includes('w')).length +
        resultsAI2White.filter(res => res.includes('b')).length;

    const ai2Wins = N - ai1Wins;
    console.log(ai1Wins, ai2Wins)

    const p = ai1Wins / N;
    const z = (p - 0.5) / Math.sqrt(0.25 / N);
    const pVal = 2 * (1 - cumulativeStdNormal(Math.abs(z)));

    const zCrit = zScore(1 - (1 - confidenceLevel) / 2);
    const margin = zCrit * Math.sqrt(p * (1 - p) / N);
    const ci = [p - margin, p + margin];

    return {
        ai1: ai1Wins,
        ai2: ai2Wins,
        winRate: p,
        difference: (p - 0.5) * 100,
        confidenceInterval: ci.map(v => (v * 100).toFixed(1) + '%'),
        pValue: pVal.toExponential(3),
        significant: pVal < (1 - confidenceLevel)
    };
}

function cumulativeStdNormal(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - prob : prob;
}

function zScore(p) {
    if (p < 0.5) return -zScore(1 - p);
    const a = [2.515517, 0.802853, 0.010328];
    const b = [1.432788, 0.189269, 0.001308];
    const t = Math.sqrt(-2 * Math.log(1 - p));
    return t - (a[0] + a[1] * t + a[2] * t * t) / (1 + b[0] * t + b[1] * t * t + b[2] * t * t * t);
}

module.exports = {
    makeAiMove,
    run_game,
    findBestMove,
    evaluateBoard,
    debug,
    runComparison,
};
