// test/test_positions.js — Position-based test cases for AI evaluation
// Format:
//   name:      descriptive test name
//   moves:     PGN move sequence to set up the position
//   turn:      expected side to move ('w' or 'b')
//   strategy:  strategy name from STRATEGIES (default: 'medium')
//   goodMoves: AI should pick one of these (checked across multiple runs)
//   badMoves:  AI should never pick any of these

var POSITION_TESTS = [
    {
        name: 'should take fxg4 not hxg3 en passant',
        moves: '1. c4 f5 2. d4 h5 3. a4 c6 4. b4 d5 5. cxd5 cxd5 6. f4 b6 7. b5 h4 8. g4',
        turn: 'b',
        strategy: 'medium',
        goodMoves: ['fxg4'],
        badMoves: ['hxg3'],
    },
    {
        name: 'should not play c5 in this position',
        moves: '1. a3 h6 2. a4 e6 3. a5 b5 4. a6 c6 5. b3 d6 6. b4 d5 7. c3',
        turn: 'b',
        strategy: 'medium',
        badMoves: ['c5'],
    },
    {
        name: 'should promote instead of being greedy',
        moves: '1. b3 d5 2. a3 e5 3. a4 f5 4. d3 g5 5. d4 e4 6. b4 g4 7. c3 c6 8. g3 b6 9. a5 b5 10. f3 exf3 11. exf3 gxf3 12. a6 f2 13. c4',
        turn: 'b',
        strategy: 'medium',
        goodMoves: ['f1=Q'],
    },
    {
        name: 'двигает чёрную пешку навстречу, позволяя белой бежать к финишу',
        moves: '1. d4 h6 2. f3 f6 3. g3 e5 4. e3 f5 5. c3 g6 6. dxe5 b5 7. b3',
        turn: 'b',
        strategy: 'medium',
        badMoves: ['d6'],
    },
];

if (typeof module !== 'undefined') {
    module.exports = { POSITION_TESTS };
}
