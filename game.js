function getMoves(options) {
    const moveOptions = options || {};
    return game.moves(moveOptions).filter(move => {
        // Если есть '=', то проверяем, что заканчивается на '=Q'
        if (move.includes('=')) {
            return move.endsWith('=Q');
        }
        // Если нет '=', то оставляем ход
        return true;
    });
}

function getResultLabel() {
    return isFinished() === "White"
        ? "wQ"
        : isFinished() === "Black"
            ? "bQ"
            : game.turn() == 'w'
                ? 'b'
                : 'w';
}

function isFinished() {
    // custom end game: wQ, bQ, w, b
    const board = game.board();
    if (!board) {
        return null
    }
    if (game.isStalemate()) {
        return game.turn() === 'w' ? 'b' : 'w';
    }
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.type === 'q') {
                return piece.color + 'Q';
            }
        }
    }
    return null;
}

function initializeGame(moves) {
    game = new Chess();

    game.clear(); // Start with an empty board

    // Set up the pawn positions
    for (let i = 0; i < 8; i++) {
        game.put({
            type: 'p',
            color: 'w'
        }, String.fromCharCode(97 + i) + '2'); // White pawns on rank 2
        game.put({
            type: 'p',
            color: 'b'
        }, String.fromCharCode(97 + i) + '7'); // Black pawns on rank 7
    }

    let initialFen = '8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1';
    if (gameMode !== "2player") {
        if (aiColor === 'w') {
            initialFen = '8/PPPPPPPP/8/8/8/8/pppppppp/8 b - - 0 1'
        }
    }

    if (moves) {
        moves.split(' ').forEach(function (item, index) {
            if (item.includes('.')) return;
            game.move(item);
        });
        // game.load_pgn(moves);
        initialFen = game.fen();
    }

    return initialFen;
}

module.exports = function () {
    this.isFinished = isFinished
    this.getResultLabel = getResultLabel
    this.getMoves = getMoves
    this.initializeGame = initializeGame
}