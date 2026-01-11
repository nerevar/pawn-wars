/**
 * Парсеры для разных форматов входных данных для задания состояния доски
 */

const { Chess } = require('../chess.js');

/**
 * Парсит визуальное представление доски (результат drawGame() или drawBoard())
 * Формат:
 * ```
 *    +------------------------+
 *  8 | .  .  .  .  .  .  .  . |
 *  7 | ♟  ♟  .  .  .  .  .  . |
 *  ...
 *     a  b  c  d  e  f  g  h
 * ```
 */
function parseVisualBoard(visualBoard) {
    const lines = visualBoard.split('\n').map(l => l.trim()).filter(l => l);
    
    // Убираем границы и заголовки
    const boardLines = lines.filter(line => {
        return line.startsWith('|') && line.endsWith('|');
    });
    
    if (boardLines.length !== 8) {
        throw new Error(`Expected 8 board lines, got ${boardLines.length}`);
    }
    
    const game = new Chess();
    game.clear();
    
    // Маппинг символов на фигуры
    const pieceMap = {
        '♟': { type: 'p', color: 'b' },
        '♗': { type: 'p', color: 'w' },
        '♛': { type: 'q', color: 'b' },
        '♕': { type: 'q', color: 'w' },
        '.': null,
        ' ': null
    };
    
    // Парсим каждую строку (от 8 до 1)
    for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
        const line = boardLines[rankIdx];
        // Убираем номер ранга и | в начале и конце
        // Формат: "8 | .  .  .  .  .  .  .  . |"
        // Или может быть без пробела после номера: "8| .  .  .  .  .  .  .  . |"
        const match = line.match(/^\d+\s*\|\s+(.+)\s+\|$/);
        let content;
        if (!match) {
            // Попробуем альтернативный формат без пробела после |
            const altMatch = line.match(/^\d+\s*\|\s*(.+)\s*\|$/);
            if (!altMatch) {
                throw new Error(`Invalid board line format: ${line}`);
            }
            content = altMatch[1];
        } else {
            content = match[1];
        }
        
        const squares = content.split(/\s+/).filter(s => s !== '');
        
        const rank = 8 - rankIdx; // 8, 7, 6, ..., 1
        
        for (let fileIdx = 0; fileIdx < 8 && fileIdx < squares.length; fileIdx++) {
            const symbol = squares[fileIdx];
            const piece = pieceMap[symbol];
            
            if (piece) {
                const file = String.fromCharCode(97 + fileIdx); // a, b, c, ..., h
                const square = file + rank;
                game.put(piece, square);
            }
        }
    }
    
    // Определяем чей ход (по умолчанию белые)
    // Создаем FEN из текущей позиции
    const positionFen = game.fen().split(' ')[0];
    let newFen = positionFen + ' w - - 0 1';
    
    game.load(newFen);
    
    return game;
}

/**
 * Парсит строку с ходами из URL (формат &moves=)
 * Пример: "1.+e3+g6+2.+d4+e6+3.+f4+d6+4.+e4+c6+5.+c4+f6+6.+g4+h6+7.+f5"
 * Формат: номер_хода.+белый_ход+черный_ход+номер_хода.+белый_ход+черный_ход...
 */
function parseUrlMoves(movesString) {
    if (!movesString || movesString.trim() === '') {
        const game = new Chess();
        game.clear();
        // Инициализируем начальную позицию
        const initialFen = '8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1';
        game.load(initialFen);
        return game;
    }
    
    // Разбиваем по паттерну "номер.+ход+ход"
    // Регулярное выражение для поиска пар ходов: "1.+e3+g6"
    const movePattern = /(\d+)\.\+([^+]+)\+([^+]+)/g;
    const moves = [];
    let match;
    
    while ((match = movePattern.exec(movesString)) !== null) {
        const whiteMove = match[2].trim();
        const blackMove = match[3].trim();
        if (whiteMove) moves.push(whiteMove);
        if (blackMove) moves.push(blackMove);
    }
    
    // Обрабатываем случай, когда последний ход не имеет пары (например, "7.+f5")
    const lastMoveMatch = movesString.match(/(\d+)\.\+([^+]+)$/);
    if (lastMoveMatch) {
        const lastMove = lastMoveMatch[2].trim();
        if (lastMove) moves.push(lastMove);
    }
    
    const game = new Chess();
    game.clear();
    
    // Инициализируем начальную позицию
    const initialFen = '8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1';
    game.load(initialFen);
    
    // Применяем ходы
    for (const move of moves) {
        try {
            game.move(move);
        } catch (e) {
            throw new Error(`Invalid move "${move}" in URL moves string: ${e.message}`);
        }
    }
    
    return game;
}

/**
 * Парсит строку с ходами в формате PGN (под доской)
 * Пример: "1. e3 g6 2. d4 e6 3. f4 d6 4. e4 c6 5. c4 f6 6. g4 h6 7. f5 "
 */
function parsePgnMoves(pgnString) {
    if (!pgnString || pgnString.trim() === '') {
        const game = new Chess();
        game.clear();
        // Инициализируем начальную позицию
        const initialFen = '8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1';
        game.load(initialFen);
        return game;
    }
    
    // Убираем лишние пробелы и разбиваем
    const cleaned = pgnString.trim().replace(/\s+/g, ' ');
    
    // Разбиваем по номерам ходов (например, "1. ", "2. ")
    const moveParts = cleaned.split(/\d+\.\s*/).filter(p => p.trim() !== '');
    
    const moves = [];
    
    for (const part of moveParts) {
        // Разбиваем на отдельные ходы (белые и черные)
        const movePair = part.trim().split(/\s+/);
        for (const move of movePair) {
            if (move) {
                moves.push(move);
            }
        }
    }
    
    const game = new Chess();
    game.clear();
    
    // Инициализируем начальную позицию
    const initialFen = '8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1';
    game.load(initialFen);
    
    // Применяем ходы
    for (const move of moves) {
        try {
            game.move(move);
        } catch (e) {
            throw new Error(`Invalid move "${move}" in PGN string: ${e.message}`);
        }
    }
    
    return game;
}

/**
 * Универсальный парсер, который определяет формат автоматически
 */
function parseBoard(input) {
    if (!input || input.trim() === '') {
        const game = new Chess();
        game.clear();
        const initialFen = '8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1';
        game.load(initialFen);
        return game;
    }
    
    // Определяем формат по содержимому
    if (input.includes('+------------------------+') || (input.includes('|') && input.includes('8 |'))) {
        // Визуальное представление
        return parseVisualBoard(input);
    } else if (input.includes('+') && /^\d+\./.test(input.split('+')[0])) {
        // URL формат (содержит + и начинается с номера хода)
        return parseUrlMoves(input);
    } else {
        // PGN формат (по умолчанию)
        return parsePgnMoves(input);
    }
}

module.exports = {
    parseVisualBoard,
    parseUrlMoves,
    parsePgnMoves,
    parseBoard
};

