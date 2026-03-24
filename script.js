var board = null;
var game = new Chess();
var $statusText = $('#statusbar-text');
var $playAgainBtn = $('#playAgainBtn');
var $pgn = $('#pgn');
var aiDifficulty = 1; // Default AI difficulty
var gameMode = "playerw"; // Default game mode
var aiColor = 'b'; // Default AI Color
var godMode = false;
var IS_DEBUG = false;
var ENABLE_LOGGING = true;

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


function showModal(el) {
    $(el).removeAttr('hidden');
}

function hideModal(el) {
    $(el).attr('hidden', 'hidden');
}

function hideGameModals() {
    hideModal('#modal-start');
    hideModal('#modal-difficulty');
}

function showStartModeModal() {
    hideModal('#modal-difficulty');
    $playAgainBtn.removeClass('is-visible');
    showModal('#modal-start');
}

function showDifficultyModal() {
    hideModal('#modal-start');
    showModal('#modal-difficulty');
}

function updateStatus(isInitial) {
    var status = '';

    if (isFinished()) {
        var winnerIsWhite = isFinished().includes('w');
        status = winnerIsWhite ? 'Белые победили!' : 'Чёрные победили!';
        if (isInitial !== true) {
            saveStats();
        }
        $playAgainBtn.addClass('is-visible');
    } else {
        $playAgainBtn.removeClass('is-visible');
        status = 'Ход: ' + (game.turn() === 'w' ? 'белые' : 'чёрные');
    }

    $statusText.text(status);
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


function hasMovesInURL() {
    const moves = new URLSearchParams(window.location.search).get('moves');
    return moves != null && String(moves).trim().length > 0;
}

function loadGameFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const moves = urlParams.get('moves');

    gameMode = urlParams.get('gameMode') || 'playerw';
    const currentAiDifficulty = parseInt(urlParams.get('aiDifficulty'), 10);

    if (!isNaN(currentAiDifficulty) && currentAiDifficulty >= 0) {
        aiDifficulty = currentAiDifficulty;
        $('#difficulty-select').val(String(aiDifficulty));
    }
    aiColor = (gameMode === 'playerw') ? 'b' : ((gameMode === 'playerb') ? 'w' : null);

    fen = initializeGame(moves);
    initializeUI(fen);

    if (hasMovesInURL()) {
        hideGameModals();
    } else {
        showStartModeModal();
    }
}

$('#undoBtn').on('click', function () {
    game.undo();
    board.position(game.fen());
    updateStatus();
    updateURL();
});


$('#godModeBtn').on('click', function () {
    godMode = !godMode;
    $('#godModeBtn').text('Режим бога: ' + (godMode ? 'вкл' : 'выкл'));
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
        $('.square-index').remove();
        $('#movesBtn').text('Показать оценки');
    } else {
        const moveScores = findBestMove(aiDifficulty, getAllMoves = true);
        // moveScores.sort((a, b) => game.turn() === 'w' ? b.score - a.score : a.score - b.score)
        moveScores.sort((a, b) => {
            if (game.turn() === 'w') {
                // Для белых: по убыванию score
                return a.score === b.score ? (Math.random() - 0.5) : b.score - a.score;
            } else {
                // Для черных: по возрастанию score
                return a.score === b.score ? (Math.random() - 0.5) : a.score - b.score;
            }
        });

        moveScores.forEach((moveData, index) => {
            const $square = $('#board .square-' + moveData.move.to);
            $square.prepend(`<div class="square-hint move-top-${index + 1}">${index + 1}) <br/>${moveData.score.toFixed(2)}</div>`);
        });

        $('#movesBtn').text('Скрыть оценки');

        // координаты клеток
        const chars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        for (let col = 0; col < 8; col++) {
            for (let row = 0; row < 8; row++) {
                const to = chars[col] + (7 - row + 1);
                const $square = $('#board .square-' + to);
                $square.prepend(`<div class="square-index">${to} [${7 - row}][${col}]</div>`);
            }
        }

    }
});


var pendingAiGameMode = null;

function startTwoPlayerGame() {
    gameMode = '2player';
    aiColor = null;
    fen = initializeGame();
    initializeUI(fen);
    updateURL();
    hideGameModals();
}

function startAiGameWithDifficulty(mode, difficulty) {
    gameMode = mode;
    aiColor = mode === 'playerw' ? 'b' : 'w';
    aiDifficulty = difficulty;
    $('#difficulty-select').val(String(aiDifficulty));
    fen = initializeGame();
    initializeUI(fen);
    updateURL();
    hideGameModals();
}

function resetToNewSession() {
    const base = window.location.pathname || '/';
    window.history.replaceState({}, '', base);
    pendingAiGameMode = null;
    loadGameFromURL();
}

$(document).ready(function () {
    pageLoadTime = Date.now();

    $.ajax({
        url: 'https://ipinfo.io?token=' + atob(ipInfoToken),
        dataType: 'jsonp',
        success: function (data) {
            ipInfo = data;
            console.log('IP Info:', data);
        },
        error: function (error) {
            console.error('Error getting IP info:', error);
        }
    });

    $('#modal-play-white').on('click', function () {
        pendingAiGameMode = 'playerw';
        showDifficultyModal();
    });

    $('#modal-play-black').on('click', function () {
        pendingAiGameMode = 'playerb';
        showDifficultyModal();
    });

    $('#modal-play-two').on('click', function () {
        pendingAiGameMode = null;
        startTwoPlayerGame();
    });

    $('#modal-diff-back').on('click', function () {
        pendingAiGameMode = null;
        showStartModeModal();
    });

    $('[data-pick-difficulty]').on('click', function () {
        var d = parseInt($(this).attr('data-pick-difficulty'), 10);
        var mode = pendingAiGameMode;
        pendingAiGameMode = null;
        if (mode === 'playerw' || mode === 'playerb') {
            startAiGameWithDifficulty(mode, d);
        }
    });

    $('#playAgainBtn').on('click', function () {
        resetToNewSession();
    });

    $('#brand-link').on('click', function (e) {
        if (e.button !== 0) return;
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        resetToNewSession();
    });

    $('#difficulty-select').on('change', function () {
        aiDifficulty = parseInt($(this).val(), 10);
        updateURL();
    });

    loadGameFromURL();
});