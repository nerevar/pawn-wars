var board = null;
var game = new Chess();
var $status = $('#statusbar');
var $pgn = $('#pgn');
var aiDifficulty = 1; // Default AI difficulty
var gameMode = "playerw"; // Default game mode
var aiColor = 'b'; // Default AI Color

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
        result: is_finish() === "White"
            ? "wQ"
            : is_finish() === "Black"
                ? "bQ"
                : game.turn() == 'w'
                    ? 'b'
                    : 'w',
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

// Function to extract PGN moves
function extractMovesFromPGN(pgn) {
    return pgn.split('\n').pop()
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


function is_finish() {
    // custom end game
    const board = game.board();
    if (!board) {
        return null
    }
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.type === 'q') {
                return piece.color === 'w' ? 'White' : 'Black';
            }
        }
    }
    return null;
}

function preventPageScroll(event) {
    event.preventDefault();
}

function onDragStart(source, piece, position, orientation) {
    // do not pick up pieces if the game is over
    if (is_finish()) {
        return false;
    }

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

    try {
        var result = game.move(move);
    } catch (e) {
        document.removeEventListener('touchmove', preventPageScroll);
        return 'snapback'; // illegal move
    }

    updateStatus();
    updateURL();
    document.removeEventListener('touchmove', preventPageScroll);

    if (gameMode !== "2player" && !is_finish() && result) { // Only call AI if a valid move was made
        // AI's turn
        window.setTimeout(makeAiMove, 250);
    }
}

function onSnapEnd() {
    board.position(game.fen());
}


function updateStatus(isInitial) {
    var status = '';
    var moveColor = 'White';
    if (game.turn() === 'b') {
        moveColor = 'Black';
    }

    if (is_finish()) {
        // anybody has queen?
        status = is_finish() + ' wins';
        if (isInitial !== true) {
            saveStats()
        }
    } else if (game.in_stalemate()) {
        // game over?
        status = 'Current turn: ' + moveColor + ' But Game Over, no legal moves available.';
        if (isInitial !== true) {
            saveStats()
        }
    } else {
        // game still on
        status = 'Current turn: ' + moveColor;
    }

    $status.text(status);
    $pgn.text(extractMovesFromPGN(game.pgn()));
}

function initializeGame(moves) {
    game = new Chess();

    game.clear(); // Start with an empty board

    // Set up the pawn positions
    for (let i = 0; i < 8; i++) {
        game.put({
            type: 'p',
            color: 'w'
        }, String.fromCharCode(97 + i) + '2'); // White pawns on rank 2
        game.put({
            type: 'p',
            color: 'b'
        }, String.fromCharCode(97 + i) + '7'); // Black pawns on rank 7
    }

    let initialFen = '8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1';
    if (gameMode !== "2player") {
        if (aiColor === 'w') {
            initialFen = '8/PPPPPPPP/8/8/8/8/pppppppp/8 b - - 0 1'
        }
    }

    if (moves) {
        moves.split(' ').forEach(function (item, index) {
            if (item.includes('.')) return;
            game.move(item);
        });
        // game.load_pgn(moves);
        initialFen = game.fen();
    }

    var config = {
        draggable: true,
        position: initialFen,
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
        orientation: gameMode == 'playerw' ? 'white' : 'black'
    };

    board = Chessboard('board', config);
    board.position(game.fen()); // Display the initial board state
    updateStatus(true);

    if (gameMode !== "2player" && game.turn() === aiColor) {
        makeAiMove();
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

    initializeGame(moves);
}

$('#undoBtn').on('click', function () {
    game.undo();
    board.position(game.fen());
    updateStatus();
    updateURL();
});


$(document).ready(function () {
    pageLoadTime = Date.now();

    // Get IP Info
    $.ajax({
        url: 'https://ipinfo.io?token=' + atob(ipInfoToken),  // free account, 50k requests per month
        dataType: 'jsonp',
        success: function (data) {
            ipInfo = data;
            console.log('IP Info:', data);
        },
        error: function (error) {
            console.error('Error getting IP info:', error);
        }
    });

    $("#startWhiteAiBtn").on("click", function () {
        gameMode = "playerw";
        aiColor = 'b'; // Player plays white
        initializeGame();
        updateURL();
    });

    $("#startBlackAiBtn").on("click", function () {
        gameMode = "playerb";
        aiColor = 'w'; // Player plays black
        initializeGame();
        updateURL();
    });

    $("#start2PlayerBtn").on("click", function () {
        gameMode = "2player";
        aiColor = null;
        initializeGame();
        updateURL();
    });

    $('#difficulty-select').on('change', function () {
        aiDifficulty = parseInt($(this).val());
        updateURL();
    });

    loadGameFromURL();


});