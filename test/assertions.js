/**
 * Утилиты для assert на ход
 */

/**
 * Проверяет, что найденный ход соответствует ожидаемому
 * @param {Object} result - Результат findBestMove: { move, score }
 * @param {string|Object} expectedMove - Ожидаемый ход (строка SAN или объект move)
 * @param {string} message - Сообщение об ошибке
 */
function assertMove(result, expectedMove, message = '') {
    if (!result || !result.move) {
        throw new Error(`Expected a move, but got: ${JSON.stringify(result)}. ${message}`);
    }
    
    const actualMove = typeof result.move === 'string' 
        ? result.move 
        : (result.move.san || result.move);
    
    const expectedMoveStr = typeof expectedMove === 'string'
        ? expectedMove
        : (expectedMove.san || expectedMove);
    
    if (actualMove !== expectedMoveStr) {
        throw new Error(
            `Expected move "${expectedMoveStr}", but got "${actualMove}". ` +
            `Score: ${result.score}. ${message}`
        );
    }
}

/**
 * Проверяет, что найденный ход находится среди ожидаемых вариантов
 * @param {Object} result - Результат findBestMove: { move, score }
 * @param {string[]|Object[]} expectedMoves - Массив ожидаемых ходов
 * @param {string} message - Сообщение об ошибке
 */
function assertMoveIn(result, expectedMoves, message = '') {
    if (!result || !result.move) {
        throw new Error(`Expected a move, but got: ${JSON.stringify(result)}. ${message}`);
    }
    
    const actualMove = typeof result.move === 'string' 
        ? result.move 
        : (result.move.san || result.move);
    
    const expectedMovesStr = expectedMoves.map(m => 
        typeof m === 'string' ? m : (m.san || m)
    );
    
    if (!expectedMovesStr.includes(actualMove)) {
        throw new Error(
            `Expected move to be one of [${expectedMovesStr.join(', ')}], ` +
            `but got "${actualMove}". Score: ${result.score}. ${message}`
        );
    }
}

function assertMoveNotIn(result, excludedMoves, message = '') {
    if (!result || !result.move) {
        throw new Error(`Expected a move, but got: ${JSON.stringify(result)}. ${message}`);
    }
    
    const actualMove = typeof result.move === 'string'
        ? result.move
        : (result.move.san || result.move);
    
    const excludedMovesStr = excludedMoves.map(m =>
        typeof m === 'string' ? m : (m.san || m)
    );
    
    if (excludedMovesStr.includes(actualMove)) {
        throw new Error(
            `Expected move to NOT be one of [${excludedMovesStr.join(', ')}], ` +
            `but got "${actualMove}". Score: ${result.score}. ${message}`
        );
    }
}

/**
 * Проверяет, что оценка находится в заданном диапазоне
 * @param {Object} result - Результат findBestMove: { move, score }
 * @param {number} minScore - Минимальная ожидаемая оценка
 * @param {number} maxScore - Максимальная ожидаемая оценка
 * @param {string} message - Сообщение об ошибке
 */
function assertScoreRange(result, minScore, maxScore, message = '') {
    if (!result || typeof result.score !== 'number') {
        throw new Error(`Expected a score, but got: ${JSON.stringify(result)}. ${message}`);
    }
    
    if (result.score < minScore || result.score > maxScore) {
        throw new Error(
            `Expected score to be between ${minScore} and ${maxScore}, ` +
            `but got ${result.score}. Move: ${result.move}. ${message}`
        );
    }
}

/**
 * Проверяет, что оценка больше заданного значения
 * @param {Object} result - Результат findBestMove: { move, score }
 * @param {number} minScore - Минимальная ожидаемая оценка
 * @param {string} message - Сообщение об ошибке
 */
function assertScoreGreater(result, minScore, message = '') {
    if (!result || typeof result.score !== 'number') {
        throw new Error(`Expected a score, but got: ${JSON.stringify(result)}. ${message}`);
    }
    
    if (result.score <= minScore) {
        throw new Error(
            `Expected score to be greater than ${minScore}, ` +
            `but got ${result.score}. Move: ${result.move}. ${message}`
        );
    }
}

/**
 * Проверяет, что оценка меньше заданного значения
 * @param {Object} result - Результат findBestMove: { move, score }
 * @param {number} maxScore - Максимальная ожидаемая оценка
 * @param {string} message - Сообщение об ошибке
 */
function assertScoreLess(result, maxScore, message = '') {
    if (!result || typeof result.score !== 'number') {
        throw new Error(`Expected a score, but got: ${JSON.stringify(result)}. ${message}`);
    }
    
    if (result.score >= maxScore) {
        throw new Error(
            `Expected score to be less than ${maxScore}, ` +
            `but got ${result.score}. Move: ${result.move}. ${message}`
        );
    }
}

/**
 * Проверяет, что ход существует (не null)
 * @param {Object} result - Результат findBestMove: { move, score }
 * @param {string} message - Сообщение об ошибке
 */
function assertMoveExists(result, message = '') {
    if (!result || !result.move) {
        throw new Error(`Expected a move to exist, but got: ${JSON.stringify(result)}. ${message}`);
    }
}

module.exports = {
    assertMove,
    assertMoveIn,
    assertMoveNotIn,
    // assertScoreRange,
    // assertScoreGreater,
    // assertScoreLess,
    // assertMoveExists
};

