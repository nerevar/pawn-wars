// ai.js
var debug = {
    log: {},
    currentBranch: [],
    config: { enabled: true, depth: 0 }
};

function findBestMove(aiDifficulty, getAllMoves=false) {
    debug.log = {}; // Сброс лога
    debug.tree = {};
    debug.config.depth = 3 + 1; // Сохраняем глубину поиска
    return minimax(
        debug.config.depth,
        game.turn() == 'w',
        aiDifficulty,
        -Infinity,
        Infinity,
        { path: [], branchId: 'root' }, // Инициализация корневой ветки
        getAllMoves,
    );
}

function minimax(
    depth,
    isMaximizing,
    aiDifficulty,
    alpha,
    beta,
    ctx,
    getAllMoves=false,
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

    // Запись в лог перед вычислениями
    ENABLE_LOGGING && (debug.log[nodeId] = evaluation);

    // console.error('arguments', [].slice.apply(arguments));
    if (depth === 0 || isFinished()) {
        const score = evaluateBoard3(aiDifficulty, ENABLE_LOGGING ? nodeId : null, ctx.path)

        if (ENABLE_LOGGING) {
            evaluation.score = score;
            evaluation.isLeaf = true;
        }
        return { score, evaluation };
    }

    const possibleMoves = getMoves({ verbose: true});
    IS_DEBUG && console.warn('START MINIMAX. moves: ', possibleMoves, `depth ${depth}, PATH: ${path.join(' ')} isMax: ${isMaximizing}`)
    let movesScores = [];

    let bestScore = isMaximizing ? -Infinity : Infinity;
    for (let i = 0; i < possibleMoves.length; i++) {
        const move = possibleMoves[i];

        const childCtx = {
            path: [...ctx.path, move.san],
        };

        let current_node = {};
        if (ENABLE_LOGGING) {
            branchId = `${nodeId}-${i}`
            childCtx['branchId'] = branchId;

            getTreePath(ctx.path)[move.san] = {
                score: 0,
                turn: game.turn() + ' ' + (isMaximizing ? '↑' : '↓'),
            };
            current_node = getTreePath(ctx.path)[move.san];
        }

        game.move(move.san);
        const data = minimax(depth - 1, !isMaximizing, aiDifficulty, alpha, beta, childCtx);
        const score = data.score;
        if (ENABLE_LOGGING) {
            const childEval = data.evaluation;
            const drawnGame = drawBoard(move.from);

            current_node['score'] = score;
            current_node['zcomponents'] = childEval.components;
            current_node['zdrawn'] = drawnGame;
            current_node['znodeId'] = nodeId;

            // Запись данных дочернего узла
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

        IS_DEBUG && console.warn(`    FOR MOVE ${move.san} GOT SCORE: ${score} (prev ${bestScore}${(isMaximizing ? score >= bestScore : score <= bestScore) ? '!!!' : ''}), depth ${depth}, isMax: ${isMaximizing}`)

        if (getAllMoves == true) {
            movesScores.push({ move: move, score, evaluation, path: childCtx.path });
            continue
        }

        if (isMaximizing ? score >= bestScore : score <= bestScore) {
            // IS_DEBUG && console.warn(`        FOR MOVE ${move} SAVE SCORE: ${score}, depth ${depth}, PATH: ${path.join(' ')}, BestScore: ${bestScore}, isMax: ${isMaximizing}`)
            // Обновление лучшего хода только если needMoveTracking = true, иначе только score
            movesScores.push({ move: move, score, evaluation, path: childCtx.path });

            bestScore = score;

            isMaximizing ? alpha = Math.max(alpha, score) : beta = Math.min(beta, score);
        }

        // Альфа-бета отсечение
        if (beta <= alpha) break;
    }

    if (getAllMoves === true) return movesScores;

    const val = getBestRandomMove(movesScores, mode = isMaximizing ? 'max' : 'min');
    IS_DEBUG && console.log('getBestRandomMove', mode = isMaximizing ? 'max' : 'min', structuredClone(val), 'depth', depth, structuredClone(movesScores))
    return val;
}

function evaluateBoard3(aiDifficulty, nodeId, path) {
    if (aiDifficulty == 1) {
        // Запись компонентов в лог
        ENABLE_LOGGING && (debug.log[nodeId].components = {
            white: {},
            black: {},
            finishedScore: 0,
            total: 0,
        });

        return 0;
    }

    let finishedScore = 0;
    if (aiDifficulty >= 2) {
        // Winning condition check
        // console.log(debug.log[nodeId])
        finishedScore = getIsFinishedWeight(isFinished(), path)
        if (finishedScore != 0) {
            //     IS_DEBUG && console.log('evaluateBoard3', isFinished(), finishedScore);
            // Запись компонентов в лог
            ENABLE_LOGGING && (debug.log[nodeId].components = {
                white: {},
                black: {},
                finishedScore: finishedScore,
                total: finishedScore,
            });
            return finishedScore;
        }
    }

    let whitePawnAdvancement = 0;
    let blackPawnAdvancement = 0;
    if (aiDifficulty >= 3) {
        whitePawnAdvancement = evaluatePawnAdvancement('w')
        blackPawnAdvancement = evaluatePawnAdvancement('b')
    }

    let whitePawnCount = 0;
    let blackPawnCount = 0;
    if (aiDifficulty >= 4) {
        whitePawnCount = evaluatePawnCount('w')
        blackPawnCount = evaluatePawnCount('b')
    }

    let whiteCaptureOpportunities = 0;
    let blackCaptureOpportunities = 0;
    if (aiDifficulty >= 5) {
        whiteCaptureOpportunities += evaluateCaptureOpportunities('w')
        blackCaptureOpportunities += evaluateCaptureOpportunities('b')
    }

    let whiteFreePath = 0;
    let blackFreePath = 0;
    if (aiDifficulty == 6) {
        whiteFreePath += evaluateFreePath('w')
        blackFreePath += evaluateFreePath('b')
    }

    const whiteScore = whitePawnAdvancement + whitePawnCount + whiteCaptureOpportunities + whiteFreePath;
    const blackScore = blackPawnAdvancement + blackPawnCount + blackCaptureOpportunities + blackFreePath;

    IS_DEBUG && console.log('evaluateBoard3', whiteScore, blackScore, whiteScore - blackScore, {
        'scores': {
            'whitePawnAdvancement': whitePawnAdvancement,
            'whitePawnCount': whitePawnCount,
            'blackPawnAdvancement': blackPawnAdvancement,
            'blackPawnCount': blackPawnCount,
            'whiteCaptureOpportunities': whiteCaptureOpportunities,
            'blackCaptureOpportunities': blackCaptureOpportunities,
            'whiteFreePath': whiteFreePath,
            'blackFreePath': blackFreePath,
            'whiteScore': whiteScore,
            'blackScore': blackScore,
            'finishedScore': finishedScore,
            'totalScore': finishedScore + whiteScore - blackScore,
        }
    }, drawBoard())

    // Запись компонентов в лог
    ENABLE_LOGGING && (debug.log[nodeId].components = {
        white: { whitePawnAdvancement, whitePawnCount, whiteCaptureOpportunities, whiteFreePath },
        black: { blackPawnAdvancement, blackPawnCount, blackCaptureOpportunities, blackFreePath },
        finishedScore: finishedScore,
        total: whiteScore - blackScore,
    });

    // return debug.log[nodeId].components.total;

    return whiteScore - blackScore;
}

function makeAiMove(aiDifficulty) {
    if (isFinished()) return;

    if (!aiDifficulty) aiDifficulty = 2;

    var possibleMoves = getMoves();
    if (possibleMoves.length === 0) return;

    const { move, score } = findBestMove(aiDifficulty)
    console.log('makeAiMove', move, 'aiDifficulty', aiDifficulty, 'score:', score)
    if (!move) {
        // No moves available, return null. evaluateBoard will handle the consequences
    }

    game.move(move);
    if (typeof window !== 'undefined') {
        board.position(game.fen());
        updateStatus();
        updateURL();
    }

    return { move, score }
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
        // console.log('finished:', isFinished(), 'turn', game.turn())
        stats.push(isFinished())

        // Отображение прогресса игр
        process.stdout.write('.')
        if ((i + 1) % 10 === 0) {
            process.stdout.write('\n');
            // if ((i + 1) === cnt) {
            //     process.stdout.write('\n'); // Переходим на новую строку, если все игры завершены
            // }
        }
        ENABLE_LOGGING && logGame(ai1, ai2, isFinished(), game);
    }
    console.log('')
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

    // Одна итерация с одновременной проверкой всех условий
    for (let i = 0; i < movesScores.length; i++) {
        const move = movesScores[i];

        // Проверка score
        const isBetterScore = mode === 'max'
            ? move.score > bestScore
            : move.score < bestScore;

        // Обновление лучшего score и сброс данных
        if (isBetterScore) {
            bestScore = move.score;
            minPathLength = Infinity;
            currentCandidateIndex = 0;
            candidates.length = 0;
        }

        // Только для ходов с текущим лучшим score
        if (move.score === bestScore) {
            // Проверка длины пути
            if (move.path.length < minPathLength) {
                minPathLength = move.path.length;
                currentCandidateIndex = 0;
                candidates.length = 0;
            }

            // Добавление в кандидаты
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

    // Случайный выбор из кандидатов
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

function evaluatePawnAdvancement(color) {
    // бонус за расстояние до финиша
    let score = 0;
    const promotionRow = color === 'w' ? 7 : 0;
    getPawns(color).forEach(pawn => {
        const distance = Math.abs(pawn.row - promotionRow);
        switch (distance) {
            case 0: score += Infinity;  // победа
            case 1: score += 1000;  // предпоследний ряд - почти победа
            case 2: score += 100;  // бонус за 6ю для белых и 3ю для черных горизонталь
            default: score += (7 - distance) * 10; // бонус за расстояние для остальных клеток
        }
    });
    return score;
}

// 2. Новые аспекты: подсчет пешек и оценка разменов
function evaluatePawnCount(color) {
    const count = getPawns(color).length;
    return count * 50; // +50 за каждую пешку
}

function evaluateCaptureOpportunities(color) {
    let score = 0;
    const enemyColor = color === 'w' ? 'b' : 'w';
    const forward = color === 'w' ? 1 : -1;

    getPawns(color).forEach(pawn => {
        const captureCols = [pawn.col - 1, pawn.col + 1];

        captureCols.forEach(cc => {
            if (cc < 0 || cc >= 8) return;

            const targetRow = pawn.row + forward;
            if (targetRow < 0 || targetRow >= 8) return;

            const target = game.board()[7 - targetRow][cc];
            if (target && target.color === enemyColor) {
                // Проверка безопасности взятия

                // Проверяем защиту своей пешки после взятия
                // число attackers включает в себя саму атакующую пешку
                const attackers = [cc - 1, cc + 1].filter(dc =>
                    dc >= 0 && dc <= 7 && game.board()[7 - pawn.row][dc]?.color === color
                ).length;

                // Проверяем ответное взятие (защитники пешки)
                const defenders = [cc - 1, cc + 1].filter(dc =>
                    dc >= 0 && dc <= 7 && game.board()[7 - (targetRow + forward)][dc]?.color === enemyColor
                ).length;

                let move_score = 0
                if (attackers == defenders) {
                    move_score = 20; // Нейтральный размен
                    // TODO: учитывать, выгодны ли нейтральные размены или нет
                } else if (attackers === 1 && defenders == 0) {
                    move_score = 80;
                } else {
                    move_score = (attackers - defenders) * 40;
                }

                IS_DEBUG && console.error(`ВЗЯТИЕ ${pawn?.square} x ${target.square}. attackers: ${attackers}, defenders: ${defenders}, move_score: ${move_score}`)

                score += move_score
            }
        });
    });

    return score;
}

function evaluateFreePath(color) {
    let score = 0;
    const enemyColor = color === 'w' ? 'b' : 'w';
    const forward = color === 'w' ? 1 : -1;
    const promotionRow = color === 'w' ? 7 : 0;

    getPawns(color).forEach(pawn => {
        let isRowFree = true;
        for (let r = pawn.row + 1; r < promotionRow; r += forward) {
            if (game.board()[7 - r][pawn.col]) {
                isRowFree = false;
                break;
            }
        }
        let isFullPathFree = isRowFree ? true : false;
        if (isRowFree) {
            for (let c = Math.max(pawn.col - 1, 0); c <= Math.min(pawn.col + 1, 7); ++c) {
                for (let r = pawn.row + 1; r < promotionRow; r += forward) {
                    if (game.board()[7 - r][c] && game.board()[7 - r][c].color == enemyColor) {
                        isFullPathFree = false;
                        break;
                    }
                }
            }
        }
        if (isRowFree) {
            // score += 20;
            if (isFullPathFree) {
                score += 100
            }
        }
        IS_DEBUG && console.error(pawn?.square, 'isRowFree', isRowFree, 'isFullPathFree', isFullPathFree)
    });

    return score;
}




function printDebugLog2(debugLog, options = {}) {
    // Настройки по умолчанию
    const config = {
        maxDepth: Infinity,              // Максимальная глубина отображения
        showComponents: true,            // Показывать компоненты оценки
        showPrunedBranches: true,        // Показывать обрезанные ветви
        colorize: true,                  // Использовать цвета
        indentSize: 4,                   // Размер отступа
        compactComponents: false,        // Компактное отображение компонентов
        // rootNodeId: "root-3-min",        // ID корневого узла
        showOnlyBestPath: false,         // Показывать только лучший путь
        ...options
    };

    // // Получение корневого узла
    // const rootNode = debugLog[config.rootNodeId];
    // if (!rootNode) {
    //     console.error("Корневой узел не найден!");
    //     return;
    // }

    console.log('%c🔍 Анализ дерева ходов', 'font-size: 16px; font-weight: bold; color: blue;');

    // Карта глубины -> список узлов
    const nodesByDepth = {};
    // Карта для отслеживания лучших ходов
    const bestMoves = {};

    // Собираем узлы по глубине
    Object.entries(debugLog).forEach(([nodeId, node]) => {
        if (!nodesByDepth[node.depth]) {
            nodesByDepth[node.depth] = [];
        }
        nodesByDepth[node.depth].push(node);
    });

    // Находим лучшие ходы для каждой глубины
    Object.keys(nodesByDepth).forEach(depth => {
        const nodesAtDepth = nodesByDepth[depth];
        nodesAtDepth.forEach(node => {
            if (!node.children || node.children.length === 0) return;

            // Находим лучший ход
            const isMax = node.nodeId.includes('-max');
            let bestScore = isMax ? -Infinity : Infinity;
            let bestMove = null;

            node.children.forEach(child => {
                if (isMax && child.score > bestScore) {
                    bestScore = child.score;
                    bestMove = child.move;
                } else if (!isMax && child.score < bestScore) {
                    bestScore = child.score;
                    bestMove = child.move;
                }
            });

            if (bestMove) {
                bestMoves[node.nodeId] = bestMove;
            }
        });
    });

    // Определяем лучший путь из корня
    let bestPath = [];
    let currentNode = rootNode;
    while (currentNode && bestMoves[currentNode.nodeId]) {
        const bestMove = bestMoves[currentNode.nodeId];
        bestPath.push(bestMove);

        // Находим следующий узел в лучшем пути
        const nextDepth = currentNode.depth + 1;
        const moveIndex = currentNode.children.findIndex(c => c.move === bestMove);
        if (moveIndex === -1) break;

        const childNodeId = `${currentNode.nodeId}-${moveIndex}-${currentNode.nodeId.includes('-max') ? 'min' : 'max'}`;
        currentNode = debugLog[childNodeId];
    }

    console.log('%c🌟 Лучший путь: ' + bestPath.join(' → '),
        'font-size: 14px; font-weight: bold; color: green;');

    // Функция для отображения узла
    function printNode(node, indent = 0) {
        if (!node) return;
        if (node.depth > config.maxDepth) return;

        const isMax = node.nodeId.includes('-max');
        const indentStr = ' '.repeat(indent * config.indentSize);
        const movePathStr = node.movePath.join(' → ') || 'Начальная позиция';
        const playerType = isMax ? 'Макс (Белые)' : 'Мин (Черные)';
        const nodeTypeEmoji = isMax ? '⬆️' : '⬇️';

        // Проверяем, является ли узел частью лучшего пути
        const isPartOfBestPath = node.movePath.length > 0 &&
            node.movePath.every((move, idx) => idx >= bestPath.length || move === bestPath[idx]);

        // Если показываем только лучший путь, проверяем
        if (config.showOnlyBestPath && !isPartOfBestPath && node !== rootNode) {
            return;
        }

        // Определяем стиль для узла
        let style = '';
        if (config.colorize) {
            if (isPartOfBestPath) {
                style = 'color: green; font-weight: bold;';
            } else if (node.isLeaf) {
                style = 'color: gray;';
            } else {
                style = isMax ? 'color: blue;' : 'color: red;';
            }
        }

        // Заголовок узла
        console.log(
            `%c${indentStr}${nodeTypeEmoji} [${node.depth}] ${playerType}: ${movePathStr}` +
            (node.score !== undefined ? ` (Оценка: ${node.score})` : ''),
            style
        );

        // Альфа-бета параметры
        if (node.alpha !== null || node.beta !== null) {
            console.log(`${indentStr}  α: ${node.alpha !== null ? node.alpha : 'N/A'}, β: ${node.beta !== null ? node.beta : 'N/A'}`);
        }

        // Отображение компонентов оценки
        if (config.showComponents && node.components && Object.keys(node.components).length > 0) {
            console.log(`${indentStr}  🧩 Компоненты оценки:`);

            if (config.compactComponents) {
                // Компактное отображение
                const componentsStr = Object.entries(node.components)
                    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
                    .join(', ');
                console.log(`${indentStr}    ${componentsStr}`);
            } else {
                // Подробное отображение
                const processComponents = (components, subIndent = '') => {
                    Object.entries(components).forEach(([key, value]) => {
                        if (typeof value === 'object' && value !== null) {
                            console.log(`${indentStr}    ${subIndent}${key}:`);
                            processComponents(value, subIndent + '  ');
                        } else if (value !== 0 && value !== undefined) { // Пропускаем нулевые значения
                            console.log(`${indentStr}    ${subIndent}${key}: ${value}`);
                        }
                    });
                };
                processComponents(node.components);
            }
        }

        // Отображение дочерних узлов (доступных ходов)
        if (node.children && node.children.length > 0) {
            console.log(`${indentStr}  🔀 Доступные ходы (${node.children.length}):`);

            // Сортируем ходы по оценке
            const sortedChildren = [...node.children].sort((a, b) =>
                isMax ? b.score - a.score : a.score - b.score
            );

            sortedChildren.forEach((child, idx) => {
                const isBestMove = child.move === bestMoves[node.nodeId];
                const moveStyle = config.colorize && isBestMove ? 'color: green; font-weight: bold;' : '';
                const prunedText = child.pruned ? ' ✂️ обрезано' : '';
                const childText = `${indentStr}    ${isBestMove ? '★' : '•'} ${child.move}: ${child.score}${prunedText}`;

                console.log(`%c${childText}`, moveStyle);

                // Если это обрезанная ветвь и не нужно показывать такие ветви, пропускаем
                if (child.pruned && !config.showPrunedBranches) return;

                // Находим дочерний узел для дальнейшего отображения
                const childIdx = node.children.findIndex(c => c.move === child.move);
                if (childIdx !== -1) {
                    const childNodeId = `${node.nodeId}-${childIdx}-${isMax ? 'min' : 'max'}`;
                    const childNode = debugLog[childNodeId];

                    if (childNode) {
                        printNode(childNode, indent + 1);
                    }
                }
            });
        } else if (node.isLeaf) {
            console.log(`${indentStr}  🍃 Лист (терминальная позиция)`);
        }
    }

    // Запускаем отображение с корневого узла
    printNode(rootNode);

    // Общая статистика
    const totalNodes = Object.keys(debugLog).length;
    const maxDepthFound = Math.max(...Object.keys(nodesByDepth).map(Number));
    const leafNodes = Object.values(debugLog).filter(node => node.isLeaf).length;

    console.log('\n%c📊 Статистика анализа:', 'font-size: 14px; font-weight: bold;');
    console.log(`Всего узлов: ${totalNodes}`);
    console.log(`Максимальная глубина: ${maxDepthFound}`);
    console.log(`Терминальных позиций: ${leafNodes}`);
    console.log(`Лучший ход: ${bestMoves[rootNode.nodeId] || 'не определен'}`);
}


function evaluateBoard(game, aiDifficulty) {
    let score = 0;
    const board = game.board();
    const turn = game.turn(); // 'w' or 'b'
    const possibleMoves = getMoves();

    // If no moves are available, penalize it, unless its win
    if (possibleMoves.length === 0 && !isFinished()) {
        if (turn === 'b') {
            return -5000; // This is the ai. It will try to avoid this scenario
        } else {
            return 5000
        }
    }

    //Winning condition check
    const isFinishedResult = getIsFinishedWeight(isFinished())
    if (isFinishedResult != 0) {
        return isFinishedResult;
    }

    for (let col = 0; col < 8; col++) {
        for (let row = 0; row < 8; row++) {
            const piece = board[row][col];
            if (piece && piece.type === 'p') {
                // Goal: Maximize pawn promotion chances

                // Calculate distance to promotion
                let promotionDistance;
                if (piece.color === 'b') {
                    promotionDistance = 7 - row;
                } else {
                    promotionDistance = row;
                }

                // Center column bonus
                let centerColumnBonus = 0;
                if (col > 0 && col < 7) {
                    centerColumnBonus = 0.2
                }

                // Prioritize: Is the pawn on the next move free?
                let nextMoveFree = 0;
                if (piece.color === 'b') {
                    // Check if the pawn can move forward one square
                    if (row + 1 < 8 && !board[row + 1][col]) {
                        let willBeFreeScore = 0;
                        // Check if there are any white pawns that could capture after it moves
                        if (col > 0 && row + 2 < 8 && board[row + 2][col - 1] && board[row + 2][col - 1].color === 'w') {

                        } else if (col < 7 && row + 2 < 8 && board[row + 2][col + 1] && board[row + 2][col + 1].color === 'w') {

                        } else {
                            willBeFreeScore = 1
                        }

                        nextMoveFree += willBeFreeScore
                    }

                } else {
                    // Check if the pawn can move forward one square
                    if (row - 1 >= 0 && !board[row - 1][col]) {

                        let willBeFreeScore = 0
                        // Check if there are any black pawns that could capture after it moves
                        if (col > 0 && row - 2 >= 0 && board[row - 2][col - 1] && board[row - 2][col - 1].color === 'b') {

                        } else if (col < 7 && row - 2 >= 0 && board[row - 2][col + 1] && board[row - 2][col + 1].color === 'b') {


                        } else {
                            willBeFreeScore = 1
                        }
                        nextMoveFree += willBeFreeScore
                    }
                }

                // Free path bonus (no pieces in front)
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
                } else { // White
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

                // Adjacent columns blocked penalty (Discourage being captured)
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

                // Combine factors, weighting promotion distance higher
                let pieceScore =
                    (8 - promotionDistance) * 2 +   // Closer is better, weight heavily
                    freePathBonus +
                    adjacentThreatPenalty +
                    centerColumnBonus +
                    nextMoveFree * 2

                if (piece.color === 'b') {
                    score += pieceScore;
                } else {
                    score -= pieceScore;
                }
            }
        }
    }

    return score;
}

function evaluateBoard2(game, aiDifficulty) {
    let promotionDistanceWeight = 2;
    let freePathWeight = 0.7;
    let adjacentThreatWeight = -0.8;
    let centerColumnWeight = 0.2;
    let nextMoveFreeWeight = 2;
    let noMovesPenaltyWeight = 5000;


    let score = 0;
    const board = game.board();
    const turn = game.turn(); // 'w' or 'b'
    const possibleMoves = getMoves();

    // If no moves are available, penalize it, unless its win
    score += getNoMovesPenalty(possibleMoves, turn, noMovesPenaltyWeight, game)

    //Winning condition check
    const isFinishedResult = isFinished();
    score += getIsFinishedWeight(isFinishedResult)

    for (let col = 0; col < 8; col++) {
        for (let row = 0; row < 8; row++) {
            const piece = board[row][col];
            if (piece && piece.type === 'p') {
                piece.row = row;
                piece.col = col;

                // Goal: Maximize pawn promotion chances
                let pieceScore = getPieceFactors(piece, board, promotionDistanceWeight, freePathWeight, adjacentThreatWeight, centerColumnWeight, nextMoveFreeWeight);

                if (piece.color === 'b') {
                    score += pieceScore;
                } else {
                    score -= pieceScore;
                }
            }
        }
    }

    return score;
}


function getPieceFactors(piece, board, promotionDistanceWeight, freePathWeight, adjacentThreatWeight, centerColumnWeight, nextMoveFreeWeight) {
    // Calculate distance to promotion
    let promotionDistance = calculatePromotionDistance(piece);

    // Center column bonus
    let centerColumnBonus = getCenterColumnBonus(piece);

    // Prioritize: Is the pawn on the next move free?
    let nextMoveFree = getNextMoveFree(piece, board);

    // Free path bonus (no pieces in front)
    let freePathBonus = getFreePathBonus(piece, board)

    // Adjacent columns blocked penalty (Discourage being captured)
    let adjacentThreatPenalty = getAdjacentThreatPenalty(piece, board)

    // Combine factors, weighting promotion distance higher
    return (8 - promotionDistance) * promotionDistanceWeight +   // Closer is better, weight heavily
        freePathWeight * freePathBonus +
        adjacentThreatWeight * adjacentThreatPenalty +
        centerColumnWeight * centerColumnBonus +
        nextMoveFreeWeight * nextMoveFree
}

function calculatePromotionDistance(piece) {
    if (piece.color === 'b') {
        return 7 - piece.row;
    } else {
        return piece.row;
    }
}


function getCenterColumnBonus(piece) {
    if (piece.col > 0 && piece.col < 7) {
        return 0.2
    }

    return 0
}

function getNextMoveFree(piece, board) {
    let nextMoveFree = 0;
    if (piece.color === 'b') {
        // Check if the pawn can move forward one square
        if (piece.row + 1 < 8 && !board[piece.row + 1][piece.col]) {
            let willBeFreeScore = 0;
            // Check if there are any white pawns that could capture after it moves
            if (piece.col > 0 && piece.row + 2 < 8 && board[piece.row + 2][piece.col - 1] && board[piece.row + 2][piece.col - 1].color === 'w') {

            } else if (piece.col < 7 && piece.row + 2 < 8 && board[piece.row + 2][piece.col + 1] && board[piece.row + 2][piece.col + 1].color === 'w') {

            } else {
                willBeFreeScore = 1
            }

            nextMoveFree += willBeFreeScore
        }

    } else {
        // Check if the pawn can move forward one square
        if (piece.row - 1 >= 0 && !board[piece.row - 1][piece.col]) {

            let willBeFreeScore = 0
            // Check if there are any black pawns that could capture after it moves
            if (piece.col > 0 && piece.row - 2 >= 0 && board[piece.row - 2][piece.col - 1] && board[piece.row - 2][piece.col - 1].color === 'b') {

            } else if (piece.col < 7 && piece.row - 2 >= 0 && board[piece.row - 2][piece.col + 1] && board[piece.row - 2][piece.col + 1].color === 'b') {


            } else {
                willBeFreeScore = 1
            }
            nextMoveFree += willBeFreeScore
        }
    }

    return nextMoveFree
}

function getFreePathBonus(piece, board) {
    let freePathBonus = 0;
    if (piece.color === 'b') {
        let isPathBlocked = false;
        for (let r = piece.row + 1; r < 8; r++) {
            if (board[r][piece.col]) {
                isPathBlocked = true;
                break;
            }
        }
        if (!isPathBlocked) {
            freePathBonus += 0.7;
        }
    } else { // White
        let isPathBlocked = false;
        for (let r = piece.row - 1; r >= 0; r--) {
            if (board[r][piece.col]) {
                isPathBlocked = true;
                break;
            }
        }
        if (!isPathBlocked) {
            freePathBonus += 0.7;
        }
    }

    return freePathBonus;
}

function getAdjacentThreatPenalty(piece, board) {
    let adjacentThreatPenalty = 0;
    if (piece.color === 'b') {
        if (piece.col > 0 && board[piece.row][piece.col - 1] && board[piece.row][piece.col - 1].color === 'w') {
            adjacentThreatPenalty -= 0.8;
        }
        if (piece.col < 7 && board[piece.row][piece.col + 1] && board[piece.row][piece.col + 1].color === 'w') {
            adjacentThreatPenalty -= 0.8;
        }
    } else {
        if (piece.col > 0 && board[piece.row][piece.col - 1] && board[piece.row][piece.col - 1].color === 'b') {
            adjacentThreatPenalty -= 0.8;
        }
        if (piece.col < 7 && board[piece.row][piece.col + 1] && board[piece.row][piece.col + 1].color === 'b') {
            adjacentThreatPenalty -= 0.8;
        }
    }

    return adjacentThreatPenalty;
}

function getIsFinishedWeight(isFinishedResult, path) {
    if (!isFinishedResult) {
        return 0;
    }

    let score = 0;
    if (isFinishedResult.includes('w')) {
        score = +100000;
        score += 100 - path?.length;
    }
    if (isFinishedResult.includes('b')) {
        score = -100000;
        score -= 100 - path?.length;
    }

    return score;
}

function getNoMovesPenalty(possibleMoves, turn, noMovesPenaltyWeight, game) {
    if (possibleMoves.length === 0 && !isFinished()) {
        if (turn === 'b') {
            return -noMovesPenaltyWeight; // This is the ai. It will try to avoid this scenario
        } else {
            return noMovesPenaltyWeight
        }
    }

    return 0
}

function logGame(ai1, ai2, isFinished, game) {
    const fs = require('fs');

    const pgn = extractMovesFromPGN(game.pgn());

    fs.appendFileSync('games.log', `${ai1};${ai2};${isFinished};${pgn}\n`);
}

module.exports = {
    makeAiMove,
    run_game,
    findBestMove,
    evaluateBoard3,
    debug,
}