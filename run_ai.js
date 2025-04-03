const { Chess } = require('./chess.js')
const { getMoves, getResultLabel, initializeGame, isFinished } = require('./game.js');
globalThis.initializeGame = initializeGame;
globalThis.isFinished = isFinished;
globalThis.getMoves = getMoves;
globalThis.getResultLabel = getResultLabel;

const { run_game } = require('./ai.js');

var game = new Chess();
globalThis.game = game;
globalThis.Chess = Chess;
globalThis.gameMode = 'playerw';
globalThis.aiColor = 'b';

// fen = initializeGame()
// console.log(fen)
// makeAiMove(3)
// console.log(globalThis.game.turn())
// console.log(globalThis.game.ascii())

var t1 = performance.now()

var stats = run_game(10, 2, 1)

var t2 = performance.now();
console.log(`time diff ${t2 - t1}`)

console.log(
    'games:', stats.length, 
    'white wins:', stats.filter(str => str.includes('w')).length, 
    'black wins:', stats.filter(str => str.includes('b')).length
)
