// ai.js
var debug = {
    log: {},
    currentBranch: [],
    config: { enabled: true, depth: 0 }
};

function findBestMove(aiDifficulty, getAllMoves=false) {
    debug.log = {}; // Сброс лога
    debug.tree = {};

    if (aiDifficulty == 1) {
        debug.config.depth = 3
    } else if (aiDifficulty == 2) {
        debug.config.depth = 4
    } else if (aiDifficulty == 3) {
        debug.config.depth = 5
    } else {
        debug.config.depth = 4;
    }

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
        if (data === null) {
            minimax(depth - 1, !isMaximizing, aiDifficulty, alpha, beta, childCtx);
        }
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
    if (aiDifficulty == 0) {
        // Запись компонентов в лог
        ENABLE_LOGGING && (debug.log[nodeId].components = {
            white: {},
            black: {},
            finishedScore: 0,
            total: 0,
        });

        return 0;
    }

    if (aiDifficulty >= 1 && aiDifficulty <= 3) {
        const score = evaluateBoardMedium();
        ENABLE_LOGGING && (debug.log[nodeId].components = {
            total: score,
        });
        return score
    }

    let finishedScore = 0;
    if (aiDifficulty >= 4) {
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
    if (aiDifficulty >= 5) {
        whitePawnAdvancement = evaluatePawnAdvancement('w')
        blackPawnAdvancement = evaluatePawnAdvancement('b')
    }

    let whitePawnCount = 0;
    let blackPawnCount = 0;
    if (aiDifficulty >= 6) {
        whitePawnCount = evaluatePawnCount('w')
        blackPawnCount = evaluatePawnCount('b')
    }

    let whiteCaptureOpportunities = 0;
    let blackCaptureOpportunities = 0;
    if (aiDifficulty >= 7) {
        whiteCaptureOpportunities += evaluateCaptureOpportunities('w')
        blackCaptureOpportunities += evaluateCaptureOpportunities('b')
    }

    let whiteFreePath = 0;
    let blackFreePath = 0;
    if (aiDifficulty >= 8) {
        whiteFreePath += evaluateFreePath('w')
        blackFreePath += evaluateFreePath('b')
    }

    let whiteMajority = 0;
    let blackMajority = 0;
    if (aiDifficulty >= 9) {
        whiteMajority += evaluateMajority('w')
        blackMajority += evaluateMajority('b')
    }

    const whiteScore = whitePawnAdvancement + whitePawnCount + whiteCaptureOpportunities + whiteFreePath + whiteMajority;
    const blackScore = blackPawnAdvancement + blackPawnCount + blackCaptureOpportunities + blackFreePath + blackMajority;

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
            'whiteMajority': whiteMajority,
            'blackMajority': blackMajority,

            'whiteScore': whiteScore,
            'blackScore': blackScore,
            'finishedScore': finishedScore,
            'totalScore': finishedScore + whiteScore - blackScore,
        }
    }, drawBoard())

    // Запись компонентов в лог
    ENABLE_LOGGING && (debug.log[nodeId].components = {
        white: { whitePawnAdvancement, whitePawnCount, whiteCaptureOpportunities, whiteFreePath, whiteMajority },
        black: { blackPawnAdvancement, blackPawnCount, blackCaptureOpportunities, blackFreePath, blackMajority },
        finishedScore: finishedScore,
        total: whiteScore - blackScore,
    });

    // return debug.log[nodeId].components.total;

    return whiteScore - blackScore;
}

function makeAiMove(aiDifficulty) {
    if (isFinished()) return;

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



function getMajorityRowsScore(firstPawn, secondPawn, opponentPawn) {
    const myColor = firstPawn.color;
    const targetRow = { 'w': 7, 'b': 0 };

    // Расстояние до превращения для каждой пешки
    const firstDistance = Math.abs(targetRow[myColor] - firstPawn.row);
    const secondDistance = Math.abs(targetRow[myColor] - secondPawn.row);

    // Среднее арифметическое количества шагов
    const distance = Math.ceil((firstDistance + secondDistance) / 2);

    switch (distance) {
        case 0: return Infinity;  // победа
        case 1: return 1000;  // предпоследний ряд - почти победа
        case 2: return 500;  // бонус за 6ю для белых и 3ю для черных горизонталь
        case 3: return 200;  // бонус за 6ю для белых и 3ю для черных горизонталь
        case 4: return 100;  // бонус за 6ю для белых и 3ю для черных горизонталь
        case 5: return 50;  // бонус за 6ю для белых и 3ю для черных горизонталь
        // default: ; // бонус за расстояние для остальных клеток
    }

    return 0
}




function evaluateMajority(color) {
    // Получаем пешки обоих цветов
    const myPawns = getPawns(color);
    const opponentColor = color === 'w' ? 'b' : 'w';
    const opponentPawns = getPawns(opponentColor);

    let totalScore = 0;

    // Определяем функцию для проверки, находится ли пешка противника "впереди"
    const isOpponentAhead = (myPawn, oppPawn) => {
        if (color === 'w') {
            // Для белых "впереди" означает большее значение row
            return oppPawn.row > myPawn.row;
        } else {
            // Для черных "впереди" означает меньшее значение row
            return oppPawn.row < myPawn.row;
        }
    };

    // Группируем наши пешки по столбцам
    const myPawnsByCol = {};
    myPawns.forEach(pawn => {
        if (!myPawnsByCol[pawn.col]) {
            myPawnsByCol[pawn.col] = [];
        }
        myPawnsByCol[pawn.col].push(pawn);
    });

    // Проверяем каждую пару соседних столбцов с нашими пешками
    const columnsWithMyPawns = Object.keys(myPawnsByCol).map(Number).sort((a, b) => a - b);

    for (let i = 0; i < columnsWithMyPawns.length - 1; i++) {
        const col1 = columnsWithMyPawns[i];
        const col2 = columnsWithMyPawns[i + 1];

        // Проверяем, что столбцы соседние
        if (col2 - col1 !== 1) continue;

        // Нашли пару соседних столбцов с нашими пешками
        const myPawnsInCol1 = myPawnsByCol[col1];
        const myPawnsInCol2 = myPawnsByCol[col2];
        const myPawnsInArea = [...myPawnsInCol1, ...myPawnsInCol2];

        // У нас должно быть не менее двух пешек в этих столбцах
        if (myPawnsInArea.length < 2) continue;

        // Берем две самые продвинутые наши пешки
        const sortedMyPawns = [...myPawnsInArea].sort((a, b) => {
            // Для белых более продвинутые - с большей row, для черных - с меньшей
            return color === 'w' ? b.row - a.row : a.row - b.row;
        });

        const firstPawn = sortedMyPawns[0];
        const secondPawn = sortedMyPawns[1];

        // Найдем самую выдвинутую нашу пешку для определения "впереди"
        const mostAdvancedRow = color === 'w' ? Math.max(firstPawn.row, secondPawn.row) : Math.min(firstPawn.row, secondPawn.row);

        // Проверяем пешки противника в области (в тех же и соседних столбцах)
        const relevantOpponentCols = [col1 - 1, col1, col2, col2 + 1].filter(col => col >= 0);

        // Фильтруем только пешки противника, которые находятся впереди наших пешек
        const opponentPawnsAhead = opponentPawns.filter(pawn => {
            // Проверяем, что пешка находится в рассматриваемых столбцах
            if (!relevantOpponentCols.includes(pawn.col)) return false;

            // Проверяем, что пешка находится впереди самой продвинутой нашей пешки
            if (color === 'w') {
                return pawn.row > mostAdvancedRow;
            } else {
                return pawn.row < mostAdvancedRow;
            }
        });

        // Если у противника ровно одна пешка впереди наших в этой области
        if (opponentPawnsAhead.length === 1) {
            const opponentPawn = opponentPawnsAhead[0];

            // Вычисляем score в зависимости от близости к финишу
            const score = getMajorityRowsScore(firstPawn, secondPawn, opponentPawn);
            // console.log(color, score, firstPawn, secondPawn, opponentPawn)
            totalScore += score;
        }
    }

    return totalScore;
}


function evaluatePawnAdvancement(color) {
    // бонус за расстояние до финиша
    let score = 0;
    const promotionRow = color === 'w' ? 7 : 0;
    getPawns(color).forEach(pawn => {
        const distance = Math.abs(pawn.row - promotionRow);
        switch (distance) {
            case 0: score += 10000;  // победа
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


function evaluateBoardMedium() {
    let score = 0;
    const board = game.board();

    // // If no moves are available, penalize it, unless its win
    // if (possibleMoves.length === 0 && !isFinished()) {
    //     if (turn === 'b') {
    //         return -5000; // This is the ai. It will try to avoid this scenario
    //     } else {
    //         return 5000
    //     }
    // }

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
                    score -= pieceScore;
                } else {
                    score += pieceScore;
                }
            }
        }
    }

    // console.log(`evaluate MEDIUM score: ${score}`)

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
        if (path) {
            score += 100 - path.length;
        }
    }
    if (isFinishedResult.includes('b')) {
        score = -100000;
        if (path) {
            score -= 100 - path.length;
        }
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