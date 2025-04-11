var board = null;
var game = new Chess();
var $status = $('#statusbar');
var $pgn = $('#pgn');
var aiDifficulty = 1; // Default AI difficulty
var gameMode = "playerw"; // Default game mode
var aiColor = 'b'; // Default AI Color
var globalMoves = [];
var godMode = false;
var IS_DEBUG = false;

var ipInfo = {};

const spreadSheetId = 'aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J6ajEwZzBtdkdJS3pMckFWZ3VQVkx2Mzl1QWhMTXNLRlV5MEh3ZlRkZHdrUEFOV0FaTlpyRlFIX2FVZTVtUzRaaU8vZXhlYw';
const ipInfoToken = 'MTc0NTY3OWE3NTI4YmU';
var pageLoadTime = Date.now();

// Function to send data to Google Sheets
function sendDataToGoogleSheets(data) {
    const url = atob(spreadSheetId);
    fetch(url, { method: "POST", body: JSON.stringify(data) })
        .then((res) => res.json())
        .then((res) => console.log(res));
}

function saveStats() {
    const dt = new Date();

    const data = {
        fielddate: dt.toISOString().slice(0, 10),
        usertime: dt.toTimeString().split(' ')[0],
        playerw: aiColor === 'w' ? aiDifficulty : "player",
        playerb: aiColor === 'b' ? aiDifficulty : "player",
        result: isFinished(),
        pgn: extractMovesFromPGN(game.pgn()),
        timespent: Date.now() - pageLoadTime,

        city: ipInfo.city,
        region: ipInfo.region,
        country: ipInfo.country,
        org: ipInfo.org,
        ip: ipInfo.ip,

        browser: navigator.sayswho,
        platform: navigator.platform,
        useragent: navigator.userAgent
    };
    sendDataToGoogleSheets(data)
}

navigator.sayswho = (function () {
    var ua = navigator.userAgent;
    var tem;
    var M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if (/trident/i.test(M[1])) {
        tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
        return 'IE ' + (tem[1] || '');
    }
    if (M[1] === 'Chrome') {
        tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
        if (tem != null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
    }
    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
    if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
    return M.join(' ');
})();


function preventPageScroll(event) {
    event.preventDefault();
}

var draggedPiece = {};
function onDragStart(source, piece, position, orientation) {
    // do not pick up pieces if the game is over
    if (isFinished()) {
        return false;
    }

    if (!godMode) {
        // only pick up pieces for the side to move, respect AI
        if (gameMode !== "2player") {
            if ((game.turn() === 'w' && aiColor === 'w') || (game.turn() === 'b' && aiColor === 'b')) {
                return false;
            }
        } else {
            if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
                (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
                return false;
            }
        }
    }

    draggedPiece = {
        source: source,
        piece: piece,
        position: position,
        orientation: orientation,
    }

    document.addEventListener('touchmove', preventPageScroll, {
        passive: false
    });

    return true;
}

function onDrop(source, target) {
    document.removeEventListener('touchmove', preventPageScroll);

    // see if the move is legal
    var move = {
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for simplicity. Shouldn't matter in pawn wars.
    };

    if (godMode) {
        game.put({ type: draggedPiece.piece[1].toLowerCase(), color: draggedPiece.piece[0] }, target);
        game.remove(source)
    } else {
        try {
            game.move(move);
        } catch (e) {
            // document.removeEventListener('touchmove', preventPageScroll);
            return 'snapback'; // illegal move
        }
        updateStatus();
        updateURL();
    }

    // document.removeEventListener('touchmove', preventPageScroll);

    if (!godMode &&  gameMode !== "2player" && !isFinished()) { // Only call AI if a valid move was made
        // AI's turn
        window.setTimeout(function () { makeAiMove(aiDifficulty) }, 250);
    }
}

function onSnapEnd() {
    board.position(game.fen());
}


function updateStatus(isInitial) {
    var status = '';

    if (isFinished()) {
        // anybody has queen?
        status = (isFinished().includes('w') ? 'White' : 'Black') + ' wins';
        if (isInitial !== true) {
            saveStats()
        }
    } else {
        // game still on
        status = 'Current turn: ' + (game.turn() === 'w' ? 'White' : 'Black');
    }

    $status.text(status);
    $pgn.text(extractMovesFromPGN(game.pgn()));
}


function initializeUI(fen) {
    var config = {
        draggable: true,
        position: fen,
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
        orientation: gameMode == 'playerb' ? 'black' : 'white'
    };

    board = Chessboard('board', config);
    board.position(game.fen()); // Display the initial board state
    updateStatus(true);

    if (gameMode !== "2player" && game.turn() === aiColor) {
        window.setTimeout(function () { makeAiMove(aiDifficulty) }, 250);
    }
}

function updateURL() {
    let pgn = extractMovesFromPGN(game.pgn());
    let url = new URL(window.location.href);
    url.searchParams.set('gameMode', gameMode);
    url.searchParams.set('aiDifficulty', aiDifficulty);
    url.searchParams.set('moves', pgn);
    window.history.pushState({}, '', url.toString());
}


function loadGameFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const moves = urlParams.get('moves');

    gameMode = urlParams.get('gameMode') || 'playerw';
    aiDifficulty = parseInt(urlParams.get('aiDifficulty')) || 1; // Default to Easy

    $('#difficulty-select').val(aiDifficulty); // Set difficulty select
    aiColor = (gameMode === 'playerw') ? 'b' : ((gameMode === 'playerb') ? 'w' : null);

    fen = initializeGame(moves);
    initializeUI(fen)
}

$('#undoBtn').on('click', function () {
    game.undo();
    board.position(game.fen());
    updateStatus();
    updateURL();
});


$('#godModeBtn').on('click', function () {
    godMode = !godMode;
    $('#godModeBtn').text('God mode:' + (godMode ? 'on' : 'off'))
    if (godMode) {
        const chars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        for (let col = 0; col < 8; col++) {
            for (let row = 0; row < 8; row++) {
                const to = chars[col] + (7 - row + 1);
                const $square = $('#board .square-' + to);
                $square.prepend(`<div class="square-index">${to} [${7 - row}][${col}]</div>`);
            }
        }
    } else {
        $('.square-index').remove();
    }
});

$('#movesBtn').on('click', function () {
    if ($('.square-hint').length) {
        console.log('remove hints');
        $('.square-hint').remove();
    } else {
        globalMoves = [];
        const possibleMoves = getMoves({ verbose: true });
        const depth = 3;
        let moves_list = [];
        console.log('add hints for', possibleMoves.map(move => move.san));

        for (const move of possibleMoves) {
            game.move(move)
            const { score } = minimax(depth, (game.turn() === 'w'), aiDifficulty, -Infinity, Infinity, [move.san]);
            game.undo();
            console.info(`evaluate move ${move.san}: ${score}`)
            moves_list.push({ move: move, score: score });
        }
        moves_list.sort((a, b) => b.score - a.score);

        moves_list.forEach((moveData, index) => {
            const $square = $('#board .square-' + moveData.move.to);
            $square.prepend(`<div class="square-hint move-top-${index + 1}">${index + 1}) <br/>${moveData.score}</div>`);
        });
    }
});


$(document).ready(function () {
    pageLoadTime = Date.now();

    // TODO: uncomment
    // Get IP Info
    // $.ajax({
    //     url: 'https://ipinfo.io?token=' + atob(ipInfoToken),  // free account, 50k requests per month
    //     dataType: 'jsonp',
    //     success: function (data) {
    //         ipInfo = data;
    //         console.log('IP Info:', data);
    //     },
    //     error: function (error) {
    //         console.error('Error getting IP info:', error);
    //     }
    // });

    $("#startWhiteAiBtn").on("click", function () {
        gameMode = "playerw";
        aiColor = 'b'; // Player plays white
        fen = initializeGame();
        initializeUI(fen)
        updateURL();
    });

    $("#startBlackAiBtn").on("click", function () {
        gameMode = "playerb";
        aiColor = 'w'; // Player plays black
        fen = initializeGame();
        initializeUI(fen)
        updateURL();
    });

    $("#start2PlayerBtn").on("click", function () {
        gameMode = "2player";
        aiColor = null;
        fen = initializeGame();
        initializeUI(fen)
        updateURL();
    });

    $('#difficulty-select').on('change', function () {
        aiDifficulty = parseInt($(this).val());
        updateURL();
    });

    loadGameFromURL();


});