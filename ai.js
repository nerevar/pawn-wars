// ai.js
function makeAiMove(aiDifficulty) {
    if (isFinished()) return;

    if (!aiDifficulty) aiDifficulty = 2;

    var possibleMoves = getMoves();
    if (possibleMoves.length === 0) return;

    const bestMove = findBestMove(game, aiDifficulty)
    console.log('makeAiMove', bestMove, 'aiDifficulty', aiDifficulty)
    if (!bestMove) {
        // No moves available, return null. evaluateBoard will handle the consequences
    }

    game.move(bestMove);
    if (typeof window !== 'undefined') {
        board.position(game.fen());
        updateStatus();
        updateURL();
    }
}

function run_game(cnt, ai1, ai2, interactive) {
    let stats = []
    for (var i = 0; i < cnt; ++i) {
        initializeGame()
        while (!isFinished()) {
            if (getMoves().length === 0) break;
            const currentAiLevel = game.turn() == 'w' ? ai1 : ai2;
            const bestMove = findBestMove(game, currentAiLevel);
            if (!bestMove) break;
            game.move(bestMove);

            if (interactive) {
                console.clear();
                console.log('game.turn()', game.turn(), 'makeAiMove', bestMove, 'aiDifficulty', currentAiLevel, 'boardScore', evaluateBoard3(game, currentAiLevel));
                console.log(drawGame());
                sleep(500);
            }
        }
        // console.log('finished:', isFinished(), 'turn', game.turn())
        stats.push(isFinished())
    }
    return stats;
}

function getBestRandomMove(movesScores, mode = 'max') {
    if (movesScores.length === 0) {
        return null; // Если массив пуст, возвращаем null
    }

    const epsilon = 0.001;
    let bestScore = movesScores[0].score;
    let bestMoves = [movesScores[0].move];
    let bestPath = [movesScores[0].path];

    for (let i = 1; i < movesScores.length; i++) {
        const currentScore = movesScores[i].score;
        const diff = Math.abs(currentScore - bestScore);

        if (diff < epsilon) {
            // Если score примерно равен текущему лучшему, добавляем в список
            bestMoves.push(movesScores[i].move);
            bestPath.push(movesScores[i].path);
        } else if (
            (mode === 'max' && currentScore > bestScore) ||
            (mode === 'min' && currentScore < bestScore)
        ) {
            // Если нашли новый лучший score (max/min), обновляем список
            bestScore = currentScore;
            bestMoves = [movesScores[i].move];
            bestPath = [movesScores[i].path];
        }
    }

    // Возвращаем случайный ход из отфильтрованных
    const randomIndex = Math.floor(Math.random() * bestMoves.length);
    return { move: bestMoves[randomIndex], score: bestScore, path: bestPath[randomIndex] };
}


function findBestMove(game, aiDifficulty) {
    let depth = 3;
    // if (aiDifficulty >= 2 && aiDifficulty <= 6) {
    //     depth = aiDifficulty;
    // }
    const { move } = minimax(game, depth, game.turn() == 'w', aiDifficulty, -Infinity, +Infinity, []);
    // console.log('findBestMove', move, score, path)
    return move;
}

function minimax(
    game,
    depth,
    isMaximizing,
    aiDifficulty,
    alpha,
    beta,
    path,
) {
    if (depth === 0 || isFinished()) {
        // if (aiDifficulty == 3) {
        //     return evaluateBoard2(game, aiDifficulty);
        // }
        // return evaluateBoard(game, aiDifficulty);
        // console.log('minimax, evaluateBoard3:', evaluateBoard3(game, aiDifficulty))
        const score = evaluateBoard3(game, aiDifficulty) * (isMaximizing ? 1 : -1)
        globalMoves.push([path.slice(0).join(' '), score]);
        return { move: null, score: score, path: path.slice(0) };
    }

    const possibleMoves = getMoves();
    let movesScores = [];

    let bestScore = isMaximizing ? -Infinity : +Infinity;
    for (let i = 0; i < possibleMoves.length; i++) {
        const move = possibleMoves[i];

        game.move(move);
        path.push(move)

        const { score } = minimax(game, depth - 1, !isMaximizing, aiDifficulty, alpha, beta, path);

        path.pop()
        game.undo();

        if ((isMaximizing && score >= bestScore) || (!isMaximizing && score <= bestScore)) {
            // Обновление лучшего хода только если needMoveTracking = true, иначе только score
            movesScores.push({ move: move, score: score, path: path });

            bestScore = score;

            isMaximizing ? alpha = Math.max(alpha, score) : beta = Math.min(beta, score);
        }

        // Альфа-бета отсечение
        if (beta <= alpha) {
            // path.pop()
            break;
        }
    }
    // console.log('getBestRandomMove', movesScores)
    return getBestRandomMove(movesScores, mode = isMaximizing ? 'max' : 'min');
}

function getPawns(color = null) {
    const board = game.board();
    const pawns = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.type === 'p' && (!color || piece.color === color)) {
                piece.row = row;
                piece.col = col;
                pawns.push(piece);
            }
        }
    }
    return pawns;
}

function evaluatePawnAdvancement(color) {
    // бонус за расстояние до финиша
    let score = 0;
    const promotionRow = color === 'w' ? 7 : 0;
    getPawns(color).forEach(pawn => {
        const distance = Math.abs(pawn.row - promotionRow);
        switch (distance) {
            case 0: score += +Infinity;  // победа
            case 1: score += 10000;  // предпоследний ряд - почти победа
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


function evaluateBoard3(game, aiDifficulty) {
    if (aiDifficulty == 1) {
        return 0;
    }

    let whiteScore = 0;
    let blackScore = 0;

    if (aiDifficulty >= 2) {
        // Winning condition check
        const isFinishedResult = getIsFinishedWeight(isFinished())
        if (isFinishedResult != 0) {
            return isFinishedResult;
        }
    }

    if (aiDifficulty >= 3) {
        whiteScore += evaluatePawnAdvancement('w')
        blackScore += evaluatePawnAdvancement('b')
    }

    if (aiDifficulty == 4) {
        whiteScore += evaluatePawnCount('w')
        blackScore += evaluatePawnCount('b')
    }

    // if (aiDifficulty == 5) {
    //     whiteScore += evaluatePassedPawns2('w')
    //     blackScore += evaluatePassedPawns2('b')
    // }

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

function getIsFinishedWeight(isFinishedResult) {
    if (!isFinishedResult) {
        return 0;
    }

    if (isFinishedResult.includes('w')) {
        return +Infinity;
    }
    if (isFinishedResult.includes('b')) {
        return -Infinity;
    }

    return 0;
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