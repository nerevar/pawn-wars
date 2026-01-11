const { setupBoard, runFindBestMove, test, getTests } = require('./test-framework.js');
const { assertMove, assertMoveIn, assertMoveNotIn } = require('./assertions.js');


test('Требуется взятие вместо хода пешкой 1', () => {
    const pgnMoves = '1. e3 g6 2. d4 e6 3. f4 d6 4. e4 c6 5. c4 f6 6. g4 h6 7. f5 ';
    setupBoard(pgnMoves);

    const result = runFindBestMove(5);
    assertMoveIn(result, ['gxf5', 'exf5']);

    // баг в алгоритме 3
    const result2 = runFindBestMove(3);
    assertMoveNotIn(result2, ['gxf5', 'exf5']);

});

test('Просто берёт фигуру 1, загрузка FEN', () => {
    const fenString = '8/8/2p5/1P6/8/8/8/8 b - - 0 1';
    setupBoard(fenString);

    const result = runFindBestMove(5);
    assertMove(result, 'cxb5');

});

// Автоматический экспорт всех зарегистрированных тестов
module.exports = getTests();