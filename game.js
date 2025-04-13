function sleep(ms) {
    var waitTill = new Date(new Date().getTime() + ms);
    while (waitTill > new Date()) { }
}

function drawGame() {
    return game.ascii().replaceAll('p', '♟').replaceAll('P', '♗').replaceAll('q', '♛').replaceAll('Q', '♕')
    // return game.ascii().replaceAll('p', 'B').replaceAll('P', 'W')
}

function drawBoard(moveFrom) {
    let i = 0;
    return game.board().map(row => {
        let j = -1;
        return '' + (8 - i++) + ' ' + row.map(piece => {
            j++;
            if (moveFrom && (squareToCoords(moveFrom).row == (8 - i)) && squareToCoords(moveFrom).col == j) return '·';
            if (piece === null) return ' ';
            if (piece.color === 'b') return piece.type === 'q' ? '♛' : '♟';
            if (piece.color === 'w') return piece.type === 'q' ? '♕' : '♗';
        }).join('  ')
    }).concat(['  ' + ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].join('  ')])
}

function squareToCoords(square) {
    const col = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = parseInt(square.substring(1)) - 1;
    return { row, col };
}

function getMoves(options) {
    options = options || {};
    const turn = game.turn();

    return game.moves(options)
        // Фильтр превращений - оставляем только превращение в Ферзя
        .filter(move => {
            const moveStr = typeof move === 'string' ? move : move?.san;
            return !moveStr.includes('=') || moveStr.endsWith('=Q')
        })
        .sort((a, b) => {
            const aStr = typeof a === 'string' ? a : a?.san;
            const bStr = typeof b === 'string' ? b : b?.san;
            // Приоритеты: 0=превращение, 1=взятие, 2=обычный ход
            const aType = aStr.endsWith('=Q') ? 0 : aStr.includes('x') ? 1 : 2;
            const bType = bStr.endsWith('=Q') ? 0 : bStr.includes('x') ? 1 : 2;

            if (aType !== bType) return aType - bType;

            // Для обычных ходов считаем расстояние до финиша
            if (aType === 2) {
                const aRow = parseInt(aStr.slice(-1));
                const bRow = parseInt(bStr.slice(-1));
                return turn === 'w' ? bRow - aRow : aRow - bRow
            }

            return 0;
        });
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

// Function to extract PGN moves
function extractMovesFromPGN(pgn) {
    return pgn.split('\n').pop()
}

function rank(square) {
    // Extracts the zero-based rank of an 0x88 square.
    return square >> 4;
}
function file(square) {
    // Extracts the zero-based file of an 0x88 square.
    return square & 0xf;
}

function getPawns(color = null) {
    const pawns = [];
    for (let i = 0; i < 120; i++) {
        if (game._board[i]) {
            const piece = game._board[i];
            if (piece.type === 'p' && (!color || piece.color === color)) {
                pawns.push({
                    color: piece.color,
                    row: 8 - rank(i) - 1,
                    col: file(i),
                    // algebraic: algebraic(i),
                })
            }
        }
        if ((i + 1) & 0x88) {
            i += 8;
        }
    }
    return pawns;
}

function getPawnsSlow(color = null) {
    const board = game.board();
    const pawns = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.type === 'p' && (!color || piece.color === color)) {
                piece.row = 7 - row;
                piece.col = col;
                pawns.push(piece);
            }
        }
    }
    return pawns;
}

module.exports = {
    isFinished,
    getMoves,
    initializeGame,
    drawGame,
    sleep,
    extractMovesFromPGN,
    getPawns,
    drawBoard,
}