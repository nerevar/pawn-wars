// ai.js
function makeAiMove(aiDifficulty) {
    if (isFinished()) return;

    if (!aiDifficulty) aiDifficulty = 2;

    var possibleMoves = getMoves();
    if (possibleMoves.length === 0) return;

    const { move, score } = findBestMove(game, aiDifficulty)
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

function run_game(cnt, ai1, ai2, interactive) {
    let stats = []
    for (var i = 0; i < cnt; ++i) {
        initializeGame()
        while (!isFinished()) {
            if (getMoves().length === 0) break;
            const currentAiLevel = game.turn() == 'w' ? ai1 : ai2;
            const { move } = findBestMove(game, currentAiLevel);
            if (!move) break;
            game.move(move);

            if (interactive) {
                console.clear();
                console.log('game.turn()', game.turn(), 'makeAiMove', move, 'aiDifficulty', currentAiLevel, 'boardScore', evaluateBoard3(currentAiLevel));
                console.log(drawGame());
                sleep(500);
            }
        }
        // console.log('finished:', isFinished(), 'turn', game.turn())
        stats.push(isFinished())

        // Отображение прогресса каждые 10 игр
        if ((i + 1) % 10 === 0) {
            process.stdout.write('.'); // Выводим точку
            if ((i + 1) === cnt) {
                process.stdout.write('\n'); // Переходим на новую строку, если все игры завершены
            }
        }
    }
    return stats;
}

function getPathDepth(path) {
    return path.split(' ').length;
}

function getBestRandomMove(movesScores, mode = 'max') {
    if (movesScores.length === 0) return null;

    const epsilon = 0.001;
    let bestScore = movesScores[0].score;
    let minDepth = getPathDepth(movesScores[0].path);
    let bestCandidates = [movesScores[0]];

    for (let i = 1; i < movesScores.length; i++) {
        const current = movesScores[i];
        const currentDepth = getPathDepth(current.path);
        const scoreDiff = current.score - bestScore;

        // Определяем, является ли текущий score лучше
        const isBetterScore = mode === 'max'
            ? scoreDiff > epsilon
            : scoreDiff < -epsilon;

        // Если score значительно лучше - полный сброс кандидатов
        if (isBetterScore) {
            bestScore = current.score;
            minDepth = currentDepth;
            bestCandidates = [current];
            continue;
        }

        // Если score примерно равен - проверяем глубину
        if (Math.abs(scoreDiff) <= epsilon) {
            if (currentDepth < minDepth) {
                // Новая минимальная глубина - сброс кандидатов
                minDepth = currentDepth;
                bestCandidates = [current];
            } else if (currentDepth === minDepth) {
                // Такая же глубина - добавляем в кандидаты
                bestCandidates.push(current);
            }
        }
    }

    // Случайный выбор из финальных кандидатов
    const randomIndex = Math.floor(Math.random() * bestCandidates.length);
    const winner = bestCandidates[randomIndex];
    return {
        move: winner.move,
        score: winner.score,
        path: winner.path
    };
}

function findBestMove(game, aiDifficulty) {
    let depth = 3 + 1;
    // if (aiDifficulty >= 2 && aiDifficulty <= 6) {
    //     depth = aiDifficulty;
    // }
    const { move, score } = minimax(depth, game.turn() == 'w', aiDifficulty, -Infinity, Infinity, []);
    // console.log('findBestMove', move, score)
    return { move, score };
}


function evaluateMove(move, aiDifficulty, depth = 3) {
    depth = depth || 3;
    const moveStr = typeof move === 'string' ? move : move?.san;
    game.move(moveStr)
    const { score } = minimax((game.turn() === 'w'), aiDifficulty, -Infinity, Infinity, [moveStr]);
    game.undo();
    return { move, score }
}

function minimax(
    depth,
    isMaximizing,
    aiDifficulty,
    alpha,
    beta,
    path,
) {
    // console.error('arguments', [].slice.apply(arguments));
    if (depth === 0 || isFinished()) {
        const score = evaluateBoard3(aiDifficulty, path)
        globalMoves.push([path.slice(0).join(' '), score, isMaximizing]);
        return { move: null, score: score, path: path.slice(0) };
    }

    const possibleMoves = getMoves();
    IS_DEBUG && console.warn('START MINIMAX. moves: ', possibleMoves, `depth ${depth}, PATH: ${path.join(' ')} isMax: ${isMaximizing}`)
    let movesScores = [];

    let bestScore = isMaximizing ? -Infinity : Infinity;
    for (let i = 0; i < possibleMoves.length; i++) {
        const move = possibleMoves[i];

        path.push(move)
        game.move(move);
        const { score } = minimax(depth - 1, !isMaximizing, aiDifficulty, alpha, beta, path);
        game.undo();

        IS_DEBUG && console.warn(`    FOR MOVE ${move} GOT SCORE: ${score} (prev ${bestScore}${(isMaximizing ? score >= bestScore : score <= bestScore) ? '!!!' : ''}), depth ${depth}, PATH: [${path.join(' ')}], isMax: ${isMaximizing}`)

        if (isMaximizing ? score >= bestScore : score <= bestScore) {
            // IS_DEBUG && console.warn(`        FOR MOVE ${move} SAVE SCORE: ${score}, depth ${depth}, PATH: ${path.join(' ')}, BestScore: ${bestScore}, isMax: ${isMaximizing}`)
            // Обновление лучшего хода только если needMoveTracking = true, иначе только score
            movesScores.push({ move: move, score: score, path: path.join(' ') });

            bestScore = score;

            isMaximizing ? alpha = Math.max(alpha, score) : beta = Math.min(beta, score);
        }
        path.pop()

        // Альфа-бета отсечение
        if (beta <= alpha) break;
    }

    const val = getBestRandomMove(movesScores, mode = isMaximizing ? 'max' : 'min');
    IS_DEBUG && console.log('getBestRandomMove', mode = isMaximizing ? 'max' : 'min', structuredClone(val), 'depth', depth, structuredClone(movesScores))
    return val;
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

                IS_DEBUG && console.error(`ВЗЯТИЕ ${pawn.square} x ${target.square}. attackers: ${attackers}, defenders: ${defenders}, move_score: ${move_score}`)

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
        IS_DEBUG && console.error(pawn.square, 'isRowFree', isRowFree, 'isFullPathFree', isFullPathFree)
    });

    return score;
}


function evaluateBoard3(aiDifficulty, path) {
    if (aiDifficulty == 1) {
        return 0;
    }

    if (aiDifficulty >= 2) {
        // Winning condition check
        let finishedScore = getIsFinishedWeight(isFinished(), path)
        if (finishedScore != 0) {
            IS_DEBUG && console.log('evaluateBoard3', isFinished(), finishedScore);
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
            'totalScore': whiteScore - blackScore,
        }
    }, drawBoard())

    return whiteScore - blackScore;
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

module.exports = {
    'makeAiMove': makeAiMove,
    'run_game': run_game,
    'findBestMove': findBestMove,
    'evaluateBoard3': evaluateBoard3,
}