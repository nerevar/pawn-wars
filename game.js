function sleep(ms) {
    var waitTill = new Date(new Date().getTime() + ms);
    while (waitTill > new Date()) { }
}

function drawGame() {
    return game.ascii().replaceAll('p', 'B').replaceAll('P', 'W')
}

function getMoves() {
    const turn = game.turn();

    return game.moves()
        // Фильтр превращений - оставляем только превращение в Ферзя
        .filter(move => !move.includes('=') || move.endsWith('=Q'))
        .sort((a, b) => {
            // Приоритеты: 0=превращение, 1=взятие, 2=обычный ход
            const aType = a.endsWith('=Q') ? 0 : a.includes('x') ? 1 : 2;
            const bType = b.endsWith('=Q') ? 0 : b.includes('x') ? 1 : 2;

            if (aType !== bType) return aType - bType;

            // Для обычных ходов считаем расстояние до финиша
            if (aType === 2) {
                const aRow = parseInt(a.slice(-1));
                const bRow = parseInt(b.slice(-1));
                return turn === 'w' ? bRow - aRow : aRow - bRow
            }

            return 0;
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

module.exports = {
    'isFinished': isFinished,
    'getResultLabel': getResultLabel,
    'getMoves': getMoves,
    'initializeGame': initializeGame,
    'drawGame': drawGame,
    'sleep': sleep,
}