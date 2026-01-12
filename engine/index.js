/**
 * Главный модуль движка ИИ
 * Объединяет все компоненты: поиск, оценку, конфигурацию
 */

function getDependencies() {
    const deps = {};

    if (typeof window === 'undefined') {
        try {
            const gameModule = require('../game');
            deps.game = typeof global !== 'undefined' ? global.game : null;
            deps.getMoves = gameModule.getMoves;
            deps.isFinished = gameModule.isFinished;
        } catch (e) {
            deps.game = typeof global !== 'undefined' ? global.game : null;
            deps.getMoves = typeof global !== 'undefined' ? global.getPawns : null;
            deps.isFinished = typeof global !== 'undefined' ? global.isFinished : null;
        }
    } else if (typeof window !== 'undefined') {
        deps.game = window.game;
        deps.getMoves = window.getMoves;
        deps.isFinished = window.isFinished;
    }

    return deps;
}

/**
 * Находит лучший ход для текущей позиции
 */
function findBestMove(aiConfigLevel, getAllMoves = false) {
    const { game } = getDependencies();

    const debug = (typeof global !== 'undefined' ? global.debug : null) ||
                  (typeof window !== 'undefined' ? window.debug : null);

    if (debug) {
        debug.log = {};
        debug.tree = {};
    }

    // Нормализуем конфигурацию
    const configModule = typeof window === 'undefined'
        ? require('./config')
        : (typeof window !== 'undefined' ? { normalizeConfig: window.normalizeConfig } : null);

    const config = configModule ? configModule.normalizeConfig(aiConfigLevel) : { depth: 4, factors: [] };

    if (debug) {
        debug.config = config;
    }

    // Получаем модуль поиска
    const searchModule = typeof window === 'undefined'
        ? require('./search')
        : (typeof window !== 'undefined' ? { minimax: window.minimax } : null);

    if (!searchModule || !searchModule.minimax) {
        throw new Error('Search module is not available');
    }

    const isMaximizing = game.turn() == 'w';
    const ctx = { path: [], branchId: 'root' };

    return searchModule.minimax(
        config.depth,
        isMaximizing,
        config,
        -Infinity,
        Infinity,
        ctx,
        getAllMoves
    );
}

/**
 * Делает ход ИИ
 */
function makeAiMove(aiDifficulty) {
    const { game, isFinished, getMoves } = getDependencies();

    if (isFinished && isFinished()) return;

    const possibleMoves = getMoves();
    if (possibleMoves.length === 0) return;

    const { move, score } = findBestMove(aiDifficulty);

    if (typeof console !== 'undefined') {
        console.log('makeAiMove', move, 'aiDifficulty', aiDifficulty, 'score:', score);
    }

    if (!move) {
        return null;
    }

    game.move(move);

    // Обновление UI (только в браузере)
    if (typeof window !== 'undefined') {
        if (window.board) {
            window.board.position(game.fen());
        }
        if (typeof window.updateStatus === 'function') {
            window.updateStatus();
        }
        if (typeof window.updateURL === 'function') {
            window.updateURL();
        }
    }

    return { move, score };
}

// Получаем evaluator для экспорта
function getEvaluator() {
    if (typeof window === 'undefined') {
        return require('./evaluator');
    } else if (typeof window !== 'undefined') {
        return {
            evaluateBoard: window.evaluateBoard
        };
    }
    return null;
}

// Экспорт для Node.js
if (typeof window === 'undefined') {
    const evaluator = getEvaluator();
    module.exports = {
        findBestMove,
        makeAiMove,
        evaluateBoard: evaluator ? evaluator.evaluateBoard : null
    };
}

// Экспорт для браузера
if (typeof window !== 'undefined') {
    window.findBestMove = findBestMove;
    window.makeAiMove = makeAiMove;
    // evaluateBoard уже экспортирован из evaluator.js
}

