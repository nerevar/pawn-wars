var chessjs = require('./chess.js');
require('./game.js')();
require('./ai.js')();

var game = new chessjs.Chess();
globalThis.game = game;
globalThis.Chess = chessjs.Chess;
globalThis.gameMode = 'playerw';
globalThis.aiColor = 'b';


// fen = initializeGame()
// console.log(fen)
// makeAiMove(3)
// console.log(globalThis.game.turn())
// console.log(globalThis.game.ascii())

var stats = run_game(100, 0, 0)
console.log('games:', stats.length, 'white wins:', stats.filter(str => str.includes('w')).length, 'black wins:', stats.filter(str => str.includes('b')).length)