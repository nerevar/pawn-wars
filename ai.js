// ai.js
function makeAiMove() {
    if (is_finish() || game.isStalemate()) return;

    var possibleMoves = game.moves();

    if (possibleMoves.length === 0) return;

    let bestMove = null;

    if (aiDifficulty === 0) { // Random
        var randomIndex = Math.floor(Math.random() * possibleMoves.length);
        bestMove = possibleMoves[randomIndex];
    } else if (aiDifficulty === 1) { // Easy
        bestMove = findBestMove(game, 3, true);
    } else if (aiDifficulty === 2) { // Medium
        bestMove = findBestMove(game, 4, true);
    }

    console.log('makeAiMove', bestMove)
    game.move(bestMove);
    board.position(game.fen());
    updateStatus();
    updateURL();
}


function findBestMove(game, depth, maximizingPlayer) {
    let bestMove = null;
    let bestScore = maximizingPlayer ? -Infinity : Infinity;
    const possibleMoves = game.moves();

    if (possibleMoves.length === 0) {
        // No moves available, return null. evaluateBoard will handle the consequences
        return null;
    }

    for (let i = 0; i < possibleMoves.length; i++) {
        const move = possibleMoves[i];
        let result = game.move(move);
        if (!result) {
            console.error('cannot make move:', move);
            continue
        }
        let score = minimax(game, depth - 1, !maximizingPlayer);
        game.undo();

        if ((maximizingPlayer && score > bestScore) || (!maximizingPlayer && score < bestScore)) {
            bestScore = score;
            bestMove = move;
        }
    }

    //If there's no legal board, then return a first item on available move
    if (!bestMove) {
        bestMove = possibleMoves[0]
    }

    return bestMove;
}

function minimax(game, depth, maximizingPlayer) {
    if (depth === 0 || is_finish() || game.isStalemate()) {
        return evaluateBoard(game);
    }

    const possibleMoves = game.moves();

    if (maximizingPlayer) {
        let bestScore = -Infinity;
        for (let i = 0; i < possibleMoves.length; i++) {
            const move = possibleMoves[i];
            let result = game.move(move);
            if (!result) {
                console.error('cannot make move:', move);
                continue
            }
            let score = minimax(game, depth - 1, false);
            game.undo();
            bestScore = Math.max(score, bestScore);
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < possibleMoves.length; i++) {
            const move = possibleMoves[i];
            let result = game.move(move);
            if (!result) {
                console.error('cannot make move:', move);
                continue
            }
            let score = minimax(game, depth - 1, true);
            game.undo();
            bestScore = Math.min(score, bestScore);
        }
        return bestScore;
    }
}

function evaluateBoard_old(game) {
    let score = 0;
    const board = game.board();
    const turn = game.turn(); // 'w' or 'b'
    const possibleMoves = game.moves();

    // If no moves are available, penalize it, unless its win
    if (possibleMoves.length === 0 && !is_finish()) {
        if (turn === 'b') {
            return -5000; // This is the ai. It will try to avoid this scenario
        } else {
            return 5000
        }
    }

    //Winning condition check
    const isFinishedResult = is_finish();
    if (isFinishedResult === 'White') {
        return -10000; // Very bad for maximizing player (AI)
    }
    if (isFinishedResult === 'Black') {
        return 10000; // Very good for maximizing player (AI)
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

function evaluateBoard(game) {
    let promotionDistanceWeight = 2;
    let freePathWeight = 0.7;
    let adjacentThreatWeight = -0.8;
    let centerColumnWeight = 0.2;
    let nextMoveFreeWeight = 2;
    let noMovesPenaltyWeight = 5000;


    let score = 0;
    const board = game.board();
    const turn = game.turn(); // 'w' or 'b'
    const possibleMoves = game.moves();

    // If no moves are available, penalize it, unless its win
    score += getNoMovesPenalty(possibleMoves, turn, noMovesPenaltyWeight, game)

    //Winning condition check
    const isFinishedResult = is_finish();
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
    if (isFinishedResult === 'White') {
        return -10000; // Very bad for maximizing player (AI)
    }
    if (isFinishedResult === 'Black') {
        return 10000; // Very good for maximizing player (AI)
    }

    return 0;
}

function getNoMovesPenalty(possibleMoves, turn, noMovesPenaltyWeight, game) {
    if (possibleMoves.length === 0 && !is_finish()) {
        if (turn === 'b') {
            return -noMovesPenaltyWeight; // This is the ai. It will try to avoid this scenario
        } else {
            return noMovesPenaltyWeight
        }
    }

    return 0
}