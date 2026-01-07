/**
 * Утилиты для работы с факторами оценки
 */

/**
 * Проверяет, находится ли клетка в пределах доски
 * @param {number} r - Индекс ряда (0-7)
 * @param {number} c - Индекс колонки (0-7)
 * @returns {boolean}
 */
function isSafe(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
}

/**
 * Получает фигуру на клетке или null
 * @param {number} r - Индекс ряда
 * @param {number} c - Индекс колонки
 * @param {Array<Array<object|null>>} board - Доска (результат game.board())
 * @returns {object|null} Фигура или null
 */
function getPiece(r, c, board) {
    if (!isSafe(r, c)) return null;
    return board[r] && board[r][c] ? board[r][c] : null;
}

// Экспорт для Node.js
if (typeof window === 'undefined') {
    module.exports = { isSafe, getPiece };
}

// Экспорт для браузера
if (typeof window !== 'undefined') {
    window.FactorUtils = { isSafe, getPiece };
}

