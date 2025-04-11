const { Chess } = require('./chess.js')
const { getMoves, initializeGame, isFinished, drawGame, extractMovesFromPGN } = require('./game.js');
globalThis.isFinished = isFinished;
globalThis.getMoves = getMoves;

const { findBestMove, evaluateBoard3 } = require('./ai.js');

globalThis.Chess = Chess;
globalThis.gameMode = 'playerw';
globalThis.aiColor = 'b';

const ai1 = 4;
const ai2 = 3;



const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function main() {
    console.clear();
    initializeGame();
    let history = [];

    const draw = () => {
        // console.clear();
        console.log(drawGame());
        console.log('[1] Next move  [2] Undo  [q] quit  [any] Eval code');
    };

    const processCommand = async (cmd) => {
        // try {
            switch (cmd) {
                case '1':
                    if (isFinished()) return true;
                    const currentAiLevel = game.turn() == 'w' ? ai1 : ai2;
                    const bestMove = findBestMove(game, currentAiLevel);

                    history.push(bestMove);
                    game.move(bestMove);

                    console.clear();
                    console.log('game.turn()', game.turn(), 'makeAiMove', bestMove, 'aiDifficulty', currentAiLevel, 'boardScore', evaluateBoard3(currentAiLevel));
                    console.log(extractMovesFromPGN(game.pgn()))
                    return isFinished() === null;

                case '2':
                    if (history.length > 0) {
                        history.pop();
                        game.undo();
                        console.clear();
                        return true;
                    }
                    return true;

                case 'q': case 'Q':
                    return false;

                // case '3':
                //     console.log('Debug info:');
                //     console.log('- Turn:', game.turn());
                //     console.log('- History:', history.length);
                //     console.log('- Legal moves:', game.moves().join(' '));
                //     await new Promise(res => setTimeout(res, 2000));
                //     return true;

                default:
                    try {
                        console.log('Eval result:', eval(cmd));
                    } catch (e) {
                        console.log('Error:', e.message);
                        // await new Promise(res => setTimeout(res, 2000));
                        return true;
                    }

                    // await new Promise(res => setTimeout(res, 1000));
                    return true;
            }
    };

    while (true) {
        draw();
        const needContinue = await new Promise(resolve => {
            rl.question('> ', async (answer) => {
                resolve(await processCommand(answer.trim()));
            });
        });

        if (!needContinue) {
            console.clear();
            break;
        }
    }

    draw()
    console.log('Game finished! Winner:', isFinished());
    rl.close();
}

main();
